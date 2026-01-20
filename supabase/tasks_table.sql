-- Tasks table for storing human action tasks with dimension levels
-- Run this in Supabase SQL Editor

-- ═══════════════════════════════════════════
-- MAIN TASKS TABLE
-- ═══════════════════════════════════════════

CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,

  -- Task status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),

  -- Task type: routine (recurring/iterative) vs unique (one-time)
  task_type TEXT NOT NULL DEFAULT 'unique' CHECK (task_type IN ('routine', 'unique')),

  -- For routine tasks: frequency
  routine_frequency TEXT CHECK (routine_frequency IN ('daily', 'weekly', 'monthly', 'custom')),
  routine_interval INTEGER, -- e.g., every 3 days
  last_completed_at TIMESTAMP WITH TIME ZONE,
  next_due_at TIMESTAMP WITH TIME ZONE,

  -- ═══════════════════════════════════════════
  -- DIMENSION LEVELS (1-5 scale)
  -- These represent how much of each type of effort the task requires
  -- ═══════════════════════════════════════════

  -- Effort: Physical and mental exertion required
  effort_level INTEGER NOT NULL DEFAULT 3 CHECK (effort_level >= 1 AND effort_level <= 5),

  -- Motus: Movement, action, dynamism required
  motus_level INTEGER NOT NULL DEFAULT 3 CHECK (motus_level >= 1 AND motus_level <= 5),

  -- Voluntas: Willpower, determination, motivation needed
  voluntas_level INTEGER NOT NULL DEFAULT 3 CHECK (voluntas_level >= 1 AND voluntas_level <= 5),

  -- Cognito: Knowledge, thinking, mental processing required
  cognito_level INTEGER NOT NULL DEFAULT 3 CHECK (cognito_level >= 1 AND cognito_level <= 5),

  -- Tempus: Time investment required
  tempus_level INTEGER NOT NULL DEFAULT 3 CHECK (tempus_level >= 1 AND tempus_level <= 5),

  -- Primary dimension (the dominant characteristic of this task)
  primary_dimension TEXT CHECK (primary_dimension IN ('effort', 'motus', 'voluntas', 'cognito', 'tempus')),

  -- ═══════════════════════════════════════════
  -- OPPORTUNITY COST LEVELS (0-5 scale)
  -- What you sacrifice from your personal life to do this task
  -- 0 = no sacrifice, 5 = major sacrifice
  -- ═══════════════════════════════════════════

  -- Health cost: Sleep, nutrition, physical activity neglected
  health_cost INTEGER NOT NULL DEFAULT 0 CHECK (health_cost >= 0 AND health_cost <= 5),

  -- Social cost: Friendships and relationships not cultivated
  social_cost INTEGER NOT NULL DEFAULT 0 CHECK (social_cost >= 0 AND social_cost <= 5),

  -- Work cost: Professional commitments unfulfilled
  work_cost INTEGER NOT NULL DEFAULT 0 CHECK (work_cost >= 0 AND work_cost <= 5),

  -- Career cost: Personal growth/vocational search abandoned
  career_cost INTEGER NOT NULL DEFAULT 0 CHECK (career_cost >= 0 AND career_cost <= 5),

  -- Family cost: Family presence and time lost
  family_cost INTEGER NOT NULL DEFAULT 0 CHECK (family_cost >= 0 AND family_cost <= 5),

  -- Calculated weighted sacrifice score (acts as multiplier for action value)
  weighted_sacrifice_score NUMERIC(5,2) DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_type ON tasks(task_type);
CREATE INDEX idx_tasks_primary_dimension ON tasks(primary_dimension);
CREATE INDEX idx_tasks_active ON tasks(user_id, status) WHERE status = 'active';

-- ═══════════════════════════════════════════
-- TASK ASSIGNMENTS (for collaborative tasks)
-- ═══════════════════════════════════════════

CREATE TABLE task_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT DEFAULT 'contributor', -- 'owner', 'contributor', 'reviewer'
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(task_id, assigned_to)
);

CREATE INDEX idx_task_assignments_task ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_user ON task_assignments(assigned_to);

-- ═══════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

-- Users can view their own tasks
CREATE POLICY "Users can view own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view tasks assigned to them
CREATE POLICY "Users can view assigned tasks"
  ON tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM task_assignments
      WHERE task_assignments.task_id = tasks.id
      AND task_assignments.assigned_to = auth.uid()
    )
  );

-- Users can create their own tasks
CREATE POLICY "Users can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own tasks
CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own tasks
CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Task assignments policies
CREATE POLICY "Task owners can manage assignments"
  ON task_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_assignments.task_id
      AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their assignments"
  ON task_assignments FOR SELECT
  USING (assigned_to = auth.uid());

-- ═══════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════

-- Auto-update updated_at
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Auto-set completed_at when status changes to completed
CREATE OR REPLACE FUNCTION set_task_completed_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status != 'completed' OR OLD.status IS NULL) THEN
    NEW.completed_at = NOW();
    -- For routine tasks, also update last_completed_at
    IF NEW.task_type = 'routine' THEN
      NEW.last_completed_at = NOW();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_task_completed_timestamp
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_task_completed_timestamp();

-- ═══════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════

-- Get tasks by dominant dimension
CREATE OR REPLACE FUNCTION get_tasks_by_dimension(
  p_user_id UUID,
  p_dimension TEXT,
  p_status TEXT DEFAULT 'active'
)
RETURNS SETOF tasks AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM tasks
  WHERE user_id = p_user_id
    AND status = p_status
    AND (
      primary_dimension = p_dimension
      OR (
        CASE p_dimension
          WHEN 'effort' THEN effort_level
          WHEN 'motus' THEN motus_level
          WHEN 'voluntas' THEN voluntas_level
          WHEN 'cognito' THEN cognito_level
          WHEN 'tempus' THEN tempus_level
        END >=
        GREATEST(effort_level, motus_level, voluntas_level, cognito_level, tempus_level)
      )
    )
  ORDER BY
    CASE p_dimension
      WHEN 'effort' THEN effort_level
      WHEN 'motus' THEN motus_level
      WHEN 'voluntas' THEN voluntas_level
      WHEN 'cognito' THEN cognito_level
      WHEN 'tempus' THEN tempus_level
    END DESC,
    created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
