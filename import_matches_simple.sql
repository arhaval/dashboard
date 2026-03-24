-- ============================================================
-- TEMSA CS2 Tournament - Import 5 Matches (Aggregated Stats)
-- Date: 2026-03-23
-- Each map won = 1 point in standings
-- ============================================================

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
  v_team_hizalanamayanlar UUID;
  v_team_gegen UUID;
  v_team_bheamb UUID;

  -- Match IDs
  v_match1 UUID;
  v_match2 UUID;
  v_match3 UUID;
  v_match4 UUID;
  v_match5 UUID;

  -- Map container IDs (one per match)
  v_map1 UUID;
  v_map2 UUID;
  v_map3 UUID;
  v_map4 UUID;
  v_map5 UUID;

  -- Player IDs
  v_player UUID;

BEGIN
  -- ============================================================
  -- LOOKUP TEAMS
  -- ============================================================
  SELECT id INTO v_team_crimson FROM cs2_teams WHERE name = 'CRIMSON REAPERS';
  SELECT id INTO v_team_ak47 FROM cs2_teams WHERE name = 'AK47 SUPPLIERS';
  SELECT id INTO v_team_metal FROM cs2_teams WHERE name = 'METAL DIVISION';
  SELECT id INTO v_team_bus FROM cs2_teams WHERE name = 'BusCourney';
  SELECT id INTO v_team_siklatanlar FROM cs2_teams WHERE name = 'SIKLATANLAR';
  SELECT id INTO v_team_boru FROM cs2_teams WHERE name = 'BORU';
  SELECT id INTO v_team_mamba FROM cs2_teams WHERE name = 'BLACK MAMBA';
  SELECT id INTO v_team_hizalanamayanlar FROM cs2_teams WHERE name = 'Hizalanamayanlar';
  SELECT id INTO v_team_gegen FROM cs2_teams WHERE name = 'GEGENPRES';
  SELECT id INTO v_team_bheamb FROM cs2_teams WHERE name = 'BHEAMB';

  -- ============================================================
  -- MATCH 1: AK47 SUPPLIERS vs CRIMSON REAPERS
  -- CRIMSON wins 3-0 (dust2 1-13, mirage 1-13, inferno 1-13)
  -- Total rounds: 14 + 14 + 14 = 42
  -- ============================================================
  INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
  VALUES (v_team_ak47, v_team_crimson, 'FINISHED', '2026-03-23', v_team_crimson, 0, 3)
  RETURNING id INTO v_match1;

  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played)
  VALUES (v_match1, 'series', 1, 0, 3, 42)
  RETURNING id INTO v_map1;

  -- CRIMSON REAPERS players (team_Captain_MG / team_Mr_Boombastic across maps)
  -- DAYI (76561198380002468): Maps: 19+21+17=57k, 8+9+6=23d, 2078+1991+1593=5662dmg, 7+1+6=14a, 14+17+9=40hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198380002468';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map1, v_player, v_team_crimson, '76561198380002468', 'DAYI', 57, 23, 14, 40, ROUND(5662.0 / 42, 1), 5662, 0, 0);

  -- Electronica (76561198074087741): 16+6+16=38k, 3+4+3=10d, 1329+879+1525=3733dmg, 3+6+4=13a, 8+5+9=22hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198074087741';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map1, v_player, v_team_crimson, '76561198074087741', 'Electronica', 38, 10, 13, 22, ROUND(3733.0 / 42, 1), 3733, 0, 0);

  -- OGZK (76561198044432985): 15+12+23=50k, 4+3+6=13d, 1217+1394+1932=4543dmg, 5+6+2=13a, 2+4+6=12hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198044432985';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map1, v_player, v_team_crimson, '76561198044432985', 'OGZK', 50, 13, 13, 12, ROUND(4543.0 / 42, 1), 4543, 0, 0);

  -- Captain MG (76561198134625951): 15+15+4=34k, 6+4+5=15d, 1727+1373+607=3707dmg, 8+2+2=12a, 5+9+2=16hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198134625951';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map1, v_player, v_team_crimson, '76561198134625951', 'Captain MG', 34, 15, 12, 16, ROUND(3707.0 / 42, 1), 3707, 0, 0);

  -- Mr. Boombastic (76561198340882003): 4+13+9=26k, 5+3+7=15d, 536+1209+1189=2934dmg, 5+2+8=15a, 0+3+3=6hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198340882003';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map1, v_player, v_team_crimson, '76561198340882003', 'Mr. Boombastic', 26, 15, 15, 6, ROUND(2934.0 / 42, 1), 2934, 0, 0);

  -- AK47 SUPPLIERS players (team_memati / team_ARKANTOS across maps)
  -- BEDOOO (76561198310852022): 9+7+8=24k, 14+13+14=41d, 900+1364+1379=3643dmg, 0+5+3=8a, 8+3+6=17hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198310852022';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map1, v_player, v_team_ak47, '76561198310852022', 'BEDOOO', 24, 41, 8, 17, ROUND(3643.0 / 42, 1), 3643, 0, 0);

  -- [G.H.O.S.T.] (76561198796358007): 7+5+3=15k, 14+13+14=41d, 637+655+450=1742dmg, 1+0+2=3a, 6+3+2=11hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198796358007';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map1, v_player, v_team_ak47, '76561198796358007', '[G.H.O.S.T.]', 15, 41, 3, 11, ROUND(1742.0 / 42, 1), 1742, 0, 0);

  -- aim kaydı dilek tut (76561198153053788): 5+5+6=16k, 13+14+13=40d, 885+522+741=2148dmg, 4+0+0=4a, 3+1+5=9hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198153053788';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map1, v_player, v_team_ak47, '76561198153053788', 'aim kaydı dilek tut', 16, 40, 4, 9, ROUND(2148.0 / 42, 1), 2148, 0, 0);

  -- ARKANTOS (76561199226019040): 3+3+7=13k, 14+14+14=42d, 539+412+1046=1997dmg, 3+2+2=7a, 1+1+5=7hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199226019040';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map1, v_player, v_team_ak47, '76561199226019040', 'ARKANTOS', 13, 42, 7, 7, ROUND(1997.0 / 42, 1), 1997, 0, 0);

  -- memati (76561198295103268): 2+3+1=6k, 14+13+14=41d, 185+338+180=703dmg, 0+0+1=1a, 1+0+1=2hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198295103268';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map1, v_player, v_team_ak47, '76561198295103268', 'memati', 6, 41, 1, 2, ROUND(703.0 / 42, 1), 703, 0, 0);

  -- ============================================================
  -- MATCH 2: METAL DIVISION vs BusCourney
  -- METAL wins 3-0 (dust2 13-1, mirage 13-1, inferno 13-5)
  -- Total rounds: 14 + 14 + 18 = 46
  -- ============================================================
  INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
  VALUES (v_team_metal, v_team_bus, 'FINISHED', '2026-03-23', v_team_metal, 3, 0)
  RETURNING id INTO v_match2;

  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played)
  VALUES (v_match2, 'series', 1, 3, 0, 46)
  RETURNING id INTO v_map2;

  -- METAL DIVISION players (team_Alucard / team_Pasuel / team_ELektroBEyiN across 3 maps)
  -- Greaw (76561199104832590): 22+18+23=63k, 5+2+11=18d, 1947+1411+2325=5683dmg, 2+3+5=10a, 10+5+10=25hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199104832590';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map2, v_player, v_team_metal, '76561199104832590', 'Greaw', 63, 18, 10, 25, ROUND(5683.0 / 46, 1), 5683, 0, 0);

  -- Alucard (76561198333867003): 20+12+12=44k, 8+8+16=32d, 1895+1177+1448=4520dmg, 5+0+6=11a, 17+8+8=33hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198333867003';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map2, v_player, v_team_metal, '76561198333867003', 'Alucard', 44, 32, 11, 33, ROUND(4520.0 / 46, 1), 4520, 0, 0);

  -- MayoNeTT (76561198452210637): 17+19+17=53k, 6+8+15=29d, 1747+2329+1864=5940dmg, 7+5+8=20a, 4+12+8=24hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198452210637';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map2, v_player, v_team_metal, '76561198452210637', 'MayoNeTT', 53, 29, 20, 24, ROUND(5940.0 / 46, 1), 5940, 0, 0);

  -- Pasuel (76561198376809576): 5+6+12=23k, 5+6+10=21d, 613+811+1373=2797dmg, 1+5+4=10a, 3+2+6=11hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198376809576';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map2, v_player, v_team_metal, '76561198376809576', 'Pasuel', 23, 21, 10, 11, ROUND(2797.0 / 46, 1), 2797, 0, 0);

  -- FARKETMEZ.cc (76561199001198568): 3+11+19=33k, 5+6+8=19d, 576+1132+1421=3129dmg, 6+4+0=10a, 1+5+9=15hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199001198568';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map2, v_player, v_team_metal, '76561199001198568', 'FARKETMEZ.cc', 33, 19, 10, 15, ROUND(3129.0 / 46, 1), 3129, 0, 0);

  -- BusCourney players (team_ELektroBEyiN / team_Nightwatch / team_smoothopeerator across 3 maps)
  -- TERMİNATÖR (76561198324665466): 9+14+26=49k, 13+13+16=42d, 1345+1677+2675=5697dmg, 3+1+3=7a, 3+6+13=22hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198324665466';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map2, v_player, v_team_bus, '76561198324665466', 'TERMİNATÖR', 49, 42, 7, 22, ROUND(5697.0 / 46, 1), 5697, 0, 0);

  -- Nightwatch (76561198074442660): 8+6+8=22k, 13+14+18=45d, 1002+517+815=2334dmg, 2+1+3=6a, 4+2+3=9hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198074442660';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map2, v_player, v_team_bus, '76561198074442660', 'Nightwatch', 22, 45, 6, 9, ROUND(2334.0 / 46, 1), 2334, 0, 0);

  -- CANTURK (76561198367283733): 5+1+10=16k, 14+14+16=44d, 1055+613+1122=2790dmg, 5+1+3=9a, 1+0+5=6hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198367283733';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map2, v_player, v_team_bus, '76561198367283733', 'CANTURK', 16, 44, 9, 6, ROUND(2790.0 / 46, 1), 2790, 0, 0);

  -- smoothopeerator (76561198284365406): 4+4+5=13k, 13+13+17=43d, 312+595+827=1734dmg, 0+2+5=7a, 2+3+1=6hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198284365406';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map2, v_player, v_team_bus, '76561198284365406', 'smoothopeerator', 13, 43, 7, 6, ROUND(1734.0 / 46, 1), 1734, 0, 0);

  -- ELektroBEyiN (76561198191104478): 2+3+8=13k, 14+12+18=44d, 407+465+1072=1944dmg, 1+3+3=7a, 2+1+5=8hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198191104478';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map2, v_player, v_team_bus, '76561198191104478', 'ELektroBEyiN', 13, 44, 7, 8, ROUND(1944.0 / 46, 1), 1944, 0, 0);

  -- ============================================================
  -- MATCH 3: ŞIKLATANLAR vs BÖRÜ
  -- BÖRÜ wins 2-1 (dust2 ŞIKLATANLAR 13-6, mirage BÖRÜ 13-6, nuke BÖRÜ 13-7)
  -- Total rounds: 19 + 19 + 20 = 58
  -- ============================================================
  INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
  VALUES (v_team_siklatanlar, v_team_boru, 'FINISHED', '2026-03-23', v_team_boru, 1, 2)
  RETURNING id INTO v_match3;

  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played)
  VALUES (v_match3, 'series', 1, 1, 2, 58)
  RETURNING id INTO v_map3;

  -- ŞIKLATANLAR players (team_TRrosh / team_Aibo / team_PyRo across 3 maps)
  -- Aibo (76561198298585328): 22+23+15=60k, 13+12+19=44d, 2005+2283+1954=6242dmg, 3+4+8=15a, 10+17+9=36hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198298585328';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map3, v_player, v_team_siklatanlar, '76561198298585328', 'Aibo', 60, 44, 15, 36, ROUND(6242.0 / 58, 1), 6242, 0, 0);

  -- TRrosh (76561198341920431): 15+19+25=59k, 9+12+15=36d, 1563+1928+2262=5753dmg, 7+6+3=16a, 5+8+9=22hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198341920431';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map3, v_player, v_team_siklatanlar, '76561198341920431', 'TRrosh', 59, 36, 16, 22, ROUND(5753.0 / 58, 1), 5753, 0, 0);

  -- PyRo (76561199879135591): 17+10+15=42k, 9+12+16=37d, 1787+1075+1293=4155dmg, 3+4+4=11a, 7+2+3=12hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199879135591';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map3, v_player, v_team_siklatanlar, '76561199879135591', 'PyRo', 42, 37, 11, 12, ROUND(4155.0 / 58, 1), 4155, 0, 0);

  -- MHK (76561198847238087): 11+13+9=33k, 14+15+17=46d, 1556+1624+1022=4202dmg, 5+5+7=17a, 1+4+1=6hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198847238087';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map3, v_player, v_team_siklatanlar, '76561198847238087', 'MHK', 33, 46, 17, 6, ROUND(4202.0 / 58, 1), 4202, 0, 0);

  -- BLΛCKBIRD (76561198227665824): 10+15+5=30k, 10+7+19=36d, 1088+1281+721=3090dmg, 4+1+5=10a, 6+6+2=14hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198227665824';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map3, v_player, v_team_siklatanlar, '76561198227665824', 'BLΛCKBIRD', 30, 36, 10, 14, ROUND(3090.0 / 58, 1), 3090, 0, 0);

  -- BÖRÜ players (team_Toska_分 / team_Saul_GoodmanAA across 3 maps)
  -- L3o (76561198332518466): 17+20+36=73k, 13+15+8=36d, 1762+2040+3149=6951dmg, 2+6+3=11a, 4+9+9=22hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198332518466';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map3, v_player, v_team_boru, '76561198332518466', 'L3o', 73, 36, 11, 22, ROUND(6951.0 / 58, 1), 6951, 0, 0);

  -- Toska 分 (76561198867919247): 9+15+24=48k, 16+16+14=46d, 1107+2095+2409=5611dmg, 2+7+3=12a, 7+10+12=29hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198867919247';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map3, v_player, v_team_boru, '76561198867919247', 'Toska 分', 48, 46, 12, 29, ROUND(5611.0 / 58, 1), 5611, 0, 0);

  -- Chedjou (76561198033678583): 21+8+14=43k, 16+16+14=46d, 2597+1247+1920=5764dmg, 5+6+5=16a, 10+0+5=15hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198033678583';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map3, v_player, v_team_boru, '76561198033678583', 'Chedjou', 43, 46, 16, 15, ROUND(5764.0 / 58, 1), 5764, 0, 0);

  -- Saul_Goodman(AA) (76561199110867495): 5+10+6=21k, 17+16+14=47d, 588+1033+830=2451dmg, 3+3+4=10a, 1+4+3=8hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199110867495';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map3, v_player, v_team_boru, '76561199110867495', 'Saul_Goodman(AA)', 21, 47, 10, 8, ROUND(2451.0 / 58, 1), 2451, 0, 0);

  -- Natural Intelligence (SB) (76561199401287389): 3+2+4=9k, 16+17+18=51d, 279+646+718=1643dmg, 0+4+4=8a, 2+2+3=7hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199401287389';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map3, v_player, v_team_boru, '76561199401287389', 'Natural Intelligence (SB)', 9, 51, 8, 7, ROUND(1643.0 / 58, 1), 1643, 0, 0);

  -- ============================================================
  -- MATCH 4: BLACK MAMBA vs Hizalanamayanlar
  -- MAMBA wins 3-0 (dust2 13-7, mirage 13-6, inferno 13-10)
  -- Total rounds: 20 + 19 + 23 = 62
  -- ============================================================
  INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
  VALUES (v_team_mamba, v_team_hizalanamayanlar, 'FINISHED', '2026-03-23', v_team_mamba, 3, 0)
  RETURNING id INTO v_match4;

  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played)
  VALUES (v_match4, 'series', 1, 3, 0, 62)
  RETURNING id INTO v_map4;

  -- BLACK MAMBA players (team_ELektroBEyiN / team_Pasuel / team_smoothopeerator across maps)
  -- Greaw (76561199104832590): 23k, 11d, 2325dmg, 5a, 10hs (only map 7 = match 4 map 1)
  -- Wait - Match 4 uses files: match_data_map0_2.csv (matchid=2), match_data_map0_3.csv (matchid=3), match_data_map0_4 (1).csv (matchid=4)
  -- Let me re-check: map0_2 has team_APOLLO vs team_Murat, map0_3 has team_GÜLLÜ vs team_Murat, map0_4 has team_Fatih vs team_Tezcan
  -- These are all the SAME 10 players across 3 maps! Team names change but players are consistent.

  -- BLACK MAMBA players (team_APOLLO/team_GÜLLÜ/team_Fatih = GÜLLÜ, XANAX, Fatih, APOLLO, TheJaveLin)
  -- GÜLLÜ (76561199559185953): 24+20+31=75k, 17+15+18=50d, 2382+2503+3451=8336dmg, 7+6+11=24a, 9+11+14=34hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199559185953';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map4, v_player, v_team_mamba, '76561199559185953', 'GÜLLÜ', 75, 50, 24, 34, ROUND(8336.0 / 62, 1), 8336, 0, 0);

  -- XANAX-1mg (76561199059099181): 18+31+22=71k, 14+13+15=42d, 2072+2930+2584=7586dmg, 10+4+7=21a, 2+12+9=23hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199059099181';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map4, v_player, v_team_mamba, '76561199059099181', 'XANAX-1mg', 71, 42, 21, 23, ROUND(7586.0 / 62, 1), 7586, 0, 0);

  -- Fatih (76561198955462483): 16+23+24=63k, 10+5+15=30d, 1730+1880+2095=5705dmg, 8+6+1=15a, 9+12+14=35hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198955462483';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map4, v_player, v_team_mamba, '76561198955462483', 'Fatih', 63, 30, 15, 35, ROUND(5705.0 / 62, 1), 5705, 0, 0);

  -- APOLLO (76561199380502718): 13+4+11=28k, 13+8+16=37d, 1383+834+1141=3358dmg, 8+4+6=18a, 4+1+3=8hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199380502718';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map4, v_player, v_team_mamba, '76561199380502718', 'APOLLO', 28, 37, 18, 8, ROUND(3358.0 / 62, 1), 3358, 0, 0);

  -- TheJaveLin (76561198386239863): 4+0+4=8k, 17+10+19=46d, 608+191+570=1369dmg, 3+4+5=12a, 2+0+1=3hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198386239863';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map4, v_player, v_team_mamba, '76561198386239863', 'TheJaveLin', 8, 46, 12, 3, ROUND(1369.0 / 62, 1), 1369, 0, 0);

  -- Hizalanamayanlar players (team_Murat / team_Tezcan)
  -- Murat (76561198157758327): 21+17+27=65k, 13+16+19=48d, 2245+2030+3495=7770dmg, 7+6+7=20a, 6+5+10=21hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198157758327';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map4, v_player, v_team_hizalanamayanlar, '76561198157758327', 'Murat', 65, 48, 20, 21, ROUND(7770.0 / 62, 1), 7770, 0, 0);

  -- Bahattin (76561199099758701): 14+16+24=54k, 14+15+16=45d, 1895+1786+2622=6303dmg, 6+1+9=16a, 3+7+9=19hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199099758701';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map4, v_player, v_team_hizalanamayanlar, '76561199099758701', 'Bahattin', 54, 45, 16, 19, ROUND(6303.0 / 62, 1), 6303, 0, 0);

  -- Kamil (76561198930081296): 13+3+16=32k, 16+17+19=52d, 1411+610+1721=3742dmg, 4+5+5=14a, 8+1+6=15hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198930081296';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map4, v_player, v_team_hizalanamayanlar, '76561198930081296', 'Kamil', 32, 52, 14, 15, ROUND(3742.0 / 62, 1), 3742, 0, 0);

  -- Tezcan (76561199067959748): 13+14+10=37k, 16+15+18=49d, 1544+1679+914=4137dmg, 4+1+4=9a, 9+7+4=20hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199067959748';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map4, v_player, v_team_hizalanamayanlar, '76561199067959748', 'Tezcan', 37, 49, 9, 20, ROUND(4137.0 / 62, 1), 4137, 0, 0);

  -- Taksici (76561199045061644): 8+1+3=12k, 19+17+21=57d, 741+228+331=1300dmg, 0+2+2=4a, 3+0+2=5hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199045061644';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map4, v_player, v_team_hizalanamayanlar, '76561199045061644', 'Taksici', 12, 57, 4, 5, ROUND(1300.0 / 62, 1), 1300, 0, 0);

  -- ============================================================
  -- MATCH 5: GEGENPRES vs BHEAMB
  -- GEGEN wins 3-0 (dust2 13-10, mirage 22-20, inferno 13-2)
  -- Total rounds: 23 + 42 + 15 = 80
  -- ============================================================
  INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
  VALUES (v_team_gegen, v_team_bheamb, 'FINISHED', '2026-03-23', v_team_gegen, 3, 0)
  RETURNING id INTO v_match5;

  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played)
  VALUES (v_match5, 'series', 1, 3, 0, 80)
  RETURNING id INTO v_map5;

  -- GEGENPRES players (team_TRader_OK / team_JakieS across maps)
  -- JakieS (76561199120455536): 41+71+24=136k, 17+32+8=57d, 4144+7567+2807=14518dmg, 7+13+12=32a, 21+34+11=66hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199120455536';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map5, v_player, v_team_gegen, '76561199120455536', 'JakieS', 136, 57, 32, 66, ROUND(14518.0 / 80, 1), 14518, 0, 0);

  -- Pac (76561198192462155): 24+30+22=76k, 16+36+8=60d, 2882+3572+1973=8427dmg, 11+12+1=24a, 15+14+9=38hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198192462155';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map5, v_player, v_team_gegen, '76561198192462155', 'Pac', 76, 60, 24, 38, ROUND(8427.0 / 80, 1), 8427, 0, 0);

  -- Altar'ın Oğlu Tarkan (AS) (76561198160862027): 17+0+7=24k, 13+0+7=20d, 1376+0+484=1860dmg, 3+0+0=3a, 6+0+2=8hs
  -- Note: This player only appears in map 1 and map 3 (not in map 2 mirage). Vandetta replaced him.
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198160862027';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map5, v_player, v_team_gegen, '76561198160862027', 'Altar''Altar''ın Oğlu Tarkan (AS)', 24, 20, 3, 8, ROUND(1860.0 / 80, 1), 1860, 0, 0);

  -- BENETO (ECK) (76561198372270608): 11+14+0=25k, 14+32+0=46d, 1442+1411+0=2853dmg, 9+3+0=12a, 5+4+0=9hs
  -- Note: appears in map 1 and map 2 only
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198372270608';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map5, v_player, v_team_gegen, '76561198372270608', 'BENETO (ECK)', 25, 46, 12, 9, ROUND(2853.0 / 80, 1), 2853, 0, 0);

  -- TRader (OK) (76561198350960783): 8+5+4=17k, 19+39+11=69d, 841+733+415=1989dmg, 4+6+3=13a, 3+1+0=4hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198350960783';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map5, v_player, v_team_gegen, '76561198350960783', 'TRader (OK)', 17, 69, 13, 4, ROUND(1989.0 / 80, 1), 1989, 0, 0);

  -- Vandetta (F. T) (76561198967300942): 0+29+14=43k, 0+30+11=41d, 0+3039+1523=4562dmg, 0+9+4=13a, 0+11+8=19hs
  -- Note: appears in map 2 and map 3 only
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198967300942';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map5, v_player, v_team_gegen, '76561198967300942', 'Vandetta (F. T)', 43, 41, 13, 19, ROUND(4562.0 / 80, 1), 4562, 0, 0);

  -- BHEAMB players (team_MARATON / team_ across maps)
  -- karac4 (76561199487734872): 20+40+9=69k, 19+33+14=66d, 1884+4545+908=7337dmg, 4+11+2=17a, 7+21+7=35hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199487734872';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map5, v_player, v_team_bheamb, '76561199487734872', 'karac4', 69, 66, 17, 35, ROUND(7337.0 / 80, 1), 7337, 0, 0);

  -- 𝐓𝐞𝐜𝐡 (76561198973020202): 19+36+10=65k, 20+27+14=61d, 2331+4020+1204=7555dmg, 7+8+3=18a, 10+12+1=23hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198973020202';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map5, v_player, v_team_bheamb, '76561198973020202', '𝐓𝐞𝐜𝐡', 65, 61, 18, 23, ROUND(7555.0 / 80, 1), 7555, 0, 0);

  -- MARATON (76561198931423764): 16+39+11=66k, 22+31+15=68d, 1629+4191+1316=7136dmg, 3+6+2=11a, 10+23+6=39hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198931423764';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map5, v_player, v_team_bheamb, '76561198931423764', 'MARATON', 66, 68, 11, 39, ROUND(7136.0 / 80, 1), 7136, 0, 0);

  -- SİNYOR0 (76561198787017562): 11+36+8=55k, 21+25+14=60d, 1668+3630+1110=6408dmg, 12+10+5=27a, 4+18+6=28hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198787017562';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map5, v_player, v_team_bheamb, '76561198787017562', 'SİNYOR0', 55, 60, 27, 28, ROUND(6408.0 / 80, 1), 6408, 0, 0);

  -- KANTARES (76561199045769578): 10+17+7=34k, 19+35+14=68d, 685+1582+687=2954dmg, 1+8+2=11a, 4+3+3=10hs
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199045769578';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, mvps, score)
  VALUES (v_map5, v_player, v_team_bheamb, '76561199045769578', 'KANTARES', 34, 68, 11, 10, ROUND(2954.0 / 80, 1), 2954, 0, 0);

  RAISE NOTICE 'Successfully imported 5 matches with aggregated player stats.';
  RAISE NOTICE 'Match 1: AK47 SUPPLIERS 0-3 CRIMSON REAPERS';
  RAISE NOTICE 'Match 2: METAL DIVISION 3-0 BusCourney';
  RAISE NOTICE 'Match 3: ŞIKLATANLAR 1-2 BÖRÜ';
  RAISE NOTICE 'Match 4: BLACK MAMBA 3-0 Hizalanamayanlar';
  RAISE NOTICE 'Match 5: GEGENPRES 3-0 BHEAMB';

END $$;
