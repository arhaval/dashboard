-- HAFTA 1 VERİLERİ - TEMİZ YÜKLEME
-- Önce eski verileri temizle
BEGIN;

DELETE FROM cs2_match_players;
DELETE FROM cs2_match_maps;
DELETE FROM cs2_matches WHERE status IN ('FINISHED', 'CANCELLED', 'LIVE');

-- Takım ID'lerini al
DO $$
DECLARE
  t_sik UUID; t_boru UUID; t_crimson UUID; t_ak47 UUID;
  t_gegen UUID; t_bheamb UUID; t_mamba UUID; t_hizal UUID;
  t_metal UUID; t_busc UUID;
  m1 UUID; m2 UUID; m3 UUID; m4 UUID; m5 UUID;
  map1 UUID; map2 UUID; map3 UUID; map4 UUID; map5 UUID;
  v_player UUID;
BEGIN
  SELECT id INTO t_sik FROM cs2_teams WHERE name = 'SIKLATANLAR';
  SELECT id INTO t_boru FROM cs2_teams WHERE name = 'BORU';
  SELECT id INTO t_crimson FROM cs2_teams WHERE name = 'CRIMSON REAPERS';
  SELECT id INTO t_ak47 FROM cs2_teams WHERE name = 'AK47 SUPPLIERS';
  SELECT id INTO t_gegen FROM cs2_teams WHERE name = 'GEGENPRES';
  SELECT id INTO t_bheamb FROM cs2_teams WHERE name = 'BHEAMB';
  SELECT id INTO t_mamba FROM cs2_teams WHERE name = 'BLACK MAMBA';
  SELECT id INTO t_hizal FROM cs2_teams WHERE name = 'Hizalanamayanlar';
  SELECT id INTO t_metal FROM cs2_teams WHERE name = 'METAL DIVISION';
  SELECT id INTO t_busc FROM cs2_teams WHERE name = 'BusCourney';

  -- ==========================================
  -- MATCH 1: SIKLATANLAR 2-1 BORU
  -- ==========================================
  INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
  VALUES (t_sik, t_boru, 'FINISHED', '2026-03-23', t_sik, 2, 1)
  RETURNING id INTO m1;

  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status)
  VALUES (m1, 'series', 1, 2, 1, 58, t_sik, 'FINISHED')
  RETURNING id INTO map1;

  -- SIKLATANLAR players (3 maps, 58 rounds)
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198298585328';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map1, v_player, t_sik, '76561198298585328', 'Aibo', 60, 44, 15, 36, 6242, ROUND(6242.0/58, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198341920431';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map1, v_player, t_sik, '76561198341920431', 'TRrosh', 59, 36, 16, 22, 5753, ROUND(5753.0/58, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199879135591';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map1, v_player, t_sik, '76561199879135591', 'PyRo', 42, 37, 11, 12, 4155, ROUND(4155.0/58, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198847238087';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map1, v_player, t_sik, '76561198847238087', 'MHK', 33, 46, 17, 6, 4202, ROUND(4202.0/58, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198227665824';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map1, v_player, t_sik, '76561198227665824', 'BLACKBIRD', 30, 36, 10, 14, 3090, ROUND(3090.0/58, 1), 3, 0, 0);

  -- BORU players (3 maps, 58 rounds)
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198332518466';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map1, v_player, t_boru, '76561198332518466', 'L3o', 73, 36, 11, 22, 6951, ROUND(6951.0/58, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198867919247';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map1, v_player, t_boru, '76561198867919247', 'Toska', 48, 46, 12, 29, 5611, ROUND(5611.0/58, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198033678583';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map1, v_player, t_boru, '76561198033678583', 'Chedjou', 43, 46, 16, 15, 5764, ROUND(5764.0/58, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199110867495';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map1, v_player, t_boru, '76561199110867495', 'Saul_Goodman', 21, 47, 10, 8, 2451, ROUND(2451.0/58, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199401287389';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map1, v_player, t_boru, '76561199401287389', 'Natural Intelligence', 9, 51, 8, 7, 1643, ROUND(1643.0/58, 1), 3, 0, 0);

  -- ==========================================
  -- MATCH 2: CRIMSON REAPERS 3-0 AK47 SUPPLIERS
  -- ==========================================
  INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
  VALUES (t_crimson, t_ak47, 'FINISHED', '2026-03-23', t_crimson, 3, 0)
  RETURNING id INTO m2;

  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status)
  VALUES (m2, 'series', 1, 3, 0, 42, t_crimson, 'FINISHED')
  RETURNING id INTO map2;

  -- CRIMSON players (3 maps, 42 rounds)
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198380002468';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map2, v_player, t_crimson, '76561198380002468', 'DAYI', 57, 23, 14, 40, 5662, ROUND(5662.0/42, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198044432985';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map2, v_player, t_crimson, '76561198044432985', 'OGZK', 50, 13, 13, 12, 4543, ROUND(4543.0/42, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198074087741';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map2, v_player, t_crimson, '76561198074087741', 'Electronica', 38, 10, 13, 22, 3733, ROUND(3733.0/42, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198134625951';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map2, v_player, t_crimson, '76561198134625951', 'Captain', 34, 15, 12, 16, 3707, ROUND(3707.0/42, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198340882003';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map2, v_player, t_crimson, '76561198340882003', 'Mr.Boombastic', 26, 15, 15, 6, 2934, ROUND(2934.0/42, 1), 3, 0, 0);

  -- AK47 players (3 maps, 42 rounds)
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198310852022';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map2, v_player, t_ak47, '76561198310852022', 'BEDOOO', 24, 41, 8, 17, 3643, ROUND(3643.0/42, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198153053788';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map2, v_player, t_ak47, '76561198153053788', 'aim kaydi dilek tut', 16, 40, 4, 9, 2148, ROUND(2148.0/42, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198796358007';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map2, v_player, t_ak47, '76561198796358007', 'G.H.O.S.T.', 15, 41, 3, 11, 1742, ROUND(1742.0/42, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199226019040';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map2, v_player, t_ak47, '76561199226019040', 'ARKANTOS', 13, 42, 7, 7, 1997, ROUND(1997.0/42, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198295103268';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map2, v_player, t_ak47, '76561198295103268', 'settingler', 6, 41, 1, 2, 703, ROUND(703.0/42, 1), 3, 0, 0);

  -- ==========================================
  -- MATCH 3: GEGENPRES 2-1 BHEAMB
  -- ==========================================
  INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
  VALUES (t_gegen, t_bheamb, 'FINISHED', '2026-03-23', t_gegen, 2, 1)
  RETURNING id INTO m3;

  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status)
  VALUES (m3, 'series', 1, 2, 1, 80, t_gegen, 'FINISHED')
  RETURNING id INTO map3;

  -- GEGENPRES players
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199120455536';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map3, v_player, t_gegen, '76561199120455536', 'JakieS', 136, 57, 32, 66, 14518, ROUND(14518.0/80, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198192462155';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map3, v_player, t_gegen, '76561198192462155', 'Pac', 76, 60, 24, 38, 8427, ROUND(8427.0/80, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198967300942';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map3, v_player, t_gegen, '76561198967300942', 'Vendetta', 43, 41, 13, 19, 4562, ROUND(4562.0/57, 1), 2, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198372270608';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map3, v_player, t_gegen, '76561198372270608', 'BENETO', 25, 46, 12, 9, 2853, ROUND(2853.0/65, 1), 2, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198160862027';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map3, v_player, t_gegen, '76561198160862027', 'Altarin oglu Tarkan', 24, 20, 3, 8, 1860, ROUND(1860.0/38, 1), 2, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198350960783';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map3, v_player, t_gegen, '76561198350960783', 'TRader', 17, 69, 13, 4, 1989, ROUND(1989.0/80, 1), 3, 0, 0);

  -- BHEAMB players (3 maps, 80 rounds)
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199487734872';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map3, v_player, t_bheamb, '76561199487734872', 'Halil-Karac4', 69, 66, 17, 35, 7337, ROUND(7337.0/80, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198931423764';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map3, v_player, t_bheamb, '76561198931423764', 'MARATON', 66, 68, 11, 39, 7136, ROUND(7136.0/80, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198973020202';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map3, v_player, t_bheamb, '76561198973020202', 'Tech', 65, 61, 18, 23, 7555, ROUND(7555.0/80, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198787017562';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map3, v_player, t_bheamb, '76561198787017562', 'SINYOR0', 55, 60, 27, 28, 6408, ROUND(6408.0/80, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199045769578';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map3, v_player, t_bheamb, '76561199045769578', 'KANTARES', 34, 68, 11, 10, 2954, ROUND(2954.0/80, 1), 3, 0, 0);

  -- ==========================================
  -- MATCH 4: BLACK MAMBA 3-0 Hizalanamayanlar
  -- ==========================================
  INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
  VALUES (t_mamba, t_hizal, 'FINISHED', '2026-03-23', t_mamba, 3, 0)
  RETURNING id INTO m4;

  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status)
  VALUES (m4, 'series', 1, 3, 0, 62, t_mamba, 'FINISHED')
  RETURNING id INTO map4;

  -- BLACK MAMBA players (3 maps, 62 rounds)
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199559185953';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map4, v_player, t_mamba, '76561199559185953', 'GULLU', 75, 50, 24, 34, 8336, ROUND(8336.0/62, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199059099181';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map4, v_player, t_mamba, '76561199059099181', 'XANAX-1mg', 71, 42, 21, 23, 7586, ROUND(7586.0/62, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198955462483';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map4, v_player, t_mamba, '76561198955462483', 'Fatih', 63, 30, 15, 35, 5705, ROUND(5705.0/62, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199380502718';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map4, v_player, t_mamba, '76561199380502718', 'APOLLO', 28, 37, 18, 8, 3358, ROUND(3358.0/62, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198386239863';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map4, v_player, t_mamba, '76561198386239863', 'TheJaveLin', 8, 46, 12, 3, 1369, ROUND(1369.0/62, 1), 3, 0, 0);

  -- Hizalanamayanlar players (3 maps, 62 rounds)
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198157758327';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map4, v_player, t_hizal, '76561198157758327', 'Murat', 65, 48, 20, 21, 7770, ROUND(7770.0/62, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199099758701';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map4, v_player, t_hizal, '76561199099758701', 'Bahattin', 54, 45, 16, 19, 6303, ROUND(6303.0/62, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199067959748';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map4, v_player, t_hizal, '76561199067959748', 'Tezcan', 37, 49, 9, 20, 4137, ROUND(4137.0/62, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198930081296';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map4, v_player, t_hizal, '76561198930081296', 'Kamil', 32, 52, 14, 15, 3742, ROUND(3742.0/62, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199045061644';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map4, v_player, t_hizal, '76561199045061644', 'Zeki', 12, 57, 4, 5, 1300, ROUND(1300.0/62, 1), 3, 0, 0);

  -- ==========================================
  -- MATCH 5: METAL DIVISION 3-0 BusCourney
  -- ==========================================
  INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
  VALUES (t_metal, t_busc, 'FINISHED', '2026-03-23', t_metal, 3, 0)
  RETURNING id INTO m5;

  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status)
  VALUES (m5, 'series', 1, 3, 0, 46, t_metal, 'FINISHED')
  RETURNING id INTO map5;

  -- METAL players (3 maps, 46 rounds)
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199104832590';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map5, v_player, t_metal, '76561199104832590', 'Greaw', 63, 18, 10, 25, 5683, ROUND(5683.0/46, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198452210637';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map5, v_player, t_metal, '76561198452210637', 'MayoNeTT', 53, 29, 20, 24, 5940, ROUND(5940.0/46, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198333867003';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map5, v_player, t_metal, '76561198333867003', 'Alucard', 44, 32, 11, 33, 4520, ROUND(4520.0/46, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199001198568';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map5, v_player, t_metal, '76561199001198568', 'FARKETMEZ.cc', 33, 19, 10, 15, 3129, ROUND(3129.0/46, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198376809576';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map5, v_player, t_metal, '76561198376809576', 'Pasuel', 23, 21, 10, 11, 2797, ROUND(2797.0/46, 1), 3, 0, 0);

  -- BusCourney players (3 maps, 46 rounds)
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198324665466';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map5, v_player, t_busc, '76561198324665466', 'TERMINATOR', 49, 42, 7, 22, 5697, ROUND(5697.0/46, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198074442660';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map5, v_player, t_busc, '76561198074442660', 'Nightwatch', 22, 45, 6, 9, 2334, ROUND(2334.0/46, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198367283733';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map5, v_player, t_busc, '76561198367283733', 'CANTURK', 16, 44, 9, 6, 2790, ROUND(2790.0/46, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198284365406';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map5, v_player, t_busc, '76561198284365406', 'smoothopeerator', 13, 43, 7, 6, 1734, ROUND(1734.0/46, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198191104478';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map5, v_player, t_busc, '76561198191104478', 'ELektroBEyiN', 13, 44, 7, 8, 1944, ROUND(1944.0/46, 1), 3, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198312386439';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map5, v_player, t_busc, '76561198312386439', 'ATO', 0, 0, 0, 0, 0, 0, 0, 0, 0);

  -- ATO ve RIP BusCourney'den oynamamış (CSV'de yok), Ryuka ve BABACAGRI da yok
  -- Bunlar yedek — kayıt oluşturulmaz

  RAISE NOTICE 'Successfully imported 5 matches with corrected data';
  RAISE NOTICE 'Match 1: SIKLATANLAR 2-1 BORU';
  RAISE NOTICE 'Match 2: CRIMSON REAPERS 3-0 AK47 SUPPLIERS';
  RAISE NOTICE 'Match 3: GEGENPRES 2-1 BHEAMB';
  RAISE NOTICE 'Match 4: BLACK MAMBA 3-0 Hizalanamayanlar';
  RAISE NOTICE 'Match 5: METAL DIVISION 3-0 BusCourney';
END $$;

COMMIT;
