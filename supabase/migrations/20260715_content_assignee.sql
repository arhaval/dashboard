-- İçerik hattında "Ses" aşamasına geçerken işi belirli bir kişiye atama.
-- assigned_to: o an bu kartın işini yapması için seçilen kişi (Seslendirmen/Yayıncı).
ALTER TABLE content_queue
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_content_queue_assigned ON content_queue(assigned_to);
