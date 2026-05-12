-- HAFTA 8 VERİLERİ - CS2 TURNUVA
-- Tarih: 2026-05-06
-- GEGENPRES 3-0 Hizalanamayanlar
-- Map1: 12-1 (13r) | Map2: 12-6 (18r) | Map3: 12-5 (17r)
-- Toplam: 48 round

BEGIN;

DO $$
DECLARE
  t_gegen UUID;
  t_hizal UUID;
  v_match UUID;
  v_map   UUID;
  v_player UUID;
BEGIN
  SELECT id INTO t_gegen FROM cs2_teams WHERE name = 'GEGENPRES';
  SELECT id INTO t_hizal FROM cs2_teams WHERE name = 'Hizalanamayanlar';

  IF t_gegen IS NULL THEN RAISE EXCEPTION 'GEGENPRES takımı bulunamadı'; END IF;
  IF t_hizal IS NULL THEN RAISE EXCEPTION 'Hizalanamayanlar takımı bulunamadı'; END IF;

  -- -------------------------------------------------------
  -- MATCH: GEGENPRES 3-0 Hizalanamayanlar
  -- -------------------------------------------------------
  SELECT id INTO v_match FROM cs2_matches
  WHERE status = 'PENDING'
    AND match_date::date = '2026-05-06'
    AND (
      (team1_id = t_gegen AND team2_id = t_hizal)
      OR (team1_id = t_hizal AND team2_id = t_gegen)
    )
  LIMIT 1;

  IF v_match IS NULL THEN
    INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
    VALUES (t_gegen, t_hizal, 'FINISHED', '2026-05-06', t_gegen, 3, 0)
    RETURNING id INTO v_match;
  ELSE
    UPDATE cs2_matches SET
      status         = 'FINISHED',
      winner_team_id = t_gegen,
      team1_maps_won = CASE WHEN team1_id = t_gegen THEN 3 ELSE 0 END,
      team2_maps_won = CASE WHEN team2_id = t_gegen THEN 3 ELSE 0 END
    WHERE id = v_match;
  END IF;

  -- Seri özeti (3 map, toplam 48 round)
  -- Map1: GEGEN 12-1 HIZAL (13r) | Map2: 12-6 (18r) | Map3: 12-5 (17r)
  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status)
  VALUES (
    v_match, 'series', 1,
    CASE WHEN (SELECT team1_id FROM cs2_matches WHERE id = v_match) = t_gegen THEN 3 ELSE 0 END,
    CASE WHEN (SELECT team2_id FROM cs2_matches WHERE id = v_match) = t_gegen THEN 3 ELSE 0 END,
    48, t_gegen, 'FINISHED'
  )
  RETURNING id INTO v_map;

  -- =========================================================
  -- GEGENPRES OYUNCULARI (3 map, 48 round)
  -- ADR = toplam_damage / 48
  -- =========================================================

  -- Pac | K:67 D:29 A:21 HS:33 DMG:7746 ADR:161.4
  -- Map17: K21/D6/A7/HS9/DMG2392 + Map18: K20/D14/A7/HS10/DMG2384 + Map19: K26/D9/A7/HS14/DMG2970
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198192462155';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_gegen, '76561198192462155', 'Pac',
    67, 29, 21, 33, ROUND(7746.0 / 48, 1), 7746, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- JakieS | K:67 D:31 A:18 HS:42 DMG:6772 ADR:141.1
  -- Map17: K27/D6/A7/HS18/DMG2490 + Map18: K18/D14/A8/HS11/DMG2482 + Map19: K22/D11/A3/HS13/DMG1800
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199120455536';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_gegen, '76561199120455536', 'JakieS',
    67, 31, 18, 42, ROUND(6772.0 / 48, 1), 6772, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- Vendetta | K:41 D:27 A:14 HS:15 DMG:4165 ADR:86.8
  -- Map17: K7/D7/A5/HS2/DMG824 + Map18: K17/D9/A6/HS6/DMG1733 + Map19: K17/D11/A3/HS7/DMG1608
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198967300942';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_gegen, '76561198967300942', 'Vendetta',
    41, 27, 14, 15, ROUND(4165.0 / 48, 1), 4165, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- Altarin oglu Tarkan | K:32 D:32 A:12 HS:17 DMG:3125 ADR:65.1
  -- Map17: K9/D7/A3/HS4/DMG645 + Map18: K12/D12/A2/HS6/DMG1095 + Map19: K11/D13/A7/HS7/DMG1385
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198160862027';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_gegen, '76561198160862027', 'Altarin oglu Tarkan',
    32, 32, 12, 17, ROUND(3125.0 / 48, 1), 3125, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- Trader | K:12 D:29 A:7 HS:6 DMG:1324 ADR:27.6
  -- Map17: K5/D8/A4/HS2/DMG518 + Map18: K3/D11/A1/HS2/DMG393 + Map19: K4/D10/A2/HS2/DMG413
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198350960783';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_gegen, '76561198350960783', 'Trader',
    12, 29, 7, 6, ROUND(1324.0 / 48, 1), 1324, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- =========================================================
  -- HİZALANAMAYANLAR OYUNCULARI (3 map, 48 round)
  -- ADR = toplam_damage / 48
  -- =========================================================

  -- Bahattin | K:47 D:43 A:14 HS:21 DMG:5572 ADR:116.1
  -- Map17: K10/D14/A0/HS4/DMG1359 + Map18: K16/D15/A7/HS9/DMG1736 + Map19: K21/D14/A7/HS8/DMG2477
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199099758701';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_hizal, '76561199099758701', 'Bahattin',
    47, 43, 14, 21, ROUND(5572.0 / 48, 1), 5572, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- Murat | K:40 D:41 A:13 HS:22 DMG:5042 ADR:105.0
  -- Map17: K8/D13/A3/HS6/DMG1100 + Map18: K16/D13/A7/HS5/DMG2223 + Map19: K16/D15/A3/HS11/DMG1719
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198157758327';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_hizal, '76561198157758327', 'Murat',
    40, 41, 13, 22, ROUND(5042.0 / 48, 1), 5042, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- Kamil | K:29 D:42 A:6 HS:14 DMG:3037 ADR:63.3
  -- Map17: K7/D14/A0/HS3/DMG624 + Map18: K11/D12/A5/HS7/DMG1311 + Map19: K11/D16/A1/HS4/DMG1102
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198930081296';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_hizal, '76561198930081296', 'Kamil',
    29, 42, 6, 14, ROUND(3037.0 / 48, 1), 3037, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- Laz Recep | K:22 D:47 A:2 HS:12 DMG:2407 ADR:50.1
  -- Map17: K7/D14/A0/HS3/DMG820 + Map18: K11/D15/A1/HS5/DMG1002 + Map19: K4/D18/A1/HS4/DMG585
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198177045161';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_hizal, '76561198177045161', 'Laz Recep',
    22, 47, 2, 12, ROUND(2407.0 / 48, 1), 2407, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- Zeki | K:6 D:47 A:7 HS:3 DMG:1051 ADR:21.9
  -- Map17: K1/D14/A2/HS0/DMG316 + Map18: K3/D16/A4/HS2/DMG465 + Map19: K2/D17/A1/HS1/DMG270
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199045061644';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_hizal, '76561199045061644', 'Zeki',
    6, 47, 7, 3, ROUND(1051.0 / 48, 1), 1051, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  RAISE NOTICE '8. Hafta import tamamlandı: GEGENPRES 3-0 Hizalanamayanlar (Map skorları: 12-1 / 12-6 / 12-5)';
END $$;

COMMIT;
