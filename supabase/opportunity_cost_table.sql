-- Opportunity Cost Profile - What you sacrifice to take action
-- Run this in Supabase SQL Editor

-- ═══════════════════════════════════════════
-- OPPORTUNITY COST PROFILE
-- Personal context that determines the weight of sacrifices
-- ═══════════════════════════════════════════

CREATE TABLE opportunity_cost_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- ═══════════════════════════════════════════
  -- CURRENT LIFE CONTEXT (determines cost weights)
  -- Scale 1-5: 1 = low sacrifice impact, 5 = very high sacrifice impact
  -- ═══════════════════════════════════════════

  -- HEALTH: Sleep, nutrition, physical activity needs
  -- High if: health conditions, recovery period, high physical demands
  health_weight INTEGER NOT NULL DEFAULT 3 CHECK (health_weight >= 1 AND health_weight <= 5),
  health_context TEXT, -- e.g., "Recovering from surgery", "Training for marathon"

  -- SOCIAL: Friendships, relationships, community bonds
  -- High if: new to area, rebuilding relationships, important friendships needing attention
  social_weight INTEGER NOT NULL DEFAULT 3 CHECK (social_weight >= 1 AND social_weight <= 5),
  social_context TEXT, -- e.g., "Recently moved, building new connections"

  -- WORK: Professional commitments, agreements, responsibilities
  -- High if: critical project phase, probation period, key deadlines
  work_weight INTEGER NOT NULL DEFAULT 3 CHECK (work_weight >= 1 AND work_weight <= 5),
  work_context TEXT, -- e.g., "Leading critical Q4 project"

  -- CAREER: Personal growth, vocational search, life purpose
  -- High if: in career transition, pursuing meaningful goal, educational commitment
  career_weight INTEGER NOT NULL DEFAULT 3 CHECK (career_weight >= 1 AND career_weight <= 5),
  career_context TEXT, -- e.g., "Pursuing master's degree", "Career pivot in progress"

  -- FAMILY: Presence with family, parental duties, caregiving
  -- High if: young children, elderly parents, family crisis
  family_weight INTEGER NOT NULL DEFAULT 3 CHECK (family_weight >= 1 AND family_weight <= 5),
  family_context TEXT, -- e.g., "Two children under 5", "Caring for elderly parent"

  -- Profile metadata
  is_active BOOLEAN DEFAULT TRUE,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE, -- NULL = indefinite
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Only one active profile per user
CREATE UNIQUE INDEX idx_cost_profile_active ON opportunity_cost_profiles(user_id) WHERE is_active = TRUE;
CREATE INDEX idx_cost_profile_user ON opportunity_cost_profiles(user_id);

-- ═══════════════════════════════════════════
-- TASK OPPORTUNITY COSTS
-- What each task costs in terms of life sacrifices
-- ═══════════════════════════════════════════

-- Add opportunity cost columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS health_cost INTEGER DEFAULT 0 CHECK (health_cost >= 0 AND health_cost <= 5);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS social_cost INTEGER DEFAULT 0 CHECK (social_cost >= 0 AND social_cost <= 5);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS work_cost INTEGER DEFAULT 0 CHECK (work_cost >= 0 AND work_cost <= 5);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS career_cost INTEGER DEFAULT 0 CHECK (career_cost >= 0 AND career_cost <= 5);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS family_cost INTEGER DEFAULT 0 CHECK (family_cost >= 0 AND family_cost <= 5);

-- Calculated weighted cost (updated by trigger)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS weighted_sacrifice_score NUMERIC(5,2) DEFAULT 0;

-- ═══════════════════════════════════════════
-- SACRIFICE VALIDATIONS
-- Third-party confirmations of sacrifices made
-- ═══════════════════════════════════════════

CREATE TABLE sacrifice_validations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

  -- Who is validating the sacrifice
  validator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  validator_relationship TEXT, -- 'family', 'friend', 'colleague', 'supervisor', 'community_member'

  -- Which sacrifice area they're validating
  sacrifice_area TEXT NOT NULL CHECK (sacrifice_area IN ('health', 'social', 'work', 'career', 'family')),

  -- Validation details
  confirmation_level INTEGER NOT NULL CHECK (confirmation_level >= 1 AND confirmation_level <= 5),
  -- 1 = Minor sacrifice observed
  -- 5 = Significant sacrifice confirmed

  testimony TEXT, -- Optional description of what they witnessed

  -- Metadata
  validated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_verified BOOLEAN DEFAULT FALSE, -- Admin/system verification

  -- Prevent duplicate validations
  UNIQUE(task_id, validator_id, sacrifice_area)
);

