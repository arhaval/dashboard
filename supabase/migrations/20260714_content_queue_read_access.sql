-- İçerik Planı'nı tüm ekip (Editör/Seslendirmen/Grafiker) GÖREBİLSİN.
-- content_queue eskiden yalnız ADMIN+PUBLISHER'a okuma veriyordu; salt-okunur
-- SELECT ekliyoruz. Yazma (insert/update/delete) mevcut policy'lerle sınırlı
-- kalır (ADMIN + PUBLISHER-own) ve server action'larda da ayrıca kontrol edilir.
DROP POLICY IF EXISTS "Authenticated read content_queue" ON content_queue;
CREATE POLICY "Authenticated read content_queue" ON content_queue
  FOR SELECT USING (auth.role() = 'authenticated');
