-- HAFTA 8 VERİLERİ - CS2 TURNUVA
-- Tarih: 2026-05-06
-- AK47 SUPPLIERS 3-0 Börü
-- Map1: 12-7 (19r) | Map2: 12-6 (18r) | Map3: 15-14 OT (29r)
-- Toplam: 66 round
-- Not: "aim kaydı dilek tut" yeni oyuncu (önceki hafta settingler vardı)

BEGIN;

DO $$
DECLARE
  t_ak47   UUID;
  t_boru   UUID;
  v_match  UUID;
  v_map    UUID;
  v_player UUID;
BEGIN
  SELECT id INTO t_ak47 FROM cs2_teams WHERE name = 'AK47 SUPPLIERS';
  SELECT id INTO t_boru FROM cs2_teams WHERE name = 'Börü';

  IF t_ak47 IS NULL THEN RAISE EXCEPTION 'AK47 SUPPLIERS takımı bulunamadı'; END IF;
  IF t_boru IS NULL THEN RAISE EXCEPTION 'Börü takımı bulunamadı'; END IF;

  -- -------------------------------------------------------
  -- YENİ OYUNCU: aim kaydı dilek tut (AK47 SUPPLIERS)
  -- Önceki haftalarda yoktu, bu hafta ilk kez girdi
  -- -------------------------------------------------------
  INSERT INTO cs2_players (team_id, name, steam_id, is_active)
  VALUES (t_ak47, 'aim kaydı dilek tut', '76561198153053788', true)
  ON CONFLICT (steam_id) DO NOTHING;

  -- -------------------------------------------------------
  -- MATCH: AK47 SUPPLIERS 3-0 Börü
  -- -------------------------------------------------------
  -- Önce bu tarihte PENDING maç var mı diye bak
  SELECT id INTO v_match FROM cs2_matches
  WHERE status = 'PENDING'
    AND match_date::date = '2026-05-06'
    AND (
      (team1_id = t_ak47 AND team2_id = t_boru)
      OR (team1_id = t_boru AND team2_id = t_ak47)
    )
  LIMIT 1;

  IF v_match IS NULL THEN
    -- PENDING maç yoksa direkt FINISHED olarak ekle
    INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
    VALUES (t_ak47, t_boru, 'FINISHED', '2026-05-06', t_ak47, 3, 0)
    RETURNING id INTO v_match;
  ELSE
    UPDATE cs2_matches SET
      status          = 'FINISHED',
      winner_team_id  = t_ak47,
      team1_maps_won  = CASE WHEN team1_id = t_ak47 THEN 3 ELSE 0 END,
      team2_maps_won  = CASE WHEN team2_id = t_ak47 THEN 3 ELSE 0 END
    WHERE id = v_match;
  END IF;

  -- Seri özeti (3 map, toplam 66 round)
  -- Map1: AK47 12-7 Börü (19r) | Map2: AK47 12-6 Börü (18r) | Map3: AK47 15-14 Börü OT (29r)
  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status)
  VALUES (
    v_match, 'series', 1,
    CASE WHEN (SELECT team1_id FROM cs2_matches WHERE id = v_match) = t_ak47 THEN 3 ELSE 0 END,
    CASE WHEN (SELECT team2_id FROM cs2_matches WHERE id = v_match) = t_ak47 THEN 3 ELSE 0 END,
    66, t_ak47, 'FINISHED'
  )
  RETURNING id INTO v_map;

  -- =========================================================
  -- AK47 SUPPLIERS OYUNCULARI (3 map, 66 round)
  -- ADR = toplam_damage / 66
  -- =========================================================

  -- Ryuka | K:85 D:47 A:14 HS:58 DMG:8705 ADR:131.9
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199099964835';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_ak47, '76561199099964835', 'Ryuka',
    85, 47, 14, 58, ROUND(8705.0 / 66, 1), 8705, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- BEDOOO | K:55 D:43 A:14 HS:13 DMG:6055 ADR:91.7
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198310852022';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_ak47, '76561198310852022', 'BEDOOO',
    55, 43, 14, 13, ROUND(6055.0 / 66, 1), 6055, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- aim kaydı dilek tut | K:51 D:44 A:14 HS:24 DMG:5186 ADR:78.6
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198153053788';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_ak47, '76561198153053788', 'aim kaydı dilek tut',
    51, 44, 14, 24, ROUND(5186.0 / 66, 1), 5186, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- ARKANTOS | K:47 D:42 A:14 HS:20 DMG:5039 ADR:76.3
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199226019040';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_ak47, '76561199226019040', 'ARKANTOS',
    47, 42, 14, 20, ROUND(5039.0 / 66, 1), 5039, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- G.H.O.S.T. | K:41 D:44 A:7 HS:13 DMG:4125 ADR:62.5
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198796358007';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_ak47, '76561198796358007', 'G.H.O.S.T.',
    41, 44, 7, 13, ROUND(4125.0 / 66, 1), 4125, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- =========================================================
  -- BÖRÜ OYUNCULARI (3 map, 66 round)
  -- ADR = toplam_damage / 66
  -- =========================================================

  -- Chedjou | K:74 D:53 A:17 HS:22 DMG:7449 ADR:112.9
  -- Map29: K24/D15/A5/HS7/DMG2393 + Map30: K18/D14/A2/HS6/DMG1924 + Map31: K32/D24/A10/HS9/DMG3132
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198033678583';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_boru, '76561198033678583', 'Chedjou',
    74, 53, 17, 22, ROUND(7449.0 / 66, 1), 7449, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- L3o | K:58 D:53 A:16 HS:19 DMG:6047 ADR:91.6
  -- Map29: K10/D16/A4/HS3/DMG890 + Map30: K15/D15/A6/HS4/DMG1952 + Map31: K33/D22/A6/HS12/DMG3205
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198332518466';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_boru, '76561198332518466', 'L3o',
    58, 53, 16, 19, ROUND(6047.0 / 66, 1), 6047, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- Toska | K:41 D:55 A:22 HS:19 DMG:5407 ADR:81.9
  -- Map29: K15/D16/A12/HS8/DMG2330 + Map30: K9/D15/A3/HS8/DMG989 + Map31: K17/D24/A7/HS3/DMG2088
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198867919247';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_boru, '76561198867919247', 'Toska',
    41, 55, 22, 19, ROUND(5407.0 / 66, 1), 5407, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- F1st_K | K:26 D:61 A:21 HS:11 DMG:3531 ADR:53.5
  -- Map29: K7/D19/A2/HS3/DMG683 + Map30: K4/D18/A4/HS2/DMG823 + Map31: K15/D24/A15/HS6/DMG2025
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199051795583';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_boru, '76561199051795583', 'F1st_K',
    26, 61, 21, 11, ROUND(3531.0 / 66, 1), 3531, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- Natural Intelligence | K:18 D:60 A:11 HS:11 DMG:2116 ADR:32.1
  -- Map29: K4/D18/A5/HS3/DMG773 + Map30: K8/D17/A0/HS4/DMG608 + Map31: K6/D25/A6/HS4/DMG735
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199401287389';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_boru, '76561199401287389', 'Natural Intelligence',
    18, 60, 11, 11, ROUND(2116.0 / 66, 1), 2116, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  RAISE NOTICE '8. Hafta import tamamlandı: AK47 SUPPLIERS 3-0 Börü (Map skorları: 12-7 / 12-6 / 15-14 OT)';
END $$;

COMMIT;
