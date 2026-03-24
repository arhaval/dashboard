-- =============================================================================
-- Import 5 CS2 Matches with Maps and Player Statistics
-- Match Date: 2026-03-23
-- Run this in Supabase SQL Editor (as service_role or with RLS disabled)
-- =============================================================================

-- Temporarily disable RLS for bulk insert
ALTER TABLE cs2_matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE cs2_match_maps DISABLE ROW LEVEL SECURITY;
ALTER TABLE cs2_match_players DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  -- Team IDs
  v_team_crimson UUID;
  v_team_ak47 UUID;
  v_team_metal UUID;
  v_team_bus UUID;
  v_team_siklatanlar UUID;
  v_team_boru UUID;
  v_team_mamba UUID;
  v_team_hizal UUID;
  v_team_gegen UUID;
  v_team_bheamb UUID;

  -- Match IDs
  v_match1 UUID;
  v_match2 UUID;
  v_match3 UUID;
  v_match4 UUID;
  v_match5 UUID;

  -- Map IDs
  v_map UUID;
BEGIN

  -- =========================================================================
  -- LOOK UP TEAM IDs
  -- =========================================================================
  SELECT id INTO v_team_crimson FROM cs2_teams WHERE name ILIKE '%CRIMSON%' LIMIT 1;
  SELECT id INTO v_team_ak47 FROM cs2_teams WHERE name ILIKE '%AK47%' LIMIT 1;
  SELECT id INTO v_team_metal FROM cs2_teams WHERE name ILIKE '%METAL%' LIMIT 1;
  SELECT id INTO v_team_bus FROM cs2_teams WHERE name ILIKE '%BUS%' OR name ILIKE '%Buscour%' LIMIT 1;
  SELECT id INTO v_team_siklatanlar FROM cs2_teams WHERE name ILIKE '%IKLATANLAR%' LIMIT 1;
  SELECT id INTO v_team_boru FROM cs2_teams WHERE name ILIKE '%BÖRÜ%' OR name ILIKE '%BORU%' LIMIT 1;
  SELECT id INTO v_team_mamba FROM cs2_teams WHERE name ILIKE '%MAMBA%' LIMIT 1;
  SELECT id INTO v_team_hizal FROM cs2_teams WHERE name ILIKE '%Hizal%' LIMIT 1;
  SELECT id INTO v_team_gegen FROM cs2_teams WHERE name ILIKE '%GEGEN%' LIMIT 1;
  SELECT id INTO v_team_bheamb FROM cs2_teams WHERE name ILIKE '%BHEAMB%' LIMIT 1;

  -- Validate all teams found
  IF v_team_crimson IS NULL THEN RAISE EXCEPTION 'Team CRIMSON REAPERS not found'; END IF;
  IF v_team_ak47 IS NULL THEN RAISE EXCEPTION 'Team AK47 SUPPLIERS not found'; END IF;
  IF v_team_metal IS NULL THEN RAISE EXCEPTION 'Team METAL DIVISION not found'; END IF;
  IF v_team_bus IS NULL THEN RAISE EXCEPTION 'Team BusCourney not found'; END IF;
  IF v_team_siklatanlar IS NULL THEN RAISE EXCEPTION 'Team SIKLATANLAR not found'; END IF;
  IF v_team_boru IS NULL THEN RAISE EXCEPTION 'Team BORU not found'; END IF;
  IF v_team_mamba IS NULL THEN RAISE EXCEPTION 'Team BLACK MAMBA not found'; END IF;
  IF v_team_hizal IS NULL THEN RAISE EXCEPTION 'Team Hizalanamayanlar not found'; END IF;
  IF v_team_gegen IS NULL THEN RAISE EXCEPTION 'Team GEGENPRES not found'; END IF;
  IF v_team_bheamb IS NULL THEN RAISE EXCEPTION 'Team BHEAMB not found'; END IF;

  -- =========================================================================
  -- MATCH 1: AK47 SUPPLIERS vs CRIMSON REAPERS
  -- Series: CRIMSON REAPERS 3-0
  -- =========================================================================
  INSERT INTO cs2_matches (id, team1_id, team2_id, status, winner_team_id, match_date)
  VALUES (gen_random_uuid(), v_team_ak47, v_team_crimson, 'FINISHED', v_team_crimson, '2026-03-23'::timestamptz)
  RETURNING id INTO v_match1;

  -- Map 1: dust2 - CRIMSON 13 : 1 AK47 (14 rounds)
  INSERT INTO cs2_match_maps (id, match_id, map_number, map, team1_score, team2_score, rounds_played, winner_team_id)
  VALUES (gen_random_uuid(), v_match1, 1, 'de_dust2', 1, 13, 14, v_team_crimson)
  RETURNING id INTO v_map;

  -- AK47 SUPPLIERS players (team_memati side) - dust2
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr)
  VALUES
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198310852022'), v_team_ak47, '76561198310852022', 'BEDOOO', 9, 14, 0, 8, 900, ROUND(900.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198796358007'), v_team_ak47, '76561198796358007', '[G.H.O.S.T.]', 7, 14, 1, 6, 637, ROUND(637.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198153053788'), v_team_ak47, '76561198153053788', 'aim kaydı dilek tut', 5, 13, 4, 3, 885, ROUND(885.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199226019040'), v_team_ak47, '76561199226019040', 'ARKANTOS', 3, 14, 3, 1, 539, ROUND(539.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198295103268'), v_team_ak47, '76561198295103268', 'memati', 2, 14, 0, 1, 185, ROUND(185.0/14, 1));

  -- CRIMSON REAPERS players (team_Captain_MG side) - dust2
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr)
  VALUES
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198380002468'), v_team_crimson, '76561198380002468', 'DAYI', 19, 8, 7, 14, 2078, ROUND(2078.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198074087741'), v_team_crimson, '76561198074087741', 'Electronica', 16, 3, 3, 8, 1329, ROUND(1329.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198044432985'), v_team_crimson, '76561198044432985', 'OGZK', 15, 4, 5, 2, 1217, ROUND(1217.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198134625951'), v_team_crimson, '76561198134625951', 'Captain (MG)', 15, 6, 8, 5, 1727, ROUND(1727.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198340882003'), v_team_crimson, '76561198340882003', 'Mr. Boombastic', 4, 5, 5, 0, 536, ROUND(536.0/14, 1));

  -- Map 2: mirage - CRIMSON 13 : 1 AK47 (14 rounds)
  INSERT INTO cs2_match_maps (id, match_id, map_number, map, team1_score, team2_score, rounds_played, winner_team_id)
  VALUES (gen_random_uuid(), v_match1, 2, 'de_mirage', 1, 13, 14, v_team_crimson)
  RETURNING id INTO v_map;

  -- AK47 SUPPLIERS players (team_ARKANTOS side) - mirage
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr)
  VALUES
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198310852022'), v_team_ak47, '76561198310852022', 'BEDOOO', 7, 13, 5, 3, 1364, ROUND(1364.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198153053788'), v_team_ak47, '76561198153053788', 'aim kaydı dilek tut', 5, 14, 0, 1, 522, ROUND(522.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198796358007'), v_team_ak47, '76561198796358007', '[G.H.O.S.T.]', 5, 13, 0, 3, 655, ROUND(655.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198295103268'), v_team_ak47, '76561198295103268', 'memati', 3, 13, 0, 0, 338, ROUND(338.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199226019040'), v_team_ak47, '76561199226019040', 'ARKANTOS', 3, 14, 2, 1, 412, ROUND(412.0/14, 1));

  -- CRIMSON REAPERS players (team_Mr_Boombastic side) - mirage
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr)
  VALUES
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198380002468'), v_team_crimson, '76561198380002468', 'DAYI', 21, 9, 1, 17, 1991, ROUND(1991.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198134625951'), v_team_crimson, '76561198134625951', 'Captain (MG)', 15, 4, 2, 9, 1373, ROUND(1373.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198340882003'), v_team_crimson, '76561198340882003', 'Mr. Boombastic', 13, 3, 2, 3, 1209, ROUND(1209.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198044432985'), v_team_crimson, '76561198044432985', 'OGZK', 12, 3, 6, 4, 1394, ROUND(1394.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198074087741'), v_team_crimson, '76561198074087741', 'Electronica', 6, 4, 6, 5, 879, ROUND(879.0/14, 1));

  -- Map 3: inferno - CRIMSON 13 : 1 AK47 (14 rounds)
  INSERT INTO cs2_match_maps (id, match_id, map_number, map, team1_score, team2_score, rounds_played, winner_team_id)
  VALUES (gen_random_uuid(), v_match1, 3, 'de_inferno', 1, 13, 14, v_team_crimson)
  RETURNING id INTO v_map;

  -- AK47 SUPPLIERS players (team_ARKANTOS side) - inferno
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr)
  VALUES
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198310852022'), v_team_ak47, '76561198310852022', 'BEDOOO', 8, 14, 3, 6, 1379, ROUND(1379.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199226019040'), v_team_ak47, '76561199226019040', 'ARKANTOS', 7, 14, 2, 5, 1046, ROUND(1046.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198153053788'), v_team_ak47, '76561198153053788', 'aim kaydı dilek tut', 6, 13, 0, 5, 741, ROUND(741.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198796358007'), v_team_ak47, '76561198796358007', '[G.H.O.S.T.]', 3, 14, 2, 2, 450, ROUND(450.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198295103268'), v_team_ak47, '76561198295103268', 'memati', 1, 14, 1, 1, 180, ROUND(180.0/14, 1));

  -- CRIMSON REAPERS players (team_Mr_Boombastic side) - inferno
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr)
  VALUES
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198044432985'), v_team_crimson, '76561198044432985', 'OGZK', 23, 6, 2, 6, 1932, ROUND(1932.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198380002468'), v_team_crimson, '76561198380002468', 'DAYI', 17, 6, 6, 9, 1593, ROUND(1593.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198074087741'), v_team_crimson, '76561198074087741', 'Electronica', 16, 3, 4, 9, 1525, ROUND(1525.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198340882003'), v_team_crimson, '76561198340882003', 'Mr. Boombastic', 9, 7, 8, 3, 1189, ROUND(1189.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198134625951'), v_team_crimson, '76561198134625951', 'Captain (MG)', 4, 5, 2, 2, 607, ROUND(607.0/14, 1));

  -- =========================================================================
  -- MATCH 2: METAL DIVISION vs BusCourney
  -- Series: METAL DIVISION 3-0
  -- =========================================================================
  INSERT INTO cs2_matches (id, team1_id, team2_id, status, winner_team_id, match_date)
  VALUES (gen_random_uuid(), v_team_metal, v_team_bus, 'FINISHED', v_team_metal, '2026-03-23'::timestamptz)
  RETURNING id INTO v_match2;

  -- Map 1: dust2 - METAL 13 : 1 BUS (14 rounds)
  INSERT INTO cs2_match_maps (id, match_id, map_number, map, team1_score, team2_score, rounds_played, winner_team_id)
  VALUES (gen_random_uuid(), v_match2, 1, 'de_dust2', 13, 1, 14, v_team_metal)
  RETURNING id INTO v_map;

  -- METAL DIVISION players (team_Alucard side) - dust2
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr)
  VALUES
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199104832590'), v_team_metal, '76561199104832590', 'Greaw', 22, 5, 2, 10, 1947, ROUND(1947.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198333867003'), v_team_metal, '76561198333867003', 'Alucard', 20, 8, 5, 17, 1895, ROUND(1895.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198452210637'), v_team_metal, '76561198452210637', 'MayoNeTT', 17, 6, 7, 4, 1747, ROUND(1747.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198376809576'), v_team_metal, '76561198376809576', 'Pasuel', 5, 5, 1, 3, 613, ROUND(613.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199001198568'), v_team_metal, '76561199001198568', 'FARKETMEZ.cc', 3, 5, 6, 1, 576, ROUND(576.0/14, 1));

  -- BusCourney players (team_ELektroBEyiN side) - dust2
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr)
  VALUES
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198324665466'), v_team_bus, '76561198324665466', 'TERMİNATÖR', 9, 13, 3, 3, 1345, ROUND(1345.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198074442660'), v_team_bus, '76561198074442660', 'Nightwatch', 8, 13, 2, 4, 1002, ROUND(1002.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198367283733'), v_team_bus, '76561198367283733', 'CANTURK', 5, 14, 5, 1, 1055, ROUND(1055.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198284365406'), v_team_bus, '76561198284365406', 'smoothopeerator', 4, 13, 0, 2, 312, ROUND(312.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198191104478'), v_team_bus, '76561198191104478', 'ELektroBEyiN', 2, 14, 1, 2, 407, ROUND(407.0/14, 1));

  -- Map 2: mirage - METAL 13 : 1 BUS (14 rounds)
  INSERT INTO cs2_match_maps (id, match_id, map_number, map, team1_score, team2_score, rounds_played, winner_team_id)
  VALUES (gen_random_uuid(), v_match2, 2, 'de_mirage', 13, 1, 14, v_team_metal)
  RETURNING id INTO v_map;

  -- METAL DIVISION players (team_Pasuel side) - mirage
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr)
  VALUES
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198452210637'), v_team_metal, '76561198452210637', 'MayoNeTT', 19, 8, 5, 12, 2329, ROUND(2329.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199104832590'), v_team_metal, '76561199104832590', 'Greaw', 18, 2, 3, 5, 1411, ROUND(1411.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198333867003'), v_team_metal, '76561198333867003', 'Alucard', 12, 8, 0, 8, 1177, ROUND(1177.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199001198568'), v_team_metal, '76561199001198568', 'FARKETMEZ.cc', 11, 6, 4, 5, 1132, ROUND(1132.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198376809576'), v_team_metal, '76561198376809576', 'Pasuel', 6, 6, 5, 2, 811, ROUND(811.0/14, 1));

  -- BusCourney players (team_Nightwatch side) - mirage
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr)
  VALUES
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198324665466'), v_team_bus, '76561198324665466', 'TERMİNATÖR', 14, 13, 1, 6, 1677, ROUND(1677.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198074442660'), v_team_bus, '76561198074442660', 'Nightwatch', 6, 14, 1, 2, 517, ROUND(517.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198284365406'), v_team_bus, '76561198284365406', 'smoothopeerator', 4, 13, 2, 3, 595, ROUND(595.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198191104478'), v_team_bus, '76561198191104478', 'ELektroBEyiN', 3, 12, 3, 1, 465, ROUND(465.0/14, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198367283733'), v_team_bus, '76561198367283733', 'CANTURK', 1, 14, 1, 0, 613, ROUND(613.0/14, 1));

  -- Map 3: inferno - METAL 13 : 5 BUS (18 rounds)
  INSERT INTO cs2_match_maps (id, match_id, map_number, map, team1_score, team2_score, rounds_played, winner_team_id)
  VALUES (gen_random_uuid(), v_match2, 3, 'de_inferno', 13, 5, 18, v_team_metal)
  RETURNING id INTO v_map;

  -- METAL DIVISION players (team_ELektroBEyiN side) - inferno
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr)
  VALUES
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199104832590'), v_team_metal, '76561199104832590', 'Greaw', 23, 11, 5, 10, 2325, ROUND(2325.0/18, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199001198568'), v_team_metal, '76561199001198568', 'FARKETMEZ.cc', 19, 8, 0, 9, 1421, ROUND(1421.0/18, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198452210637'), v_team_metal, '76561198452210637', 'MayoNeTT', 17, 15, 8, 8, 1864, ROUND(1864.0/18, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198333867003'), v_team_metal, '76561198333867003', 'Alucard', 12, 16, 6, 8, 1448, ROUND(1448.0/18, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198376809576'), v_team_metal, '76561198376809576', 'Pasuel', 12, 10, 4, 6, 1373, ROUND(1373.0/18, 1));

  -- BusCourney players (team_smoothopeerator side) - inferno
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr)
  VALUES
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198324665466'), v_team_bus, '76561198324665466', 'TERMİNATÖR', 26, 16, 3, 13, 2675, ROUND(2675.0/18, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198367283733'), v_team_bus, '76561198367283733', 'CANTURK', 10, 16, 3, 5, 1122, ROUND(1122.0/18, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198074442660'), v_team_bus, '76561198074442660', 'Nightwatch', 8, 18, 3, 3, 815, ROUND(815.0/18, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198191104478'), v_team_bus, '76561198191104478', 'ELektroBEyiN', 8, 18, 3, 5, 1072, ROUND(1072.0/18, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198284365406'), v_team_bus, '76561198284365406', 'smoothopeerator', 5, 17, 5, 1, 827, ROUND(827.0/18, 1));

  -- =========================================================================
  -- MATCH 3: ŞIKLATANLAR vs BÖRÜ
  -- Series: BÖRÜ 2-1
  -- =========================================================================
  INSERT INTO cs2_matches (id, team1_id, team2_id, status, winner_team_id, match_date)
  VALUES (gen_random_uuid(), v_team_siklatanlar, v_team_boru, 'FINISHED', v_team_boru, '2026-03-23'::timestamptz)
  RETURNING id INTO v_match3;

  -- Map 1: dust2 - ŞIKLATANLAR 13 : 6 BÖRÜ (19 rounds)
  INSERT INTO cs2_match_maps (id, match_id, map_number, map, team1_score, team2_score, rounds_played, winner_team_id)
  VALUES (gen_random_uuid(), v_match3, 1, 'de_dust2', 13, 6, 19, v_team_siklatanlar)
  RETURNING id INTO v_map;

  -- ŞIKLATANLAR players (team_TRrosh side) - dust2
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr)
  VALUES
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198298585328'), v_team_siklatanlar, '76561198298585328', 'Aibo', 22, 13, 3, 10, 2005, ROUND(2005.0/19, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199879135591'), v_team_siklatanlar, '76561199879135591', 'PyRo', 17, 9, 3, 7, 1787, ROUND(1787.0/19, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198341920431'), v_team_siklatanlar, '76561198341920431', 'TRrosh', 15, 9, 7, 5, 1563, ROUND(1563.0/19, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198847238087'), v_team_siklatanlar, '76561198847238087', 'MHK', 11, 14, 5, 1, 1556, ROUND(1556.0/19, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198227665824'), v_team_siklatanlar, '76561198227665824', 'BLΛCKBIRD', 10, 10, 4, 6, 1088, ROUND(1088.0/19, 1));

  -- BÖRÜ players (team_Toska side) - dust2
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr)
  VALUES
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198033678583'), v_team_boru, '76561198033678583', 'Chedjou', 21, 16, 5, 10, 2597, ROUND(2597.0/19, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198332518466'), v_team_boru, '76561198332518466', 'L3o', 17, 13, 2, 4, 1762, ROUND(1762.0/19, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198867919247'), v_team_boru, '76561198867919247', 'Toska', 9, 16, 2, 7, 1107, ROUND(1107.0/19, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199110867495'), v_team_boru, '76561199110867495', 'Saul_Goodman(AA)', 5, 17, 3, 1, 588, ROUND(588.0/19, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199401287389'), v_team_boru, '76561199401287389', 'Natural Intelligence (SB)', 3, 16, 0, 2, 279, ROUND(279.0/19, 1));

  -- Map 2: mirage - BÖRÜ 13 : 6 ŞIKLATANLAR (19 rounds)
  INSERT INTO cs2_match_maps (id, match_id, map_number, map, team1_score, team2_score, rounds_played, winner_team_id)
  VALUES (gen_random_uuid(), v_match3, 2, 'de_mirage', 6, 13, 19, v_team_boru)
  RETURNING id INTO v_map;

  -- ŞIKLATANLAR players (team_Aibo side) - mirage
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr)
  VALUES
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198298585328'), v_team_siklatanlar, '76561198298585328', 'Aibo', 23, 12, 4, 17, 2283, ROUND(2283.0/19, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198341920431'), v_team_siklatanlar, '76561198341920431', 'TRrosh', 19, 12, 6, 8, 1928, ROUND(1928.0/19, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198227665824'), v_team_siklatanlar, '76561198227665824', 'BLΛCKBIRD', 15, 7, 1, 6, 1281, ROUND(1281.0/19, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198847238087'), v_team_siklatanlar, '76561198847238087', 'MHK', 13, 15, 5, 4, 1624, ROUND(1624.0/19, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199879135591'), v_team_siklatanlar, '76561199879135591', 'PyRo', 10, 12, 4, 2, 1075, ROUND(1075.0/19, 1));

  -- BÖRÜ players (team_Saul_GoodmanAA side) - mirage
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr)
  VALUES
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198332518466'), v_team_boru, '76561198332518466', 'L3o', 20, 15, 6, 9, 2040, ROUND(2040.0/19, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198867919247'), v_team_boru, '76561198867919247', 'Toska', 15, 16, 7, 10, 2095, ROUND(2095.0/19, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199110867495'), v_team_boru, '76561199110867495', 'Saul_Goodman(AA)', 10, 16, 3, 4, 1033, ROUND(1033.0/19, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198033678583'), v_team_boru, '76561198033678583', 'Chedjou', 8, 16, 6, 0, 1247, ROUND(1247.0/19, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199401287389'), v_team_boru, '76561199401287389', 'Natural Intelligence (SB)', 2, 17, 4, 2, 646, ROUND(646.0/19, 1));

  -- Map 3: nuke - BÖRÜ 13 : 7 ŞIKLATANLAR (20 rounds)
  INSERT INTO cs2_match_maps (id, match_id, map_number, map, team1_score, team2_score, rounds_played, winner_team_id)
  VALUES (gen_random_uuid(), v_match3, 3, 'de_nuke', 7, 13, 20, v_team_boru)
  RETURNING id INTO v_map;

  -- ŞIKLATANLAR players (team_PyRo side) - nuke
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr)
  VALUES
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198341920431'), v_team_siklatanlar, '76561198341920431', 'TRrosh', 25, 15, 3, 9, 2262, ROUND(2262.0/20, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198298585328'), v_team_siklatanlar, '76561198298585328', 'Aibo', 15, 19, 8, 9, 1954, ROUND(1954.0/20, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199879135591'), v_team_siklatanlar, '76561199879135591', 'PyRo', 15, 16, 4, 3, 1293, ROUND(1293.0/20, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198847238087'), v_team_siklatanlar, '76561198847238087', 'MHK', 9, 17, 7, 1, 1022, ROUND(1022.0/20, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198227665824'), v_team_siklatanlar, '76561198227665824', 'BLΛCKBIRD', 5, 19, 5, 2, 721, ROUND(721.0/20, 1));

  -- BÖRÜ players (team_Toska side) - nuke
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr)
  VALUES
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198332518466'), v_team_boru, '76561198332518466', 'L3o', 36, 8, 3, 9, 3149, ROUND(3149.0/20, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198867919247'), v_team_boru, '76561198867919247', 'Toska', 24, 14, 3, 12, 2409, ROUND(2409.0/20, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198033678583'), v_team_boru, '76561198033678583', 'Chedjou', 14, 14, 5, 5, 1920, ROUND(1920.0/20, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199110867495'), v_team_boru, '76561199110867495', 'Saul_Goodman(AA)', 6, 14, 4, 3, 830, ROUND(830.0/20, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199401287389'), v_team_boru, '76561199401287389', 'Natural Intelligence (SB)', 4, 18, 4, 3, 718, ROUND(718.0/20, 1));

  -- =========================================================================
  -- MATCH 4: BLACK MAMBA vs Hizalanamayanlar
  -- Series: BLACK MAMBA 3-0
  -- =========================================================================
  INSERT INTO cs2_matches (id, team1_id, team2_id, status, winner_team_id, match_date)
  VALUES (gen_random_uuid(), v_team_mamba, v_team_hizal, 'FINISHED', v_team_mamba, '2026-03-23'::timestamptz)
  RETURNING id INTO v_match4;

  -- Map 1: dust2 - MAMBA 13 : 7 HIZAL (20 rounds)
  INSERT INTO cs2_match_maps (id, match_id, map_number, map, team1_score, team2_score, rounds_played, winner_team_id)
  VALUES (gen_random_uuid(), v_match4, 1, 'de_dust2', 13, 7, 20, v_team_mamba)
  RETURNING id INTO v_map;

  -- BLACK MAMBA players (team_APOLLO side) - dust2
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr)
  VALUES
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199559185953'), v_team_mamba, '76561199559185953', 'GÜLLÜ', 24, 17, 7, 9, 2382, ROUND(2382.0/20, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199059099181'), v_team_mamba, '76561199059099181', 'XANAX-1mg', 18, 14, 10, 2, 2072, ROUND(2072.0/20, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198955462483'), v_team_mamba, '76561198955462483', 'Fatih', 16, 10, 8, 9, 1730, ROUND(1730.0/20, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199380502718'), v_team_mamba, '76561199380502718', 'APOLLO', 13, 13, 8, 4, 1383, ROUND(1383.0/20, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198386239863'), v_team_mamba, '76561198386239863', 'TheJaveLin', 4, 17, 3, 2, 608, ROUND(608.0/20, 1));

  -- Hizalanamayanlar players (team_Murat side) - dust2
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr)
  VALUES
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198157758327'), v_team_hizal, '76561198157758327', 'Murat', 21, 13, 7, 6, 2245, ROUND(2245.0/20, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199099758701'), v_team_hizal, '76561199099758701', 'Bahattin', 14, 14, 6, 3, 1895, ROUND(1895.0/20, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198930081296'), v_team_hizal, '76561198930081296', 'Kamil', 13, 16, 4, 8, 1411, ROUND(1411.0/20, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199067959748'), v_team_hizal, '76561199067959748', 'Tezcan', 13, 16, 4, 9, 1544, ROUND(1544.0/20, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199045061644'), v_team_hizal, '76561199045061644', 'Taksici', 8, 19, 0, 3, 741, ROUND(741.0/20, 1));

  -- Map 2: mirage - MAMBA 13 : 6 HIZAL (19 rounds)
  INSERT INTO cs2_match_maps (id, match_id, map_number, map, team1_score, team2_score, rounds_played, winner_team_id)
  VALUES (gen_random_uuid(), v_match4, 2, 'de_mirage', 13, 6, 19, v_team_mamba)
  RETURNING id INTO v_map;

  -- BLACK MAMBA players (team_GULLU side) - mirage
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr)
  VALUES
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199059099181'), v_team_mamba, '76561199059099181', 'XANAX-1mg', 31, 13, 4, 12, 2930, ROUND(2930.0/19, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198955462483'), v_team_mamba, '76561198955462483', 'Fatih', 23, 5, 6, 12, 1880, ROUND(1880.0/19, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199559185953'), v_team_mamba, '76561199559185953', 'GÜLLÜ', 20, 15, 6, 11, 2503, ROUND(2503.0/19, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199380502718'), v_team_mamba, '76561199380502718', 'APOLLO', 4, 8, 4, 1, 834, ROUND(834.0/19, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198386239863'), v_team_mamba, '76561198386239863', 'TheJaveLin', 0, 10, 4, 0, 191, ROUND(191.0/19, 1));

  -- Hizalanamayanlar players (team_Murat side) - mirage
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr)
  VALUES
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198157758327'), v_team_hizal, '76561198157758327', 'Murat', 17, 16, 6, 5, 2030, ROUND(2030.0/19, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199099758701'), v_team_hizal, '76561199099758701', 'Bahattin', 16, 15, 1, 7, 1786, ROUND(1786.0/19, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199067959748'), v_team_hizal, '76561199067959748', 'Tezcan', 14, 15, 1, 7, 1679, ROUND(1679.0/19, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198930081296'), v_team_hizal, '76561198930081296', 'Kamil', 3, 17, 5, 1, 610, ROUND(610.0/19, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199045061644'), v_team_hizal, '76561199045061644', 'Taksici', 1, 17, 2, 0, 228, ROUND(228.0/19, 1));

  -- Map 3: inferno - MAMBA 13 : 10 HIZAL (23 rounds)
  INSERT INTO cs2_match_maps (id, match_id, map_number, map, team1_score, team2_score, rounds_played, winner_team_id)
  VALUES (gen_random_uuid(), v_match4, 3, 'de_inferno', 13, 10, 23, v_team_mamba)
  RETURNING id INTO v_map;

  -- BLACK MAMBA players (team_Fatih side) - inferno
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr)
  VALUES
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199559185953'), v_team_mamba, '76561199559185953', 'GÜLLÜ', 31, 18, 11, 14, 3451, ROUND(3451.0/23, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198955462483'), v_team_mamba, '76561198955462483', 'Fatih', 24, 15, 1, 14, 2095, ROUND(2095.0/23, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199059099181'), v_team_mamba, '76561199059099181', 'XANAX-1mg', 22, 15, 7, 9, 2584, ROUND(2584.0/23, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199380502718'), v_team_mamba, '76561199380502718', 'APOLLO', 11, 16, 6, 3, 1141, ROUND(1141.0/23, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198386239863'), v_team_mamba, '76561198386239863', 'TheJaveLin', 4, 19, 5, 1, 570, ROUND(570.0/23, 1));

  -- Hizalanamayanlar players (team_Tezcan side) - inferno
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr)
  VALUES
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198157758327'), v_team_hizal, '76561198157758327', 'Murat', 27, 19, 7, 10, 3495, ROUND(3495.0/23, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199099758701'), v_team_hizal, '76561199099758701', 'Bahattin', 24, 16, 9, 9, 2622, ROUND(2622.0/23, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198930081296'), v_team_hizal, '76561198930081296', 'Kamil', 16, 19, 5, 6, 1721, ROUND(1721.0/23, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199067959748'), v_team_hizal, '76561199067959748', 'Tezcan', 10, 18, 4, 4, 914, ROUND(914.0/23, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199045061644'), v_team_hizal, '76561199045061644', 'Taksici', 3, 21, 2, 2, 331, ROUND(331.0/23, 1));

  -- =========================================================================
  -- MATCH 5: GEGENPRES vs BHEAMB
  -- Series: GEGENPRES 3-0
  -- =========================================================================
  INSERT INTO cs2_matches (id, team1_id, team2_id, status, winner_team_id, match_date)
  VALUES (gen_random_uuid(), v_team_gegen, v_team_bheamb, 'FINISHED', v_team_gegen, '2026-03-23'::timestamptz)
  RETURNING id INTO v_match5;

  -- Map 1: dust2 - GEGEN 13 : 10 BHEAMB (23 rounds)
  INSERT INTO cs2_match_maps (id, match_id, map_number, map, team1_score, team2_score, rounds_played, winner_team_id)
  VALUES (gen_random_uuid(), v_match5, 1, 'de_dust2', 13, 10, 23, v_team_gegen)
  RETURNING id INTO v_map;

  -- GEGENPRES players (team_TRader_OK side) - dust2
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr)
  VALUES
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199120455536'), v_team_gegen, '76561199120455536', 'JakieS', 41, 17, 7, 21, 4144, ROUND(4144.0/23, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198192462155'), v_team_gegen, '76561198192462155', 'Pac', 24, 16, 11, 15, 2882, ROUND(2882.0/23, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198160862027'), v_team_gegen, '76561198160862027', 'Altar''ın Oğlu Tarkan (AS)', 17, 13, 3, 6, 1376, ROUND(1376.0/23, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198372270608'), v_team_gegen, '76561198372270608', 'BENETO (ECK)', 11, 14, 9, 5, 1442, ROUND(1442.0/23, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198350960783'), v_team_gegen, '76561198350960783', 'TRader (OK)', 8, 19, 4, 3, 841, ROUND(841.0/23, 1));

  -- BHEAMB players (team_MARATON side) - dust2
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr)
  VALUES
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199487734872'), v_team_bheamb, '76561199487734872', 'karac4', 20, 19, 4, 7, 1884, ROUND(1884.0/23, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198973020202'), v_team_bheamb, '76561198973020202', '𝐓𝐞𝐜𝐡', 19, 20, 7, 10, 2331, ROUND(2331.0/23, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198931423764'), v_team_bheamb, '76561198931423764', 'MARATON', 16, 22, 3, 10, 1629, ROUND(1629.0/23, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198787017562'), v_team_bheamb, '76561198787017562', 'SİNYOR0', 11, 21, 12, 4, 1668, ROUND(1668.0/23, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199045769578'), v_team_bheamb, '76561199045769578', 'KANTARES', 10, 19, 1, 4, 685, ROUND(685.0/23, 1));

  -- Map 2: mirage - GEGEN 22 : 20 BHEAMB OT (42 rounds)
  INSERT INTO cs2_match_maps (id, match_id, map_number, map, team1_score, team2_score, rounds_played, winner_team_id)
  VALUES (gen_random_uuid(), v_match5, 2, 'de_mirage', 22, 20, 42, v_team_gegen)
  RETURNING id INTO v_map;

  -- GEGENPRES players (team_JakieS side) - mirage
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr)
  VALUES
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199120455536'), v_team_gegen, '76561199120455536', 'JakieS', 71, 32, 13, 34, 7567, ROUND(7567.0/42, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198192462155'), v_team_gegen, '76561198192462155', 'Pac', 30, 36, 12, 14, 3572, ROUND(3572.0/42, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198967300942'), v_team_gegen, '76561198967300942', 'Vandetta (F. T)', 29, 30, 9, 11, 3039, ROUND(3039.0/42, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198372270608'), v_team_gegen, '76561198372270608', 'BENETO (ECK)', 14, 32, 3, 4, 1411, ROUND(1411.0/42, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198350960783'), v_team_gegen, '76561198350960783', 'TRader (OK)', 5, 39, 6, 1, 733, ROUND(733.0/42, 1));

  -- BHEAMB players (team_ side) - mirage
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr)
  VALUES
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199487734872'), v_team_bheamb, '76561199487734872', 'karac4', 40, 33, 11, 21, 4545, ROUND(4545.0/42, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198931423764'), v_team_bheamb, '76561198931423764', 'MARATON', 39, 31, 6, 23, 4191, ROUND(4191.0/42, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198787017562'), v_team_bheamb, '76561198787017562', 'SİNYOR0', 36, 25, 10, 18, 3630, ROUND(3630.0/42, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198973020202'), v_team_bheamb, '76561198973020202', '𝐓𝐞𝐜𝐡', 36, 27, 8, 12, 4020, ROUND(4020.0/42, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199045769578'), v_team_bheamb, '76561199045769578', 'KANTARES', 17, 35, 8, 3, 1582, ROUND(1582.0/42, 1));

  -- Map 3: inferno - GEGEN 13 : 2 BHEAMB (15 rounds)
  INSERT INTO cs2_match_maps (id, match_id, map_number, map, team1_score, team2_score, rounds_played, winner_team_id)
  VALUES (gen_random_uuid(), v_match5, 3, 'de_inferno', 13, 2, 15, v_team_gegen)
  RETURNING id INTO v_map;

  -- GEGENPRES players (team_TRader_OK side) - inferno
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr)
  VALUES
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199120455536'), v_team_gegen, '76561199120455536', 'JakieS', 24, 8, 12, 11, 2807, ROUND(2807.0/15, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198192462155'), v_team_gegen, '76561198192462155', 'Pac', 22, 8, 1, 9, 1973, ROUND(1973.0/15, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198967300942'), v_team_gegen, '76561198967300942', 'Vandetta (F. T)', 14, 11, 4, 8, 1523, ROUND(1523.0/15, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198160862027'), v_team_gegen, '76561198160862027', 'Altar''ın Oğlu Tarkan (AS)', 7, 7, 0, 2, 484, ROUND(484.0/15, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198350960783'), v_team_gegen, '76561198350960783', 'TRader (OK)', 4, 11, 3, 0, 415, ROUND(415.0/15, 1));

  -- BHEAMB players (team_MARATON side) - inferno
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr)
  VALUES
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198931423764'), v_team_bheamb, '76561198931423764', 'MARATON', 11, 15, 2, 6, 1316, ROUND(1316.0/15, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198973020202'), v_team_bheamb, '76561198973020202', '𝐓𝐞𝐜𝐡', 10, 14, 3, 1, 1204, ROUND(1204.0/15, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199487734872'), v_team_bheamb, '76561199487734872', 'karac4', 9, 14, 2, 7, 908, ROUND(908.0/15, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561198787017562'), v_team_bheamb, '76561198787017562', 'SİNYOR0', 8, 14, 5, 6, 1110, ROUND(1110.0/15, 1)),
    (v_map, (SELECT id FROM cs2_players WHERE steam_id = '76561199045769578'), v_team_bheamb, '76561199045769578', 'KANTARES', 7, 14, 2, 3, 687, ROUND(687.0/15, 1));

  RAISE NOTICE 'Successfully imported 5 matches with 15 maps and all player statistics.';

END $$;

-- Re-enable RLS
ALTER TABLE cs2_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs2_match_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs2_match_players ENABLE ROW LEVEL SECURITY;
