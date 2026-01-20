-- Beings table for storing user layer elements (health, skills, perception)
-- Run this in Supabase SQL Editor

-- ═══════════════════════════════════════════
-- MAIN BEINGS TABLE
-- ═══════════════════════════════════════════

CREATE TABLE beings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  layer_type TEXT NOT NULL CHECK (layer_type IN ('health', 'skills', 'perception')),
  label TEXT NOT NULL,
  description TEXT,
  value INTEGER NOT NULL CHECK (value >= 1 AND value <= 5),
  x NUMERIC NOT NULL CHECK (x >= 0 AND x <= 100),
  y NUMERIC NOT NULL CHECK (y >= 0 AND y <= 100),

  -- For perception items: who left this perception
  from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- For health items: medical validation
  is_validated BOOLEAN DEFAULT FALSE,
  validated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  validated_at TIMESTAMP WITH TIME ZONE,
  validation_notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_beings_user_id ON beings(user_id);
CREATE INDEX idx_beings_layer_type ON beings(layer_type);
CREATE INDEX idx_beings_validated ON beings(is_validated) WHERE layer_type = 'health';

-- ═══════════════════════════════════════════
-- ATTACHMENTS TABLE (for health documents)
-- ═══════════════════════════════════════════

CREATE TABLE being_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  being_id UUID NOT NULL REFERENCES beings(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image', 'lab_result', 'study', 'prescription', 'other'
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  description TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_attachments_being_id ON being_attachments(being_id);

-- ═══════════════════════════════════════════
-- MEDICAL CREDENTIALS TABLE
-- ═══════════════════════════════════════════

CREATE TABLE medical_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL, -- 'doctor', 'nurse', 'specialist', etc.
  license_number TEXT,
  specialty TEXT,
  institution TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_medical_credentials_user ON medical_credentials(user_id);

-- ═══════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════

ALTER TABLE beings ENABLE ROW LEVEL SECURITY;
ALTER TABLE being_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_credentials ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user has medical credentials
CREATE OR REPLACE FUNCTION has_medical_credentials(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM medical_credentials
    WHERE user_id = check_user_id AND is_verified = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════
-- BEINGS POLICIES
-- ═══════════════════════════════════════════

-- SELECT: Users can view their own beings
CREATE POLICY "Users can view own beings"
  ON beings FOR SELECT
  USING (auth.uid() = user_id);

-- SELECT: Medical professionals can view health items they need to validate
CREATE POLICY "Medical can view health items"
  ON beings FOR SELECT
  USING (
    layer_type = 'health'
    AND has_medical_credentials(auth.uid())
  );

-- INSERT: Users can create their own health items
CREATE POLICY "Users can insert own health items"
  ON beings FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND layer_type = 'health'
  );

-- INSERT: Users can create their own skill items (desires to learn)
CREATE POLICY "Users can insert own skill items"
  ON beings FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND layer_type = 'skills'
  );

-- INSERT: Users can add perception items for OTHER users (not themselves)
CREATE POLICY "Users can add perceptions for others"
  ON beings FOR INSERT
  WITH CHECK (
    layer_type = 'perception'
    AND auth.uid() = from_user_id
    AND auth.uid() != user_id
  );

-- UPDATE: Users can update their OWN SKILL items only
CREATE POLICY "Users can update own skill items"
  ON beings FOR UPDATE
  USING (
    auth.uid() = user_id
    AND layer_type = 'skills'
  );

-- UPDATE: ONLY medical professionals can update health items (validation)
CREATE POLICY "Medical can update health items"
  ON beings FOR UPDATE
  USING (
    layer_type = 'health'
    AND has_medical_credentials(auth.uid())
  );

-- DELETE: Users can delete their OWN SKILL items only
CREATE POLICY "Users can delete own skill items"
  ON beings FOR DELETE
  USING (
    auth.uid() = user_id
    AND layer_type = 'skills'
  );

-- DELETE: ONLY medical professionals can delete health items
CREATE POLICY "Medical can delete health items"
  ON beings FOR DELETE
  USING (
    layer_type = 'health'
    AND has_medical_credentials(auth.uid())
  );

-- ═══════════════════════════════════════════
-- ATTACHMENTS POLICIES
-- ═══════════════════════════════════════════

-- SELECT: Users can view attachments on their own beings
CREATE POLICY "Users can view own attachments"
  ON being_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM beings
      WHERE beings.id = being_attachments.being_id
      AND beings.user_id = auth.uid()
    )
  );

-- SELECT: Medical professionals can view health attachments
CREATE POLICY "Medical can view health attachments"
  ON being_attachments FOR SELECT
  USING (
    has_medical_credentials(auth.uid())
    AND EXISTS (
      SELECT 1 FROM beings
      WHERE beings.id = being_attachments.being_id
      AND beings.layer_type = 'health'
    )
  );

-- INSERT: Users can upload attachments to their OWN health beings
CREATE POLICY "Users can upload health attachments"
  ON being_attachments FOR INSERT
  WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM beings
      WHERE beings.id = being_attachments.being_id
      AND beings.user_id = auth.uid()
      AND beings.layer_type = 'health'
    )
  );

-- DELETE: Only medical professionals can delete attachments
CREATE POLICY "Medical can delete attachments"
  ON being_attachments FOR DELETE
  USING (has_medical_credentials(auth.uid()));

-- ═══════════════════════════════════════════
-- MEDICAL CREDENTIALS POLICIES
-- ═══════════════════════════════════════════

-- SELECT: Users can view their own credentials
CREATE POLICY "Users can view own credentials"
  ON medical_credentials FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: Users can submit their credentials for verification
CREATE POLICY "Users can submit credentials"
  ON medical_credentials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_beings_updated_at
  BEFORE UPDATE ON beings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Set validated_at when is_validated changes to true
CREATE OR REPLACE FUNCTION set_validation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_validated = TRUE AND (OLD.is_validated = FALSE OR OLD.is_validated IS NULL) THEN
    NEW.validated_at = NOW();
    NEW.validated_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_beings_validation_timestamp
  BEFORE UPDATE ON beings
  FOR EACH ROW
  WHEN (NEW.layer_type = 'health')
  EXECUTE FUNCTION set_validation_timestamp();

-- ═══════════════════════════════════════════
-- STORAGE BUCKET (run separately in Storage settings)
-- ═══════════════════════════════════════════
-- Create a bucket called 'being-attachments' in Supabase Storage
-- with the following policies:
-- - Users can upload to their own folder: being-attachments/{user_id}/*
-- - Users can read their own files
-- - Medical professionals can read health attachments
