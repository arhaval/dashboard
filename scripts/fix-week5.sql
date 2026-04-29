-- HATA DÜZELTME: 7. Haftaya yanlışlıkla eklenen maçları 5. Haftaya taşı
-- 2026-04-28 → 2026-04-14
-- GEGEN vs BUSC, SIKLA vs MAMBA, CRIMSON vs BORU

BEGIN;

-- 1) 7. Haftadaki (2026-04-28) yanlış eklenen 3 maçı sil
DELETE FROM cs2_match_players
WHERE map_id IN (
  SELECT mm.id FROM cs2_match_maps mm
  JOIN cs2_matches m ON m.id = mm.match_id
  WHERE m.match_date::date = '2026-04-28'
);

DELETE FROM cs2_match_maps
WHERE match_id IN (
  SELECT id FROM cs2_matches
  WHERE match_date::date = '2026-04-28'
);

DELETE FROM cs2_matches
WHERE match_date::date = '2026-04-28';

-- 2) 5. Haftadaki ilgili pending maçları sil (yeniden oluşturulacak)
DO $$
DECLARE
  t_gegen UUID; t_busc UUID;
  t_mamba UUID; t_sik UUID;
  t_crimson UUID; t_boru UUID;
  m1 UUID; m2 UUID; m3 UUID;
  map1 UUID; map2 UUID; map3 UUID;
  v_player UUID;
