-- HAFTA 4 ERTELENMİŞ MAÇ - CS2 TURNUVA
-- Tarih: 2026-04-07 (PENDING → FINISHED)
-- CRIMSON REAPERS 2-1 SIKLATANLAR
-- Map1: 11-12 (SIKLA kazandı, 23r) | Map2: 12-11 (CRIMSON kazandı, 23r) | Map3: 12-5 (CRIMSON kazandı, 17r)
-- Toplam: 63 round

BEGIN;

DO $$
DECLARE
  t_crmn   UUID;
  t_sik    UUID;
  v_match  UUID;
  v_map    UUID;
  v_player UUID;
BEGIN
  SELECT id INTO t_crmn FROM cs2_teams WHERE name = 'CRIMSON REAPERS';
  SELECT id INTO t_sik  FROM cs2_teams WHERE name = 'SIKLATANLAR';

  IF t_crmn IS NULL THEN RAISE EXCEPTION 'CRIMSON REAPERS takımı bulunamadı'; END IF;
  IF t_sik  IS NULL THEN RAISE EXCEPTION 'SIKLATANLAR takımı bulunamadı'; END IF;

  -- -------------------------------------------------------
  -- MATCH: CRIMSON REAPERS 2-1 SIKLATANLAR (PENDING → FINISHED)
  -- -------------------------------------------------------
  SELECT id INTO v_match FROM cs2_matches
  WHERE status = 'PENDING'
    AND match_date::date = '2026-04-07'
    AND (
      (team1_id = t_crmn AND team2_id = t_sik)
      OR (team1_id = t_sik AND team2_id = t_crmn)
    )
  LIMIT 1;

  IF v_match IS NULL THEN
    INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
    VALUES (t_crmn, t_sik, 'FINISHED', '2026-04-07', t_crmn, 2, 1)
    RETURNING id INTO v_match;
  ELSE
    UPDATE cs2_matches SET
      status         = 'FINISHED',
      winner_team_id = t_crmn,
      team1_maps_won = CASE WHEN team1_id = t_crmn THEN 2 ELSE 1 END,
      team2_maps_won = CASE WHEN team2_id = t_crmn THEN 2 ELSE 1 END
    WHERE id = v_match;
  END IF;

  -- Seri özeti (3 map, 63 round)
  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status)
  VALUES (
    v_match, 'series', 1,
    CASE WHEN (SELECT team1_id FROM cs2_matches WHERE id = v_match) = t_crmn THEN 2 ELSE 1 END,
    CASE WHEN (SELECT team2_id FROM cs2_matches WHERE id = v_match) = t_crmn THEN 2 ELSE 1 END,
    63, t_crmn, 'FINISHED'
  )
  RETURNING id INTO v_map;

  -- =========================================================
  -- CRIMSON REAPERS OYUNCULARI (3 map, 63 round)
  -- =========================================================

  -- OGZK | K:67 D:43 A:17 HS:28 DMG:6912 ADR:109.7
  -- Map19: K22/D16/A8/HS7/DMG2538 + Map20: K24/D16/A8/HS12/DMG2682 + Map21: K21/D11/A1/HS9/DMG1692
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198044432985';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_crmn, '76561198044432985', 'OGZK',
    67, 43, 17, 28, ROUND(6912.0 / 63, 1), 6912, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- Electronica (Ö.H.) | K:59 D:38 A:12 HS:37 DMG:6242 ADR:99.1
  -- Map19: K24/D15/A3/HS17/DMG2283 + Map20: K17/D15/A3/HS10/DMG1752 + Map21: K18/D8/A6/HS10/DMG2207
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198074087741';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_crmn, '76561198074087741', 'Electronica (Ö.H.)',
    59, 38, 12, 37, ROUND(6242.0 / 63, 1), 6242, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- DAYI | K:53 D:50 A:14 HS:41 DMG:5595 ADR:88.8
  -- Map19: K16/D19/A7/HS14/DMG1851 + Map20: K21/D18/A4/HS15/DMG2096 + Map21: K16/D13/A3/HS12/DMG1648
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198380002468';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_crmn, '76561198380002468', 'DAYI',
    53, 50, 14, 41, ROUND(5595.0 / 63, 1), 5595, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- Captain (MG) | K:40 D:50 A:19 HS:20 DMG:4664 ADR:74.0
  -- Map19: K9/D20/A5/HS3/DMG1279 + Map20: K19/D18/A7/HS11/DMG2091 + Map21: K12/D12/A7/HS6/DMG1294
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198134625951';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_crmn, '76561198134625951', 'Captain (MG)',
    40, 50, 19, 20, ROUND(4664.0 / 63, 1), 4664, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- Mr. Boombastic | K:30 D:49 A:14 HS:14 DMG:3369 ADR:53.5
  -- Map19: K8/D17/A4/HS1/DMG1161 + Map20: K12/D19/A3/HS7/DMG1241 + Map21: K10/D13/A7/HS6/DMG967
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198340882003';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_crmn, '76561198340882003', 'Mr. Boombastic',
    30, 49, 14, 14, ROUND(3369.0 / 63, 1), 3369, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- =========================================================
  -- SIKLATANLAR OYUNCULARI (3 map, 63 round)
  -- =========================================================

  -- Aibo | K:68 D:51 A:15 HS:34 DMG:7264 ADR:115.3
  -- Map19: K32/D17/A4/HS14/DMG3308 + Map20: K28/D16/A7/HS16/DMG2705 + Map21: K8/D18/A4/HS4/DMG1251
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198298585328';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_sik, '76561198298585328', 'Aibo',
    68, 51, 15, 34, ROUND(7264.0 / 63, 1), 7264, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- TRrosh | K:48 D:49 A:25 HS:23 DMG:5957 ADR:94.6
  -- Map19: K13/D15/A7/HS6/DMG1639 + Map20: K22/D20/A13/HS10/DMG2967 + Map21: K13/D14/A5/HS7/DMG1351
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198341920431';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_sik, '76561198341920431', 'TRrosh',
    48, 49, 25, 23, ROUND(5957.0 / 63, 1), 5957, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- Sharpe | K:66 D:45 A:20 HS:38 DMG:7173 ADR:113.9
  -- Map19: K23/D13/A10/HS11/DMG2496 + Map20: K17/D19/A7/HS11/DMG2036 + Map21: K26/D13/A3/HS16/DMG2641
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198126178777';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_sik, '76561198126178777', 'Sharpe',
    66, 45, 20, 38, ROUND(7173.0 / 63, 1), 7173, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- PyRo | K:24 D:55 A:12 HS:7 DMG:2809 ADR:44.6
  -- Map19: K10/D18/A7/HS3/DMG1148 + Map20: K10/D21/A4/HS2/DMG1081 + Map21: K4/D16/A1/HS2/DMG580
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199879135591';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_sik, '76561199879135591', 'PyRo',
    24, 55, 12, 7, ROUND(2809.0 / 63, 1), 2809, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- BLΛCKBIRD | K:22 D:49 A:12 HS:6 DMG:1944 ADR:30.9
  -- Map19: K8/D16/A3/HS2/DMG714 + Map20: K8/D17/A5/HS2/DMG744 + Map21: K6/D16/A4/HS2/DMG486
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198227665824';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_sik, '76561198227665824', 'BLΛCKBIRD',
    22, 49, 12, 6, ROUND(1944.0 / 63, 1), 1944, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  RAISE NOTICE 'Hafta 4 erteleme import tamamlandı: CRIMSON REAPERS 2-1 SIKLATANLAR (Map skorları: 11-12 / 12-11 / 12-5)';
END $$;

COMMIT;
