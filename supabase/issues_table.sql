-- Issues table - Conflicts/dilemmas associated with word cloud concepts
-- These feed into the Crowd Reasoning module for collaborative deliberation
-- Run this in Supabase SQL Editor

-- ═══════════════════════════════════════════
-- ISSUES TABLE
-- Conflicts and dilemmas linked to word cloud concepts
-- ═══════════════════════════════════════════

CREATE TABLE issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Issue details
  title TEXT NOT NULL,
  description TEXT NOT NULL,

  -- Context and background
  context TEXT, -- Why this is an issue, historical background

  -- Status in the deliberation process
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open',           -- Open for discussion
    'deliberating',   -- Active argument mapping in progress
    'ready_to_vote',  -- Sufficient deliberation, ready for voting
    'voting',         -- Currently being voted on
    'resolved',       -- Decision made
    'archived'        -- No longer active
  )),

  -- Urgency/priority (affects visibility and attention)
  urgency_level INTEGER DEFAULT 3 CHECK (urgency_level >= 1 AND urgency_level <= 5),

  -- Ministry/area this issue belongs to (for vote delegation)
  ministry TEXT, -- e.g., 'technology', 'environment', 'education', 'health', 'economy'

  -- Dates
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deliberation_started_at TIMESTAMP WITH TIME ZONE,
  voting_started_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,

  -- Creator
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_ministry ON issues(ministry);
CREATE INDEX idx_issues_urgency ON issues(urgency_level);

-- ═══════════════════════════════════════════
-- ISSUE-WORD ASSOCIATIONS
-- Links issues to one or more words in the word cloud
-- ═══════════════════════════════════════════

CREATE TABLE issue_words (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,

  -- The word/concept this issue is associated with
  word TEXT NOT NULL,

  -- How central is this word to the issue (1-5)
  relevance_level INTEGER DEFAULT 3 CHECK (relevance_level >= 1 AND relevance_level <= 5),

  -- Is this the primary word for the issue?
  is_primary BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(issue_id, word)
);

CREATE INDEX idx_issue_words_issue ON issue_words(issue_id);
CREATE INDEX idx_issue_words_word ON issue_words(word);

-- ═══════════════════════════════════════════
-- ACTION QUANTA (Quantos de Acción)
-- Accumulated action credits from participation
-- ═══════════════════════════════════════════

CREATE TABLE action_quanta (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- What generated this quantum
  source_type TEXT NOT NULL CHECK (source_type IN (
    'argument',        -- Contributed an argument in crowd reasoning
    'comment',         -- Added a comment/observation
    'proposal',        -- Made a proposal
    'validation',      -- Validated someone else's contribution
    'task_completed',  -- Completed a community task
    'issue_created',   -- Created an issue for deliberation
    'vote_cast'        -- Cast a vote (smaller quantum)
  )),

  -- Reference to the source
  source_id UUID, -- ID of the argument, comment, task, etc.
  issue_id UUID REFERENCES issues(id) ON DELETE SET NULL, -- Related issue if applicable

  -- Dimension values of this action (inherited from the action)
  effort_value NUMERIC(3,2) DEFAULT 0,
  motus_value NUMERIC(3,2) DEFAULT 0,
  voluntas_value NUMERIC(3,2) DEFAULT 0,
  cognito_value NUMERIC(3,2) DEFAULT 0,
  tempus_value NUMERIC(3,2) DEFAULT 0,

  -- Sacrifice coefficient (multiplier based on opportunity cost)
  sacrifice_coefficient NUMERIC(4,2) DEFAULT 1.0,

  -- Peer validation status
  is_validated BOOLEAN DEFAULT FALSE,
  validation_count INTEGER DEFAULT 0,
  validation_score NUMERIC(3,2) DEFAULT 0, -- Average validation rating

  -- Temporal decay factor (quanta lose value over time)
  -- Recent actions count more than old ones
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  decay_factor NUMERIC(4,3) DEFAULT 1.0, -- Updated periodically

  -- Calculated effective value (all factors combined)
  effective_value NUMERIC(6,3) DEFAULT 0
);

