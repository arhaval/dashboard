-- Fikir Havuzu: ekip fikir atar, oylar; AI değerlendirir; admin İçerik Planı'na aktarır.
-- Gizlilik (yazar anonim, oy kırılımı yalnız admin) RLS ile DEĞİL, service-role +
-- server action katmanında role'e göre şekillendirilerek sağlanır (sponsor/sosyal kalıbı).
-- Bu yüzden tablolar RLS-kilitli, policy yok — erişim yalnız admin client üzerinden.

CREATE TABLE IF NOT EXISTS ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT,
  category TEXT NOT NULL DEFAULT 'CONTENT',      -- CONTENT | BUSINESS | STRATEGY
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'OPEN',           -- OPEN | APPROVED | REJECTED
  ai_comment TEXT,
  ai_score INTEGER,                              -- tahmini tutma yüzdesi
  ai_genre TEXT,                                 -- eşlenen video türü (tahminin dayanağı)
  evaluated_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  content_queue_id UUID REFERENCES content_queue(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS idea_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote TEXT NOT NULL,                            -- UP | DOWN | UNSURE
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (idea_id, voter_id)                     -- bir üye bir fikre tek oy (değiştirebilir)
);

CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status);
CREATE INDEX IF NOT EXISTS idx_ideas_category ON ideas(category);
CREATE INDEX IF NOT EXISTS idx_idea_votes_idea ON idea_votes(idea_id);

ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_votes ENABLE ROW LEVEL SECURITY;