BEGIN
  SELECT id INTO t_gegen FROM cs2_teams WHERE name = 'GEGENPRES';
  SELECT id INTO t_busc FROM cs2_teams WHERE name = 'BusCourney';
  SELECT id INTO t_mamba FROM cs2_teams WHERE name = 'BLACK MAMBA';
  SELECT id INTO t_sik FROM cs2_teams WHERE name = 'SIKLATANLAR';
  SELECT id INTO t_crimson FROM cs2_teams WHERE name = 'CRIMSON REAPERS';
  SELECT id INTO t_boru FROM cs2_teams WHERE name = 'Börü';

  -- Pending Week 5 maçlarını sil (sadece bu 3 çift)
  DELETE FROM cs2_match_maps
  WHERE match_id IN (
    SELECT id FROM cs2_matches
    WHERE match_date::date = '2026-04-14'
    AND status = 'PENDING'
    AND (
      (team1_id = t_gegen AND team2_id = t_busc) OR (team1_id = t_busc AND team2_id = t_gegen)
      OR (team1_id = t_mamba AND team2_id = t_sik) OR (team1_id = t_sik AND team2_id = t_mamba)
      OR (team1_id = t_crimson AND team2_id = t_boru) OR (team1_id = t_boru AND team2_id = t_crimson)
    )
  );

  DELETE FROM cs2_matches
  WHERE match_date::date = '2026-04-14'
  AND status = 'PENDING'
  AND (
    (team1_id = t_gegen AND team2_id = t_busc) OR (team1_id = t_busc AND team2_id = t_gegen)
    OR (team1_id = t_mamba AND team2_id = t_sik) OR (team1_id = t_sik AND team2_id = t_mamba)
    OR (team1_id = t_crimson AND team2_id = t_boru) OR (team1_id = t_boru AND team2_id = t_crimson)
  );

  -- ==========================================
  -- MATCH 1: GEGENPRES 3-0 BusCourney (51 round)
  -- ==========================================
  INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
  VALUES (t_gegen, t_busc, 'FINISHED', '2026-04-14', t_gegen, 3, 0)
  RETURNING id INTO m1;

  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status)
  VALUES (m1, 'series', 1, 3, 0, 51, t_gegen, 'FINISHED')
  RETURNING id INTO map1;

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198192462155';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map1, v_player, t_gegen, '76561198192462155', 'Pac', 78, 30, 23, 37, ROUND(8327.0 / 51, 1), 8327, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199120455536';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map1, v_player, t_gegen, '76561199120455536', 'Jackies', 60, 29, 24, 38, ROUND(6604.0 / 51, 1), 6604, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198372270608';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map1, v_player, t_gegen, '76561198372270608', 'BENETO', 41, 28, 10, 13, ROUND(3295.0 / 51, 1), 3295, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198160862027';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map1, v_player, t_gegen, '76561198160862027', 'Altarin oglu Tarkan', 27, 20, 6, 12, ROUND(2300.0 / 36, 1), 2300, 2, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198967300942';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map1, v_player, t_gegen, '76561198967300942', 'Vendetta', 8, 4, 3, 2, ROUND(792.0 / 15, 1), 792, 1, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198350960783';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map1, v_player, t_gegen, '76561198350960783', 'Trader', 11, 27, 16, 4, ROUND(2410.0 / 51, 1), 2410, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198324665466';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map1, v_player, t_busc, '76561198324665466', 'TERMINATOR', 43, 43, 8, 22, ROUND(5028.0 / 51, 1), 5028, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198074442660';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map1, v_player, t_busc, '76561198074442660', 'Nightwatch', 29, 46, 12, 13, ROUND(3578.0 / 51, 1), 3578, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198191104478';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map1, v_player, t_busc, '76561198191104478', 'ELektroBEyiN', 26, 48, 13, 12, ROUND(2836.0 / 51, 1), 2836, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198284365406';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map1, v_player, t_busc, '76561198284365406', 'smoothopeerator', 25, 47, 15, 11, ROUND(3239.0 / 51, 1), 3239, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198312386439';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map1, v_player, t_busc, '76561198312386439', 'ATO', 15, 49, 4, 6, ROUND(1651.0 / 51, 1), 1651, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- ==========================================
  -- MATCH 2: SIKLATANLAR 3-0 BLACK MAMBA (46 round)
  -- ==========================================
  INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
  VALUES (t_sik, t_mamba, 'FINISHED', '2026-04-14', t_sik, 3, 0)
  RETURNING id INTO m2;

  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status)
  VALUES (m2, 'series', 1, 3, 0, 46, t_sik, 'FINISHED')
  RETURNING id INTO map2;

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198341920431';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map2, v_player, t_sik, '76561198341920431', 'TRrosh', 57, 17, 14, 18, ROUND(5191.0 / 46, 1), 5191, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198126178777';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map2, v_player, t_sik, '76561198126178777', 'Sharpe', 61, 22, 19, 28, ROUND(6032.0 / 46, 1), 6032, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198298585328';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map2, v_player, t_sik, '76561198298585328', 'Aibo', 54, 22, 19, 26, ROUND(5359.0 / 46, 1), 5359, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199879135591';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map2, v_player, t_sik, '76561199879135591', 'PyRo', 23, 27, 8, 7, ROUND(2673.0 / 46, 1), 2673, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198227665824';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map2, v_player, t_sik, '76561198227665824', 'BLACKBIRD', 20, 24, 8, 6, ROUND(2289.0 / 46, 1), 2289, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199559185953';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map2, v_player, t_mamba, '76561199559185953', 'GÜLLÜ', 38, 43, 4, 22, ROUND(4426.0 / 46, 1), 4426, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198955462483';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map2, v_player, t_mamba, '76561198955462483', 'Fatih', 27, 42, 5, 17, ROUND(2942.0 / 46, 1), 2942, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199059099181';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map2, v_player, t_mamba, '76561199059099181', 'XANAX-1mg', 29, 41, 6, 14, ROUND(3554.0 / 46, 1), 3554, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199380502718';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map2, v_player, t_mamba, '76561199380502718', 'APOLLO', 7, 46, 3, 6, ROUND(1444.0 / 46, 1), 1444, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198386239863';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map2, v_player, t_mamba, '76561198386239863', 'TheJaveLin', 11, 44, 8, 3, ROUND(1576.0 / 46, 1), 1576, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- ==========================================
  -- MATCH 3: CRIMSON REAPERS 3-0 Börü (58 round)
  -- ==========================================
  INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
  VALUES (t_crimson, t_boru, 'FINISHED', '2026-04-14', t_crimson, 3, 0)
  RETURNING id INTO m3;

  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status)
  VALUES (m3, 'series', 1, 3, 0, 58, t_crimson, 'FINISHED')
  RETURNING id INTO map3;

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198380002468';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map3, v_player, t_crimson, '76561198380002468', 'DAYI', 64, 37, 19, 35, ROUND(6904.0 / 58, 1), 6904, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198134625951';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map3, v_player, t_crimson, '76561198134625951', 'Captain', 47, 34, 17, 29, ROUND(5103.0 / 58, 1), 5103, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198340882003';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map3, v_player, t_crimson, '76561198340882003', 'Mr.Boombastic', 42, 36, 16, 13, ROUND(3956.0 / 58, 1), 3956, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199144890979';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map3, v_player, t_crimson, '76561199144890979', 'BABACAGRI', 47, 34, 8, 16, ROUND(4111.0 / 58, 1), 4111, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198044432985';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map3, v_player, t_crimson, '76561198044432985', 'OGZK', 51, 33, 16, 28, ROUND(6022.0 / 58, 1), 6022, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198033678583';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map3, v_player, t_boru, '76561198033678583', 'Chedjou', 60, 45, 15, 30, ROUND(6716.0 / 58, 1), 6716, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198332518466';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map3, v_player, t_boru, '76561198332518466', 'L3o', 38, 50, 13, 18, ROUND(4317.0 / 58, 1), 4317, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198867919247';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map3, v_player, t_boru, '76561198867919247', 'Toska', 37, 51, 15, 15, ROUND(4795.0 / 58, 1), 4795, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199051795583';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map3, v_player, t_boru, '76561199051795583', 'f1st_k', 23, 49, 9, 10, ROUND(2944.0 / 58, 1), 2944, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199401287389';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map3, v_player, t_boru, '76561199401287389', 'Natural Intelligence', 12, 56, 6, 6, ROUND(1384.0 / 58, 1), 1384, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  RAISE NOTICE 'Düzeltme tamamlandı: 3 maç 7. Haftadan 5. Haftaya taşındı';
END $$;

COMMIT;
