-- HAFTA 9 MAÇ - CS2 TURNUVA
-- Tarih: 2026-05-07 (PENDING → FINISHED)
-- AK47 SUPPLIERS 2-1 GEGENPRES
-- Map1: 3-12 (GEGEN kazandı, 15r) | Map2: 15-12 OT (AK47 kazandı, 27r) | Map3: 12-11 (AK47 kazandı, 23r)
-- Toplam: 65 round
--
-- NOT: GEGENPRES 6 oyuncu döndürdü:
--   Pac, JakieS, Altarın Oğlu Tarkan → 3 map (65r)
--   Vendetta → 2 map (map1+2, 42r)
--   TRader   → 2 map (map2+3, 50r)
--   BENETO   → 2 map (map1+3, 38r)

BEGIN;

DO $$
DECLARE
  t_ak47   UUID;
  t_gegen  UUID;
  v_match  UUID;
  v_map    UUID;
  v_player UUID;
BEGIN
  SELECT id INTO t_ak47  FROM cs2_teams WHERE name = 'AK47 SUPPLIERS';
  SELECT id INTO t_gegen FROM cs2_teams WHERE name = 'GEGENPRES';

  IF t_ak47  IS NULL THEN RAISE EXCEPTION 'AK47 SUPPLIERS takımı bulunamadı'; END IF;
  IF t_gegen IS NULL THEN RAISE EXCEPTION 'GEGENPRES takımı bulunamadı'; END IF;

  -- -------------------------------------------------------
  -- MATCH: AK47 SUPPLIERS 2-1 GEGENPRES (PENDING → FINISHED)
  -- -------------------------------------------------------
  SELECT id INTO v_match FROM cs2_matches
  WHERE status = 'PENDING'
    AND match_date::date = '2026-05-07'
    AND (
      (team1_id = t_ak47 AND team2_id = t_gegen)
      OR (team1_id = t_gegen AND team2_id = t_ak47)
    )
  LIMIT 1;

  IF v_match IS NULL THEN
    INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
    VALUES (t_ak47, t_gegen, 'FINISHED', '2026-05-07', t_ak47, 2, 1)
    RETURNING id INTO v_match;
  ELSE
    UPDATE cs2_matches SET
      status         = 'FINISHED',
      winner_team_id = t_ak47,
      team1_maps_won = CASE WHEN team1_id = t_ak47 THEN 2 ELSE 1 END,
      team2_maps_won = CASE WHEN team2_id = t_ak47 THEN 2 ELSE 1 END
    WHERE id = v_match;
  END IF;

  -- Seri özeti (3 map, 65 round)
  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status)
  VALUES (
    v_match, 'series', 1,
    CASE WHEN (SELECT team1_id FROM cs2_matches WHERE id = v_match) = t_ak47 THEN 2 ELSE 1 END,
    CASE WHEN (SELECT team2_id FROM cs2_matches WHERE id = v_match) = t_ak47 THEN 2 ELSE 1 END,
    65, t_ak47, 'FINISHED'
  )
  RETURNING id INTO v_map;

  -- =========================================================
  -- AK47 SUPPLIERS OYUNCULARI (3 map, 65 round)
  -- =========================================================

  -- Ryuka | K:66 D:56 A:25 HS:52 DMG:7960 ADR:122.5
  -- Map32: K10/D15/A4/HS9/DMG1448 + Map33: K38/D20/A10/HS30/DMG4160 + Map34: K18/D21/A11/HS13/DMG2352
  INSERT INTO cs2_players (team_id, name, steam_id, is_active)
  VALUES (t_ak47, 'Ryuka', '76561199099964835', true)
  ON CONFLICT (steam_id) DO NOTHING;
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199099964835';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_ak47, '76561199099964835', 'Ryuka',
    66, 56, 25, 52, ROUND(7960.0 / 65, 1), 7960, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- BEDOOO | K:70 D:46 A:18 HS:17 DMG:7398 ADR:113.8
  -- Map32: K10/D16/A3/HS5/DMG1568 + Map33: K30/D18/A11/HS7/DMG2978 + Map34: K30/D12/A4/HS5/DMG2852
  INSERT INTO cs2_players (team_id, name, steam_id, is_active)
  VALUES (t_ak47, 'BEDOOO', '76561198310852022', true)
  ON CONFLICT (steam_id) DO NOTHING;
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198310852022';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_ak47, '76561198310852022', 'BEDOOO',
    70, 46, 18, 17, ROUND(7398.0 / 65, 1), 7398, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- aim kaydı dilek tut | K:41 D:48 A:12 HS:17 DMG:4254 ADR:65.4
  -- Map32: K3/D15/A1/HS3/DMG492 + Map33: K19/D18/A6/HS4/DMG1854 + Map34: K19/D15/A5/HS10/DMG1908
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198153053788';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_ak47, '76561198153053788', 'aim kaydı dilek tut',
    41, 48, 12, 17, ROUND(4254.0 / 65, 1), 4254, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- ARKANTOS | K:32 D:51 A:17 HS:9 DMG:4137 ADR:63.6
  -- Map32: K7/D15/A2/HS0/DMG776 + Map33: K14/D21/A9/HS6/DMG1759 + Map34: K11/D15/A6/HS3/DMG1602
  INSERT INTO cs2_players (team_id, name, steam_id, is_active)
  VALUES (t_ak47, 'ARKANTOS', '76561199226019040', true)
  ON CONFLICT (steam_id) DO NOTHING;
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199226019040';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_ak47, '76561199226019040', 'ARKANTOS',
    32, 51, 17, 9, ROUND(4137.0 / 65, 1), 4137, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- [G.H.O.S.T.] | K:34 D:46 A:10 HS:22 DMG:3374 ADR:51.9
  -- Map32: K7/D15/A2/HS5/DMG777 + Map33: K13/D18/A4/HS8/DMG1268 + Map34: K14/D13/A4/HS9/DMG1329
  INSERT INTO cs2_players (team_id, name, steam_id, is_active)
  VALUES (t_ak47, '[G.H.O.S.T.]', '76561198796358007', true)
  ON CONFLICT (steam_id) DO NOTHING;
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198796358007';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_ak47, '76561198796358007', '[G.H.O.S.T.]',
    34, 46, 10, 22, ROUND(3374.0 / 65, 1), 3374, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- =========================================================
  -- GEGENPRES OYUNCULARI
  -- Pac, JakieS, Altarın Oğlu Tarkan → 3 map (65r)
  -- Vendetta → 2 map (map1+2 = 15+27 = 42r)
  -- TRader   → 2 map (map2+3 = 27+23 = 50r)
  -- BENETO   → 2 map (map1+3 = 15+23 = 38r)
  -- =========================================================

  -- Pac | K:75 D:45 A:18 HS:39 DMG:8315 ADR:127.9 (3 map, 65r)
  -- Map32: K28/D6/A4/HS15/DMG2678 + Map33: K29/D22/A8/HS15/DMG3397 + Map34: K18/D17/A6/HS9/DMG2240
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198192462155';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_gegen, '76561198192462155', 'Pac',
    75, 45, 18, 39, ROUND(8315.0 / 65, 1), 8315, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- JakieS | K:81 D:51 A:16 HS:44 DMG:8100 ADR:124.6 (3 map, 65r)
  -- Map32: K21/D11/A4/HS11/DMG2123 + Map33: K29/D23/A9/HS19/DMG3143 + Map34: K31/D17/A3/HS14/DMG2834
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199120455536';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_gegen, '76561199120455536', 'JakieS',
    81, 51, 16, 44, ROUND(8100.0 / 65, 1), 8100, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- Altarın Oğlu Tarkan | K:36 D:52 A:13 HS:17 DMG:4269 ADR:65.7 (3 map, 65r)
  -- Map32: K8/D8/A3/HS1/DMG823 + Map33: K17/D25/A5/HS6/DMG1731 + Map34: K11/D19/A5/HS10/DMG1715
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198160862027';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_gegen, '76561198160862027', 'Altarın Oğlu Tarkan',
    36, 52, 13, 17, ROUND(4269.0 / 65, 1), 4269, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- Vendetta | K:27 D:29 A:10 HS:11 DMG:3280 ADR:78.1 (2 map: map1+2, 42r)
  -- Map32: K13/D6/A4/HS4/DMG1426 + Map33: K14/D23/A6/HS7/DMG1854
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198967300942';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_gegen, '76561198967300942', 'Vendetta',
    27, 29, 10, 11, ROUND(3280.0 / 42, 1), 3280, 2,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- TRader (OK) | K:11 D:44 A:9 HS:5 DMG:1425 ADR:28.5 (2 map: map2+3, 50r)
  -- Map33: K4/D23/A4/HS0/DMG584 + Map34: K7/D21/A5/HS5/DMG841
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198350960783';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_gegen, '76561198350960783', 'TRader (OK)',
    11, 44, 9, 5, ROUND(1425.0 / 50, 1), 1425, 2,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- BENETO (ECK) | K:12 D:29 A:7 HS:2 DMG:1528 ADR:40.2 (2 map: map1+3, 38r)
  -- Map32: K6/D7/A3/HS1/DMG584 + Map34: K6/D22/A4/HS1/DMG944
  INSERT INTO cs2_players (team_id, name, steam_id, is_active)
  VALUES (t_gegen, 'BENETO (ECK)', '76561198372270608', true)
  ON CONFLICT (steam_id) DO NOTHING;
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198372270608';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_gegen, '76561198372270608', 'BENETO (ECK)',
    12, 29, 7, 2, ROUND(1528.0 / 38, 1), 1528, 2,
    0, 0, 0, 0, 0, 0, 0, 0);

  RAISE NOTICE 'Hafta 9 import tamamlandı: AK47 SUPPLIERS 2-1 GEGENPRES (Map skorları: 3-12 / 15-12 OT / 12-11)';
END $$;

COMMIT;
