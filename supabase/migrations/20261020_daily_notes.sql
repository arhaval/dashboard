-- Gunluk: her gun bir sayfa.
--
-- Neden: "bircok seyi kullanamiyorum, sadece not aliyorum, onlari takip
-- etmek cok zor." Notlar defterde ve telefonda duruyor, panelde karsiligi
-- yok. Panel NE oldugunu kaydediyor (is, odeme, metrik) ama NEDEN oldugunu
-- hicbir yerde tutmuyor: Eylul'de izlenmelerin neden %40 dustugunu bulmak
-- icin bastan sona kazi yapmak gerekti, oysa o gun yazilmis iki satir
-- yeterdi.
--
-- Tasarim: gun + yazar basina TEK satir. Ayni gune tekrar yazmak ayni sayfayi
-- buyutur, yeni kayit acmaz. Boylece "o gun ne yazmistim" sorusunun tek bir
-- cevabi olur.
CREATE TABLE IF NOT EXISTS daily_notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_date  DATE NOT NULL,
  author_id  UUID REFERENCES users(id) ON DELETE CASCADE,
  body       TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gun + yazar tekil: ayni gune ikinci sayfa acilmasin.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_notes_date_author_key'
  ) THEN
    ALTER TABLE daily_notes
      ADD CONSTRAINT daily_notes_date_author_key UNIQUE (note_date, author_id);
  END IF;
END $$;

-- Liste her zaman tarihe gore tersten geziliyor.
CREATE INDEX IF NOT EXISTS idx_daily_notes_date ON daily_notes(note_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_notes_author ON daily_notes(author_id);

ALTER TABLE daily_notes ENABLE ROW LEVEL SECURITY;

-- Kendi gunlugun senin: baskasinin notu gorunmez.
DROP POLICY IF EXISTS "Users manage own daily notes" ON daily_notes;
CREATE POLICY "Users manage own daily notes" ON daily_notes
  FOR ALL USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
