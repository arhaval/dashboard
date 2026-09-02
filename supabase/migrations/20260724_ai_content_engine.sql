-- İçerik Motoru (AI Content Engine) — standalone editorial-memory system.
-- Deliberately NOT linked to content_queue / video_performance yet; kept separate
-- until we choose to bridge it later.
--
-- Like the idea pool, these tables are RLS-locked with NO policies: all access
-- goes through the service-role admin client inside server actions, which apply
-- role checks. This keeps generation prompts, references, and edit history off
-- the client except through vetted actions.

-- ── Layer 1: Arhaval DNA (immutable identity, versioned) ────────────────────
CREATE TABLE IF NOT EXISTS ai_dna (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version     INTEGER NOT NULL DEFAULT 1,
  -- { voice, hook_logic, rhythm, data_usage, payoff, cta, avoid }
  sections    JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
-- Only one active DNA row at a time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_dna_active ON ai_dna(is_active) WHERE is_active;

-- ── Layer 2: Format Playbook (per writing-format rules, versioned) ──────────
CREATE TABLE IF NOT EXISTS ai_formats (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT UNIQUE NOT NULL,
  label       TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  version     INTEGER NOT NULL DEFAULT 1,
  -- { hook, body, rhythm, evidence, payoff, cta }
  playbook    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Format playbook history: ai_formats holds the CURRENT playbook (stable id so
-- ai_scripts.format_id stays valid), while every version — including the seed —
-- is snapshotted here so an old ruleset can be inspected later, like DNA.
CREATE TABLE IF NOT EXISTS ai_format_versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  format_id   UUID NOT NULL REFERENCES ai_formats(id) ON DELETE CASCADE,
  version     INTEGER NOT NULL,
  playbook    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (format_id, version)
);
CREATE INDEX IF NOT EXISTS idx_ai_format_versions_format ON ai_format_versions(format_id);

-- ── Reference Library: not-ours, style-analysis material (NOT gold standard) ─
CREATE TABLE IF NOT EXISTS ai_references (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  format_id   UUID REFERENCES ai_formats(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL DEFAULT 'SRT',   -- SRT | TEXT | VIDEO
  body        TEXT NOT NULL,                 -- clean_content: what the model sees
  raw_content TEXT,                          -- original SRT/text, kept for reference
  tags        TEXT[] NOT NULL DEFAULT '{}',
  notes       TEXT,
  -- When false, kept for the record but excluded from generation retrieval.
  use_in_retrieval BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
-- For DBs where ai_references already exists (CREATE TABLE IF NOT EXISTS skips it).
ALTER TABLE ai_references ADD COLUMN IF NOT EXISTS raw_content TEXT;
ALTER TABLE ai_references ADD COLUMN IF NOT EXISTS use_in_retrieval BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_ai_references_format ON ai_references(format_id);
CREATE INDEX IF NOT EXISTS idx_ai_references_tags ON ai_references USING GIN (tags);

-- ── Layer 3+4: Scripts (the working unit; the approved final is the gold std) ─
CREATE TABLE IF NOT EXISTS ai_scripts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL,
  topic           TEXT,
  format_id       UUID REFERENCES ai_formats(id) ON DELETE SET NULL,
  platform        TEXT,                       -- YOUTUBE | INSTAGRAM | TIKTOK | X | null
  target_duration TEXT,                       -- free text e.g. "60 sn", "8-10 dk"
  status          TEXT NOT NULL DEFAULT 'DRAFT',  -- DRAFT | AI_EDITED | FINAL
  -- Factual boundary for the AI = draft_text + source_facts. source_facts optional.
  draft_text      TEXT,                       -- user's first draft (Layer 4)
  source_facts    TEXT,                       -- extra objective facts (optional)
  final_text      TEXT,                       -- ONLY the user-approved final (Layer 3)
  -- Which generation the approved final was based on (for learning analysis).
  final_generation_id UUID,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ai_scripts_status ON ai_scripts(status);
CREATE INDEX IF NOT EXISTS idx_ai_scripts_format ON ai_scripts(format_id);

-- ── AI generation history: every "Arhavalize" run is kept separately ────────
CREATE TABLE IF NOT EXISTS ai_generations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id       UUID NOT NULL REFERENCES ai_scripts(id) ON DELETE CASCADE,
  output_text     TEXT NOT NULL,
  -- Facts the AI added beyond the user's input, flagged separately (never in body).
  ai_notes        JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- What produced this output — for "which rules actually worked" analysis later.
  dna_version     INTEGER,
  format_version  INTEGER,
  prompt_version  TEXT,
  model           TEXT,
  -- Exactly which examples grounded this output (for retrieval-quality analysis).
  reference_ids            UUID[] NOT NULL DEFAULT '{}',
  gold_standard_script_ids UUID[] NOT NULL DEFAULT '{}',
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
-- Tablo bu iki kolon eklenmeden ONCE olusturulmus veritabanlari icin.
-- CREATE TABLE IF NOT EXISTS mevcut tabloyu atladigi icin kolonlar gelmiyor ve
-- uretim kaydi "Could not find the 'gold_standard_script_ids' column" ile
-- dusuyordu. Ayni desen yukarida ai_references icin de kullanildi.
ALTER TABLE ai_generations ADD COLUMN IF NOT EXISTS reference_ids            UUID[] NOT NULL DEFAULT '{}';
ALTER TABLE ai_generations ADD COLUMN IF NOT EXISTS gold_standard_script_ids UUID[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_ai_generations_script ON ai_generations(script_id);

-- final_generation_id points into ai_generations (added after the table exists).
-- Guarded so the whole migration stays safe to re-run (ADD CONSTRAINT is not
-- idempotent on its own).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_scripts_final_generation_fk'
  ) THEN
    ALTER TABLE ai_scripts
      ADD CONSTRAINT ai_scripts_final_generation_fk
      FOREIGN KEY (final_generation_id) REFERENCES ai_generations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── Layer 4 automation (Phase 2): recurring-edit → rule suggestions ─────────
CREATE TABLE IF NOT EXISTS ai_edit_signals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id     UUID REFERENCES ai_scripts(id) ON DELETE SET NULL,
  observation   TEXT NOT NULL,
  occurrences   INTEGER NOT NULL DEFAULT 1,
  target_scope  TEXT NOT NULL DEFAULT 'DNA',  -- 'DNA' | a format key
  status        TEXT NOT NULL DEFAULT 'SUGGESTED', -- SUGGESTED | APPROVED | DISMISSED
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── Seed: one empty active DNA + the 7 writing formats ──────────────────────
INSERT INTO ai_dna (version, sections, is_active)
SELECT 1,
  '{"voice":"","hook_logic":"","rhythm":"","data_usage":"","payoff":"","cta":"","avoid":""}'::jsonb,
  true
WHERE NOT EXISTS (SELECT 1 FROM ai_dna);

INSERT INTO ai_formats (key, label, sort_order, playbook)
VALUES
  ('info',         'Bilgi / Kural Anlatımı', 1, '{"hook":"","body":"","rhythm":"","evidence":"","payoff":"","cta":""}'::jsonb),
  ('player_story', 'Oyuncu Hikâyesi',        2, '{"hook":"","body":"","rhythm":"","evidence":"","payoff":"","cta":""}'::jsonb),
  ('tactic',       'Taktik Analiz',          3, '{"hook":"","body":"","rhythm":"","evidence":"","payoff":"","cta":""}'::jsonb),
  ('stats',        'İstatistik / Veri',      4, '{"hook":"","body":"","rhythm":"","evidence":"","payoff":"","cta":""}'::jsonb),
  ('emotional',    'Duygusal Hikâye',        5, '{"hook":"","body":"","rhythm":"","evidence":"","payoff":"","cta":""}'::jsonb),
  ('news',            'Haber / Transfer',       6, '{"hook":"","body":"","rhythm":"","evidence":"","payoff":"","cta":""}'::jsonb),
  ('list',            'Liste / Karşılaştırma',  7, '{"hook":"","body":"","rhythm":"","evidence":"","payoff":"","cta":""}'::jsonb),
  ('player_analysis', 'Oyuncu Analizi',         8, '{"hook":"","body":"","rhythm":"","evidence":"","payoff":"","cta":""}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Snapshot each seeded format as version 1 so history starts at creation.
INSERT INTO ai_format_versions (format_id, version, playbook)
SELECT id, version, playbook FROM ai_formats
ON CONFLICT (format_id, version) DO NOTHING;

ALTER TABLE ai_dna            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_formats        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_format_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_references     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_scripts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_edit_signals ENABLE ROW LEVEL SECURITY;
