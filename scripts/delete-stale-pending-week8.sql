-- 2026-05-05 tarihli stale PENDING maçları sil
-- Bu maçlar 2026-05-06'da FINISHED olarak import edildi, bunlar boş placeholder

BEGIN;

DO $$
DECLARE
  t_gegen UUID; t_hizal UUID;
  t_boru  UUID; t_ak47  UUID;
  t_crmn  UUID; t_mamba UUID;
  del_id  UUID;
BEGIN
  SELECT id INTO t_gegen FROM cs2_teams WHERE name = 'GEGENPRES';
  SELECT id INTO t_hizal FROM cs2_teams WHERE name = 'Hizalanamayanlar';
  SELECT id INTO t_boru  FROM cs2_teams WHERE name = 'Börü';
  SELECT id INTO t_ak47  FROM cs2_teams WHERE name = 'AK47 SUPPLIERS';
  SELECT id INTO t_crmn  FROM cs2_teams WHERE name = 'CRIMSON REAPERS';
  SELECT id INTO t_mamba FROM cs2_teams WHERE name = 'BLACK MAMBA';

  -- GEGENPRES vs Hizalanamayanlar (2026-05-05 PENDING)
  SELECT id INTO del_id FROM cs2_matches
  WHERE status = 'PENDING' AND match_date::date = '2026-05-05'
    AND ((team1_id = t_gegen AND team2_id = t_hizal) OR (team1_id = t_hizal AND team2_id = t_gegen));
  DELETE FROM cs2_match_players WHERE map_id IN (SELECT id FROM cs2_match_maps WHERE match_id = del_id);
  DELETE FROM cs2_match_maps     WHERE match_id = del_id;
  DELETE FROM cs2_matches        WHERE id = del_id;
  RAISE NOTICE 'Silindi: GEGENPRES vs HIZAL stale PENDING: %', del_id;

  -- Börü vs AK47 SUPPLIERS (2026-05-05 PENDING)
  SELECT id INTO del_id FROM cs2_matches
  WHERE status = 'PENDING' AND match_date::date = '2026-05-05'
    AND ((team1_id = t_boru AND team2_id = t_ak47) OR (team1_id = t_ak47 AND team2_id = t_boru));
  DELETE FROM cs2_match_players WHERE map_id IN (SELECT id FROM cs2_match_maps WHERE match_id = del_id);
  DELETE FROM cs2_match_maps     WHERE match_id = del_id;
  DELETE FROM cs2_matches        WHERE id = del_id;
  RAISE NOTICE 'Silindi: BÖRÜ vs AK47 stale PENDING: %', del_id;

  -- CRIMSON REAPERS vs BLACK MAMBA (2026-05-05 PENDING)
  SELECT id INTO del_id FROM cs2_matches
  WHERE status = 'PENDING' AND match_date::date = '2026-05-05'
    AND ((team1_id = t_crmn AND team2_id = t_mamba) OR (team1_id = t_mamba AND team2_id = t_crmn));
  DELETE FROM cs2_match_players WHERE map_id IN (SELECT id FROM cs2_match_maps WHERE match_id = del_id);
  DELETE FROM cs2_match_maps     WHERE match_id = del_id;
  DELETE FROM cs2_matches        WHERE id = del_id;
  RAISE NOTICE 'Silindi: CRIMSON vs MAMBA stale PENDING: %', del_id;

END $$;

COMMIT;
