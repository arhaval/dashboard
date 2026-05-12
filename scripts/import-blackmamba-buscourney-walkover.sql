-- =============================================================================
-- WALKOVER — CS2 TURNUVA
-- Tarih: 2026-05-12
-- BLACK MAMBA 3-0 BUSCOURNEY
-- BusCourney çekildi — hiç map oynanmadı
-- Toplam oynanmış round: 0
-- Oyuncu istatistiği yok
-- =============================================================================

BEGIN;

DO $$
DECLARE
  t_mamba UUID;
  t_bus   UUID;
  v_match UUID;
BEGIN
  SELECT id INTO t_mamba FROM cs2_teams WHERE name = 'BLACK MAMBA';
  SELECT id INTO t_bus   FROM cs2_teams WHERE name = 'BusCourney';

  IF t_mamba IS NULL THEN RAISE EXCEPTION 'BLACK MAMBA takımı bulunamadı'; END IF;
  IF t_bus   IS NULL THEN RAISE EXCEPTION 'BusCourney takımı bulunamadı'; END IF;

  -- -------------------------------------------------------
  -- MATCH: BLACK MAMBA 3-0 BUSCOURNEY (walkover)
  -- -------------------------------------------------------
  SELECT id INTO v_match FROM cs2_matches
  WHERE (
    (team1_id = t_mamba AND team2_id = t_bus)
    OR (team1_id = t_bus AND team2_id = t_mamba)
  )
  LIMIT 1;

  IF v_match IS NULL THEN
    INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
    VALUES (t_mamba, t_bus, 'FINISHED', '2026-05-12', t_mamba, 3, 0)
    RETURNING id INTO v_match;
  ELSE
    UPDATE cs2_matches SET
      status         = 'FINISHED',
      winner_team_id = t_mamba,
      team1_maps_won = CASE WHEN team1_id = t_mamba THEN 3 ELSE 0 END,
      team2_maps_won = CASE WHEN team2_id = t_mamba THEN 3 ELSE 0 END
    WHERE id = v_match;
  END IF;

  -- -------------------------------------------------------
  -- SERİ ÖZETİ (walkover — 0 round, oyuncu istatistiği yok)
  -- -------------------------------------------------------
  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status, ended_at)
  VALUES (
    v_match, 'series', 1,
    CASE WHEN (SELECT team1_id FROM cs2_matches WHERE id = v_match) = t_mamba THEN 3 ELSE 0 END,
    CASE WHEN (SELECT team2_id FROM cs2_matches WHERE id = v_match) = t_mamba THEN 3 ELSE 0 END,
    0, t_mamba, 'FINISHED', '2026-05-12 00:00:00+03'
  );

  RAISE NOTICE 'Import tamamlandı: BLACK MAMBA 3-0 BusCourney | Walkover (BusCourney çekildi)';
END $$;

COMMIT;