CREATE INDEX idx_sacrifice_validations_task ON sacrifice_validations(task_id);
CREATE INDEX idx_sacrifice_validations_validator ON sacrifice_validations(validator_id);

-- ═══════════════════════════════════════════
-- SACRIFICE COEFFICIENT CALCULATION
-- Multiplier for action value based on validated sacrifices
-- ═══════════════════════════════════════════

-- Function to calculate the weighted sacrifice score for a task
CREATE OR REPLACE FUNCTION calculate_weighted_sacrifice(p_task_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_user_id UUID;
  v_profile RECORD;
  v_task RECORD;
  v_base_score NUMERIC;
  v_validation_bonus NUMERIC;
  v_validation_count INTEGER;
BEGIN
  -- Get task and user
  SELECT user_id, health_cost, social_cost, work_cost, career_cost, family_cost
  INTO v_task
  FROM tasks WHERE id = p_task_id;

  IF v_task IS NULL THEN RETURN 0; END IF;

  v_user_id := v_task.user_id;

  -- Get active cost profile
  SELECT health_weight, social_weight, work_weight, career_weight, family_weight
  INTO v_profile
  FROM opportunity_cost_profiles
  WHERE user_id = v_user_id AND is_active = TRUE;

  -- Default weights if no profile
  IF v_profile IS NULL THEN
    v_profile := ROW(3, 3, 3, 3, 3);
  END IF;

  -- Calculate base weighted score
  -- Each cost is multiplied by the user's context weight for that area
  v_base_score := (
    (v_task.health_cost * v_profile.health_weight) +
    (v_task.social_cost * v_profile.social_weight) +
    (v_task.work_cost * v_profile.work_weight) +
    (v_task.career_cost * v_profile.career_weight) +
    (v_task.family_cost * v_profile.family_weight)
  ) / 25.0; -- Normalize to 0-5 range

  -- Add validation bonus (each validation adds up to 20% to the score)
  SELECT COUNT(*), COALESCE(AVG(confirmation_level), 0)
  INTO v_validation_count, v_validation_bonus
  FROM sacrifice_validations
  WHERE task_id = p_task_id;

  -- Final score with validation multiplier
  -- More validations and higher confirmation levels increase the coefficient
  RETURN ROUND(v_base_score * (1 + (v_validation_count * v_validation_bonus * 0.04)), 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update weighted sacrifice score
CREATE OR REPLACE FUNCTION update_task_sacrifice_score()
RETURNS TRIGGER AS $$
BEGIN
  NEW.weighted_sacrifice_score := calculate_weighted_sacrifice(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_task_sacrifice_score_trigger
  BEFORE INSERT OR UPDATE OF health_cost, social_cost, work_cost, career_cost, family_cost
  ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_task_sacrifice_score();

-- ═══════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════

ALTER TABLE opportunity_cost_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sacrifice_validations ENABLE ROW LEVEL SECURITY;

-- Profile policies
CREATE POLICY "Users can view own cost profile"
  ON opportunity_cost_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own cost profile"
  ON opportunity_cost_profiles FOR ALL
  USING (auth.uid() = user_id);

-- Validation policies
CREATE POLICY "Users can view validations on their tasks"
  ON sacrifice_validations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = sacrifice_validations.task_id
      AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can validate others' sacrifices"
  ON sacrifice_validations FOR INSERT
  WITH CHECK (
    auth.uid() = validator_id
    AND NOT EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = sacrifice_validations.task_id
      AND tasks.user_id = auth.uid() -- Can't validate own sacrifices
    )
  );

-- ═══════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════

CREATE TRIGGER update_cost_profile_updated_at
  BEFORE UPDATE ON opportunity_cost_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════
-- HELPER VIEWS
-- ═══════════════════════════════════════════

-- View for tasks with their sacrifice coefficient
CREATE OR REPLACE VIEW tasks_with_sacrifice_coefficient AS
SELECT
  t.*,
  p.health_weight, p.social_weight, p.work_weight, p.career_weight, p.family_weight,
  p.health_context, p.social_context, p.work_context, p.career_context, p.family_context,
  t.weighted_sacrifice_score as sacrifice_coefficient,
  (SELECT COUNT(*) FROM sacrifice_validations sv WHERE sv.task_id = t.id) as validation_count
FROM tasks t
LEFT JOIN opportunity_cost_profiles p ON t.user_id = p.user_id AND p.is_active = TRUE;
