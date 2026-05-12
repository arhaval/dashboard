-- HAFTA 8 DUPLICATE MAÇLARI TEMİZLE
-- Her çift için 2. (sonradan eklenen) maçı sil
-- Korunanlar: daha eski created_at'e sahip ilk kayıtlar

BEGIN;

DO $$
DECLARE
  t_ak47    UUID; t_boru  UUID;
  t_mamba   UUID; t_crmn  UUID;
  t_gegen   UUID; t_hizal UUID;
  dup_id    UUID;
BEGIN
  SELECT id INTO t_ak47   FROM cs2_teams WHERE name = 'AK47 SUPPLIERS';
  SELECT id INTO t_boru   FROM cs2_teams WHERE name = 'Börü';
  SELECT id INTO t_mamba  FROM cs2_teams WHERE name = 'BLACK MAMBA';
  SELECT id INTO t_crmn   FROM cs2_teams WHERE name = 'CRIMSON REAPERS';
  SELECT id INTO t_gegen  FROM cs2_teams WHERE name = 'GEGENPRES';
  SELECT id INTO t_hizal  FROM cs2_teams WHERE name = 'Hizalanamayanlar';

  -- ── AK47 vs BÖRÜ: en yeni kaydı sil ──
  SELECT id INTO dup_id
  FROM cs2_matches
  WHERE match_date::date = '2026-05-06'
    AND ((team1_id = t_ak47 AND team2_id = t_boru) OR (team1_id = t_boru AND team2_id = t_ak47))
  ORDER BY created_at DESC
  LIMIT 1;

  DELETE FROM cs2_match_players WHERE map_id IN (SELECT id FROM cs2_match_maps WHERE match_id = dup_id);
  DELETE FROM cs2_match_maps     WHERE match_id = dup_id;
  DELETE FROM cs2_matches        WHERE id = dup_id;
  RAISE NOTICE 'AK47 vs BÖRÜ duplicate silindi: %', dup_id;

  -- ── BLACK MAMBA vs CRIMSON REAPERS: en yeni kaydı sil ──
  SELECT id INTO dup_id
  FROM cs2_matches
  WHERE match_date::date = '2026-05-06'
    AND ((team1_id = t_mamba AND team2_id = t_crmn) OR (team1_id = t_crmn AND team2_id = t_mamba))
  ORDER BY created_at DESC
  LIMIT 1;

  DELETE FROM cs2_match_players WHERE map_id IN (SELECT id FROM cs2_match_maps WHERE match_id = dup_id);
  DELETE FROM cs2_match_maps     WHERE match_id = dup_id;
  DELETE FROM cs2_matches        WHERE id = dup_id;
  RAISE NOTICE 'MAMBA vs CRIMSON duplicate silindi: %', dup_id;

  -- ── GEGENPRES vs HIZALANAMAYANLAR: en yeni kaydı sil ──
  SELECT id INTO dup_id
  FROM cs2_matches
  WHERE match_date::date = '2026-05-06'
    AND ((team1_id = t_gegen AND team2_id = t_hizal) OR (team1_id = t_hizal AND team2_id = t_gegen))
  ORDER BY created_at DESC
  LIMIT 1;

  DELETE FROM cs2_match_players WHERE map_id IN (SELECT id FROM cs2_match_maps WHERE match_id = dup_id);
  DELETE FROM cs2_match_maps     WHERE match_id = dup_id;
  DELETE FROM cs2_matches        WHERE id = dup_id;
  RAISE NOTICE 'GEGEN vs HIZAL duplicate silindi: %', dup_id;

END $$;

COMMIT;
