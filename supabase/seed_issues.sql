-- Seed data for Issues
-- Run this after creating the issues table

-- ═══════════════════════════════════════════
-- SAMPLE ISSUES
-- ═══════════════════════════════════════════

-- Issue 1: Farm Loans - Préstamos agrícolas
INSERT INTO issues (id, title, description, context, status, urgency_level, ministry, created_at)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Criterios para Préstamos Agrícolas',
  '¿Bajo qué condiciones la comunidad debe otorgar préstamos a proyectos agrícolas? Debate sobre tasas de interés, plazos, garantías y priorización de beneficiarios.',
  'La comunidad ha recibido múltiples solicitudes de préstamos para proyectos agrícolas. Algunos miembros argumentan que los préstamos deben ser sin interés para fomentar la producción local, mientras otros sostienen que debe haber un interés mínimo para asegurar la sostenibilidad del fondo comunitario. También existe debate sobre si priorizar a pequeños productores o a proyectos con mayor potencial de retorno.',
  'deliberating',
  4,
  'Ministerio de Economía',
  NOW() - INTERVAL '5 days'
);

-- Issue 2: Farm Loans - Riesgo y garantías
INSERT INTO issues (id, title, description, context, status, urgency_level, ministry, created_at)
VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  'Gestión del Riesgo en Préstamos Agrícolas',
  '¿Cómo manejar el riesgo de impago en préstamos agrícolas considerando factores climáticos y de mercado?',
  'Los proyectos agrícolas están sujetos a riesgos climáticos (sequías, inundaciones) y de mercado (fluctuación de precios). La comunidad debe decidir si crear un fondo de contingencia, exigir seguros, o aceptar el riesgo como parte del apoyo comunitario.',
  'open',
  3,
  'Ministerio de Economía',
  NOW() - INTERVAL '2 days'
);

-- Issue 3: Farm Loans - Impacto ambiental
INSERT INTO issues (id, title, description, context, status, urgency_level, ministry, created_at)
VALUES (
  'c3d4e5f6-a7b8-9012-cdef-345678901234',
  'Requisitos Ambientales para Financiamiento',
  '¿Deben los préstamos agrícolas condicionarse a prácticas sustentables? Debate sobre agricultura orgánica vs. convencional.',
  'Algunos miembros proponen que solo se financien proyectos con certificación orgánica o prácticas agroecológicas. Otros argumentan que esto excluiría a productores que no pueden hacer la transición inmediatamente.',
  'open',
  3,
  'Ministerio de Ambiente',
  NOW() - INTERVAL '1 day'
);

-- ═══════════════════════════════════════════
-- LINK ISSUES TO WORDS
-- ═══════════════════════════════════════════

-- Link all farm-loans issues to the word "farm-loans"
INSERT INTO issue_words (issue_id, word, relevance_level, is_primary)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'farm-loans', 5, true),
  ('b2c3d4e5-f6a7-8901-bcde-f23456789012', 'farm-loans', 5, true),
  ('c3d4e5f6-a7b8-9012-cdef-345678901234', 'farm-loans', 4, true);

-- Also link to related words
INSERT INTO issue_words (issue_id, word, relevance_level, is_primary)
VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'agriculture', 4, false),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'economy', 3, false),
  ('c3d4e5f6-a7b8-9012-cdef-345678901234', 'environment', 4, false),
  ('c3d4e5f6-a7b8-9012-cdef-345678901234', 'sustainability', 4, false);