CREATE INDEX idx_quanta_user ON action_quanta(user_id);
CREATE INDEX idx_quanta_source ON action_quanta(source_type);
CREATE INDEX idx_quanta_issue ON action_quanta(issue_id);
CREATE INDEX idx_quanta_validated ON action_quanta(is_validated);

-- ═══════════════════════════════════════════
-- VOTE DELEGATION
-- Who receives your vote when you don't exercise it
-- ═══════════════════════════════════════════

CREATE TABLE vote_delegations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  delegator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delegate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Ministry/area for this delegation (NULL = general delegation)
  ministry TEXT,

  -- Priority (if multiple delegations, which takes precedence)
  priority INTEGER DEFAULT 1,

  -- Is this delegation active?
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Can't delegate to yourself
  CHECK (delegator_id != delegate_id),

  -- Unique delegation per ministry
  UNIQUE(delegator_id, ministry)
);

CREATE INDEX idx_delegations_delegator ON vote_delegations(delegator_id);
CREATE INDEX idx_delegations_delegate ON vote_delegations(delegate_id);
CREATE INDEX idx_delegations_ministry ON vote_delegations(ministry);

-- ═══════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════

ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_quanta ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_delegations ENABLE ROW LEVEL SECURITY;

-- Issues are publicly readable
CREATE POLICY "Anyone can view issues"
  ON issues FOR SELECT
  USING (true);

-- Authenticated users can create issues
CREATE POLICY "Authenticated users can create issues"
  ON issues FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Issue words are publicly readable
CREATE POLICY "Anyone can view issue words"
  ON issue_words FOR SELECT
  USING (true);

-- Action quanta - users can view their own
CREATE POLICY "Users can view own quanta"
  ON action_quanta FOR SELECT
  USING (auth.uid() = user_id);

-- Aggregated quanta can be viewed (for vote weight calculation)
CREATE POLICY "Aggregated quanta viewable"
  ON action_quanta FOR SELECT
  USING (is_validated = true);

-- Vote delegations - users manage their own
CREATE POLICY "Users can manage own delegations"
  ON vote_delegations FOR ALL
  USING (auth.uid() = delegator_id);

-- Users can see who delegated to them
CREATE POLICY "Users can see received delegations"
  ON vote_delegations FOR SELECT
  USING (auth.uid() = delegate_id);

-- ═══════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════

CREATE TRIGGER update_issues_updated_at
  BEFORE UPDATE ON issues
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delegations_updated_at
  BEFORE UPDATE ON vote_delegations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════

-- Get issues associated with a word
CREATE OR REPLACE FUNCTION get_issues_for_word(p_word TEXT)
RETURNS SETOF issues AS $$
BEGIN
  RETURN QUERY
  SELECT i.* FROM issues i
  JOIN issue_words iw ON i.id = iw.issue_id
  WHERE LOWER(iw.word) = LOWER(p_word)
    AND i.status NOT IN ('resolved', 'archived')
  ORDER BY i.urgency_level DESC, i.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate total action quanta for a user (simplified - full calculation in separate module)
CREATE OR REPLACE FUNCTION get_user_quanta_summary(p_user_id UUID)
RETURNS TABLE (
  total_quanta NUMERIC,
  validated_quanta NUMERIC,
  effort_total NUMERIC,
  motus_total NUMERIC,
  voluntas_total NUMERIC,
  cognito_total NUMERIC,
  tempus_total NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    SUM(effective_value) as total_quanta,
    SUM(CASE WHEN is_validated THEN effective_value ELSE 0 END) as validated_quanta,
    SUM(effort_value * sacrifice_coefficient * decay_factor) as effort_total,
    SUM(motus_value * sacrifice_coefficient * decay_factor) as motus_total,
    SUM(voluntas_value * sacrifice_coefficient * decay_factor) as voluntas_total,
    SUM(cognito_value * sacrifice_coefficient * decay_factor) as cognito_total,
    SUM(tempus_value * sacrifice_coefficient * decay_factor) as tempus_total
  FROM action_quanta
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
