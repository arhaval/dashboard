-- DUPLICATE MAÇLARI TESPİT ET VE TEMİZLE
-- Fix-week5 ve import-week7 aynı 3 maçı iki farklı tarihe eklemiş:
--   GEGEN 3-0 BUSC, SIKLA 3-0 MAMBA, CRIMSON 3-0 BORU
-- 2026-04-14 (5. Hafta) → KORUNACAK (doğru tarih)
-- 2026-04-28 (7. Hafta) → SİLİNECEK (duplicate, aynı istatistikler)

-- -------------------------------------------------------
-- ADIM 1: Silmeden önce kontrol et — ne silineceğini gör
-- -------------------------------------------------------
SELECT
  m.id,
  m.match_date::date AS tarih,
  t1.name AS takim1,
  m.team1_maps_won AS t1_harita,
  m.team2_maps_won AS t2_harita,
  t2.name AS takim2,
  m.status
FROM cs2_matches m
JOIN cs2_teams t1 ON t1.id = m.team1_id
JOIN cs2_teams t2 ON t2.id = m.team2_id
WHERE m.match_date::date IN ('2026-04-14', '2026-04-28')
  AND (
    (t1.name = 'GEGENPRES'      AND t2.name = 'BusCourney')   OR
    (t1.name = 'BusCourney'     AND t2.name = 'GEGENPRES')    OR
    (t1.name = 'SIKLATANLAR'    AND t2.name = 'BLACK MAMBA')  OR
    (t1.name = 'BLACK MAMBA'    AND t2.name = 'SIKLATANLAR')  OR
    (t1.name = 'CRIMSON REAPERS' AND t2.name = 'Börü')        OR
    (t1.name = 'Börü'           AND t2.name = 'CRIMSON REAPERS')
  )
ORDER BY t1.name, m.match_date;
