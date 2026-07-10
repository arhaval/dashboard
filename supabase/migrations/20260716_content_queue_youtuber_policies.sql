-- İçerik Planı yazma yetkisi: ADMIN + PUBLISHER + YOUTUBER.
-- Eski politika update/delete'i "yalnız kendi oluşturduğun kart" ile
-- sınırlıyordu; UI ise Yayıncı'ya tüm kartlarda düzenleme gösteriyordu →
-- başkasının kartını düzenlemek sessizce RLS'e takılıyordu. Düzeltiliyor.
-- role::text karşılaştırması, yeni enum değerinin aynı işlemde kullanılabilmesi için.

DROP POLICY IF EXISTS "Publishers insert content_queue" ON content_queue;
CREATE POLICY "Content editors insert content_queue" ON content_queue
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()
            AND role::text IN ('ADMIN', 'PUBLISHER', 'YOUTUBER'))
  );

DROP POLICY IF EXISTS "Publishers update own content_queue" ON content_queue;
CREATE POLICY "Content editors update content_queue" ON content_queue
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()
            AND role::text IN ('ADMIN', 'PUBLISHER', 'YOUTUBER'))
  );

DROP POLICY IF EXISTS "Publishers delete own content_queue" ON content_queue;
CREATE POLICY "Content editors delete content_queue" ON content_queue
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid()
            AND role::text IN ('ADMIN', 'PUBLISHER', 'YOUTUBER'))
  );
