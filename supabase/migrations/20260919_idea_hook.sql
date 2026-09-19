-- Fikir Havuzu: kanca tipi + "neden tutar".
-- Kanca tipi fikrin izleyiciyi NEYLE yakaladığını, "neden tutar" bunun tek
-- satırlık gerekçesini tutar. İkisi de opsiyonel: eski kayıtlarda değer yok.

ALTER TABLE ideas ADD COLUMN IF NOT EXISTS hook_type    TEXT;
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS why_it_works TEXT;

-- Değer kümesi uygulamada sınırlı; veritabanında da tutarsız değer girmesin.
-- ADD CONSTRAINT kendi başına tekrar çalıştırılamaz, bu yüzden korumalı.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ideas_hook_type_check') THEN
    ALTER TABLE ideas ADD CONSTRAINT ideas_hook_type_check CHECK (
      hook_type IS NULL OR hook_type IN (
        'KNOWN_NAME_DEBATE', 'KNOWN_NAME_NEW_INFO', 'CURRENT_NEWS', 'SYSTEM_EXPLAINER'
      )
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ideas_hook_type ON ideas(hook_type);
