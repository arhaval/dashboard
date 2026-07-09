-- Yayınlanınca İş Takibi'ne otomatik iş kaydı açmak için, kartın seslendireni
-- ve editörünü sakla. voiced_by: Ses'i teslim eden kişi; edited_by: Kurgu'yu
-- teslim eden kişi. (assigned_to o an aktif atamaydı; bunlar kalıcı "kim yaptı".)
ALTER TABLE content_queue
  ADD COLUMN IF NOT EXISTS voiced_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS edited_by UUID REFERENCES users(id) ON DELETE SET NULL;
