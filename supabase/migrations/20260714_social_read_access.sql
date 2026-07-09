-- Ekip üyeleri (Editör/Seslendirmen/Grafiker) sosyal metrikleri GÖREBİLSİN
-- (takipçi + aylık görüntülenme/etkileşim). Yazma hâlâ yalnız admin (ayrı bir
-- yazma policy'si olmadığı için non-admin insert/update/delete yapamaz).
DROP POLICY IF EXISTS "Authenticated read social_monthly_metrics" ON social_monthly_metrics;
CREATE POLICY "Authenticated read social_monthly_metrics" ON social_monthly_metrics
  FOR SELECT USING (auth.role() = 'authenticated');
