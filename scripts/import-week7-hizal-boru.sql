-- HAFTA 7 ERTELENMİŞ MAÇ - CS2 TURNUVA
-- Tarih: 2026-04-28 (PENDING → FINISHED)
-- BÖRÜ 3-0 Hizalanamayanlar
-- Map1: 12-6 (BÖRÜ kazandı, 18r) | Map2: 12-0 (BÖRÜ kazandı, 12r) | Map3: 12-3 (BÖRÜ kazandı, 15r)
-- Toplam: 45 round

BEGIN;

DO $$
DECLARE
  t_boru   UUID;
  t_hizal  UUID;
  v_match  UUID;
  v_map    UUID;
  v_player UUID;
BEGIN
  SELECT id INTO t_boru  FROM cs2_teams WHERE name = 'Börü';
  SELECT id INTO t_hizal FROM cs2_teams WHERE name = 'Hizalanamayanlar';

  IF t_boru  IS NULL THEN RAISE EXCEPTION 'Börü takımı bulunamadı'; END IF;
  IF t_hizal IS NULL THEN RAISE EXCEPTION 'Hizalanamayanlar takımı bulunamadı'; END IF;

  -- -------------------------------------------------------
  -- MATCH: BÖRÜ 3-0 Hizalanamayanlar (PENDING → FINISHED)
  -- -------------------------------------------------------
  SELECT id INTO v_match FROM cs2_matches
  WHERE status = 'PENDING'
    AND match_date::date = '2026-04-28'
    AND (
      (team1_id = t_hizal AND team2_id = t_boru)
      OR (team1_id = t_boru AND team2_id = t_hizal)
    )
  LIMIT 1;

  IF v_match IS NULL THEN
    INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
    VALUES (t_boru, t_hizal, 'FINISHED', '2026-04-28', t_boru, 3, 0)
    RETURNING id INTO v_match;
  ELSE
    UPDATE cs2_matches SET
      status         = 'FINISHED',
      winner_team_id = t_boru,
      team1_maps_won = CASE WHEN team1_id = t_boru THEN 3 ELSE 0 END,
      team2_maps_won = CASE WHEN team2_id = t_boru THEN 3 ELSE 0 END
    WHERE id = v_match;
  END IF;

  -- Seri özeti (3 map, 45 round)
  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status)
  VALUES (
    v_match, 'series', 1,
    CASE WHEN (SELECT team1_id FROM cs2_matches WHERE id = v_match) = t_boru THEN 3 ELSE 0 END,
    CASE WHEN (SELECT team2_id FROM cs2_matches WHERE id = v_match) = t_boru THEN 3 ELSE 0 END,
    45, t_boru, 'FINISHED'
  )
  RETURNING id INTO v_map;

  -- =========================================================
  -- BÖRÜ OYUNCULARI (3 map, 45 round)
  -- =========================================================

  -- L3o | K:74 D:22 A:20 HS:32 DMG:7099 ADR:157.8
  -- Map19: K30/D12/A8/HS13/DMG2727 + Map20: K21/D3/A5/HS6/DMG2102 + Map21: K23/D7/A7/HS13/DMG2270
  INSERT INTO cs2_players (team_id, name, steam_id, is_active)
  VALUES (t_boru, 'L3o', '76561198332518466', true)
  ON CONFLICT (steam_id) DO NOTHING;
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198332518466';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_boru, '76561198332518466', 'L3o',
    74, 22, 20, 32, ROUND(7099.0 / 45, 1), 7099, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- Chedjou | K:67 D:24 A:14 HS:30 DMG:7077 ADR:157.3
  -- Map19: K24/D12/A9/HS12/DMG2832 + Map20: K19/D4/A2/HS5/DMG1814 + Map21: K24/D8/A3/HS13/DMG2431
  INSERT INTO cs2_players (team_id, name, steam_id, is_active)
  VALUES (t_boru, 'Chedjou', '76561198033678583', true)
  ON CONFLICT (steam_id) DO NOTHING;
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198033678583';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_boru, '76561198033678583', 'Chedjou',
    67, 24, 14, 30, ROUND(7077.0 / 45, 1), 7077, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- Toska 分 | K:50 D:23 A:11 HS:26 DMG:4920 ADR:109.3
  -- Map19: K20/D10/A7/HS8/DMG2237 + Map20: K10/D4/A1/HS5/DMG978 + Map21: K20/D9/A3/HS13/DMG1705
  INSERT INTO cs2_players (team_id, name, steam_id, is_active)
  VALUES (t_boru, 'Toska 分', '76561198867919247', true)
  ON CONFLICT (steam_id) DO NOTHING;
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198867919247';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_boru, '76561198867919247', 'Toska 分',
    50, 23, 11, 26, ROUND(4920.0 / 45, 1), 4920, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- Saul_Goodman(AA) | K:18 D:23 A:6 HS:9 DMG:1985 ADR:44.1
  -- Map19: K3/D6/A1/HS1/DMG390 + Map20: K9/D6/A2/HS5/DMG894 + Map21: K6/D11/A3/HS3/DMG701
  INSERT INTO cs2_players (team_id, name, steam_id, is_active)
  VALUES (t_boru, 'Saul_Goodman(AA)', '76561199110867495', true)
  ON CONFLICT (steam_id) DO NOTHING;
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199110867495';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_boru, '76561199110867495', 'Saul_Goodman(AA)',
    18, 23, 6, 9, ROUND(1985.0 / 45, 1), 1985, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- Natural Intelligence (SB) | K:12 D:34 A:11 HS:6 DMG:1707 ADR:37.9
  -- Map19: K5/D14/A2/HS4/DMG605 + Map20: K5/D8/A4/HS1/DMG652 + Map21: K2/D12/A5/HS1/DMG450
  INSERT INTO cs2_players (team_id, name, steam_id, is_active)
  VALUES (t_boru, 'Natural Intelligence (SB)', '76561199401287389', true)
  ON CONFLICT (steam_id) DO NOTHING;
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199401287389';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_boru, '76561199401287389', 'Natural Intelligence (SB)',
    12, 34, 11, 6, ROUND(1707.0 / 45, 1), 1707, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- =========================================================
  -- HİZALANAMAYANLAR OYUNCULARI (3 map, 45 round)
  -- =========================================================

  -- Murat | K:44 D:44 A:5 HS:27 DMG:4837 ADR:107.5
  -- Map19: K18/D17/A2/HS13/DMG2096 + Map20: K8/D13/A0/HS6/DMG704 + Map21: K18/D14/A3/HS8/DMG2037
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198157758327';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_hizal, '76561198157758327', 'Murat',
    44, 44, 5, 27, ROUND(4837.0 / 45, 1), 4837, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- Bahattin | K:29 D:44 A:12 HS:11 DMG:3394 ADR:75.4
  -- Map19: K8/D16/A6/HS5/DMG1115 + Map20: K10/D13/A0/HS4/DMG1116 + Map21: K11/D15/A6/HS2/DMG1163
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199099758701';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_hizal, '76561199099758701', 'Bahattin',
    29, 44, 12, 11, ROUND(3394.0 / 45, 1), 3394, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- Tezcan | K:20 D:46 A:8 HS:9 DMG:2417 ADR:53.7
  -- Map19: K9/D18/A5/HS3/DMG950 + Map20: K3/D13/A1/HS2/DMG452 + Map21: K8/D15/A2/HS4/DMG1015
  INSERT INTO cs2_players (team_id, name, steam_id, is_active)
  VALUES (t_hizal, 'Tezcan', '76561199067959748', true)
  ON CONFLICT (steam_id) DO NOTHING;
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199067959748';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_hizal, '76561199067959748', 'Tezcan',
    20, 46, 8, 9, ROUND(2417.0 / 45, 1), 2417, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- Kamil | K:23 D:44 A:7 HS:13 DMG:2406 ADR:53.5
  -- Map19: K12/D15/A2/HS7/DMG1032 + Map20: K4/D13/A2/HS2/DMG590 + Map21: K7/D16/A3/HS4/DMG784
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198930081296';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_hizal, '76561198930081296', 'Kamil',
    23, 44, 7, 13, ROUND(2406.0 / 45, 1), 2406, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- Laz Recep | K:9 D:45 A:11 HS:6 DMG:1900 ADR:42.2
  -- Map19: K7/D17/A5/HS6/DMG883 + Map20: K0/D13/A4/HS0/DMG456 + Map21: K2/D15/A2/HS0/DMG561
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198177045161';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_hizal, '76561198177045161', 'Laz Recep',
    9, 45, 11, 6, ROUND(1900.0 / 45, 1), 1900, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  RAISE NOTICE 'Hafta 7 erteleme import tamamlandı: BÖRÜ 3-0 Hizalanamayanlar (Map skorları: 12-6 / 12-0 / 12-3)';
END $$;

COMMIT;
