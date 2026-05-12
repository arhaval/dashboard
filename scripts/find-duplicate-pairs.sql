-- Aynı iki takımın birden fazla kez karşılaştığı maçları bul
-- (Single round-robin'de her çift sadece 1 kez oynamalı)

SELECT
  LEAST(t1.name, t2.name) AS takim_a,
  GREATEST(t1.name, t2.name) AS takim_b,
  COUNT(*) AS mac_sayisi,
  STRING_AGG(m.match_date::date::text || ' (' || m.team1_maps_won || '-' || m.team2_maps_won || ')', ' | ' ORDER BY m.match_date) AS tarihler
FROM cs2_matches m
JOIN cs2_teams t1 ON t1.id = m.team1_id
JOIN cs2_teams t2 ON t2.id = m.team2_id
WHERE m.status = 'FINISHED'
GROUP BY LEAST(t1.name, t2.name), GREATEST(t1.name, t2.name)
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, takim_a;
