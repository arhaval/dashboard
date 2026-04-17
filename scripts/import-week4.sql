-- HAFTA 4 VERİLERİ - CS2 TURNUVA
-- Tarih: 2026-04-07
-- 4 oynandı, 1 ertelendi (CRIMSON vs SIKLATANLAR)
-- ADR = damage_dealt / total_rounds

BEGIN;

-- Önce: 5. Hafta'daki placeholder PENDING maçları temizle
DELETE FROM cs2_matches
WHERE status = 'PENDING'
AND match_date::date IN ('2026-04-07', '2026-04-02')
AND NOT (
  -- SIKLATANLAR vs BusCourney (2. hafta ertelenen, korunacak)
  (team1_id = (SELECT id FROM cs2_teams WHERE name = 'SIKLATANLAR')
   AND team2_id = (SELECT id FROM cs2_teams WHERE name = 'BusCourney'))
  OR
  (team1_id = (SELECT id FROM cs2_teams WHERE name = 'BusCourney')
   AND team2_id = (SELECT id FROM cs2_teams WHERE name = 'SIKLATANLAR'))
);

DO $$
DECLARE
  t_metal UUID; t_mamba UUID; t_ak47 UUID; t_busc UUID;
  t_bheamb UUID; t_hizal UUID; t_gegen UUID; t_boru UUID;
  t_crimson UUID; t_sik UUID;
  m1 UUID; m2 UUID; m3 UUID; m4 UUID; m5 UUID;
  map1 UUID; map2 UUID; map3 UUID; map4 UUID;
  v_player UUID;
BEGIN
  SELECT id INTO t_metal FROM cs2_teams WHERE name = 'METAL DIVISION';
  SELECT id INTO t_mamba FROM cs2_teams WHERE name = 'BLACK MAMBA';
  SELECT id INTO t_ak47 FROM cs2_teams WHERE name = 'AK47 SUPPLIERS';
  SELECT id INTO t_busc FROM cs2_teams WHERE name = 'BusCourney';
  SELECT id INTO t_bheamb FROM cs2_teams WHERE name = 'BHEAMB';
  SELECT id INTO t_hizal FROM cs2_teams WHERE name = 'Hizalanamayanlar';
  SELECT id INTO t_gegen FROM cs2_teams WHERE name = 'GEGENPRES';
  SELECT id INTO t_boru FROM cs2_teams WHERE name = 'Börü';
  SELECT id INTO t_crimson FROM cs2_teams WHERE name = 'CRIMSON REAPERS';
  SELECT id INTO t_sik FROM cs2_teams WHERE name = 'SIKLATANLAR';

  -- Yeni oyuncu kayıtları (hafta 4'te ilk kez oynayanlar)
  INSERT INTO cs2_players (team_id, name, steam_id)
  VALUES (t_metal, 'RİP', '76561199428106666')
  ON CONFLICT (steam_id) DO NOTHING;

  INSERT INTO cs2_players (team_id, name, steam_id)
  VALUES (t_mamba, 'Ozibaba', '76561199037532344')
  ON CONFLICT (steam_id) DO NOTHING;

  -- ==========================================
  -- MATCH 1: METAL DIVISION 3-0 BLACK MAMBA
  -- Map1: dust2 13-6 (19r) | Map2: inferno 13-7 (20r) | Map3: ancient 13-0 (13r)
  -- Toplam: 52 round
  -- ==========================================
  INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
  VALUES (t_metal, t_mamba, 'FINISHED', '2026-04-07', t_metal, 3, 0)
  RETURNING id INTO m1;

  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status)
  VALUES (m1, 'series', 1, 3, 0, 52, t_metal, 'FINISHED')
  RETURNING id INTO map1;

  -- METAL DIVISION oyuncuları (52 round)
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198333867003';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map1, v_player, t_metal, '76561198333867003', 'Alucard', 55, 37, 18, 38, ROUND(5952.0 / 52, 1), 5952, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199104832590';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map1, v_player, t_metal, '76561199104832590', 'Greaw', 55, 20, 11, 17, ROUND(5088.0 / 52, 1), 5088, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199428106666';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map1, v_player, t_metal, '76561199428106666', 'RİP', 52, 23, 21, 14, ROUND(5271.0 / 52, 1), 5271, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198452210637';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map1, v_player, t_metal, '76561198452210637', 'MayoNeTT', 48, 25, 15, 19, ROUND(4735.0 / 52, 1), 4735, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199001198568';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map1, v_player, t_metal, '76561199001198568', 'FARKETMEZ.cc', 25, 21, 13, 16, ROUND(2726.0 / 52, 1), 2726, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- BLACK MAMBA oyuncuları (52 round)
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199559185953';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map1, v_player, t_mamba, '76561199559185953', 'GÜLLÜ', 35, 49, 7, 14, ROUND(4133.0 / 52, 1), 4133, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198955462483';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map1, v_player, t_mamba, '76561198955462483', 'Fatih', 31, 46, 7, 16, ROUND(3483.0 / 52, 1), 3483, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199059099181';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map1, v_player, t_mamba, '76561199059099181', 'XANAX-1mg', 28, 49, 10, 8, ROUND(3352.0 / 52, 1), 3352, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199037532344';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map1, v_player, t_mamba, '76561199037532344', 'Ozibaba', 22, 46, 8, 10, ROUND(2737.0 / 52, 1), 2737, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198386239863';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map1, v_player, t_mamba, '76561198386239863', 'TheJaveLin', 8, 48, 5, 2, ROUND(1260.0 / 52, 1), 1260, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- ==========================================
  -- MATCH 2: AK47 SUPPLIERS 3-0 BusCourney
  -- Map1: dust2 13-4 (17r) | Map2: mirage 13-5 (18r) | Map3: inferno 13-6 (19r)
  -- Toplam: 54 round
  -- ==========================================
  INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
  VALUES (t_ak47, t_busc, 'FINISHED', '2026-04-07', t_ak47, 3, 0)
  RETURNING id INTO m2;

  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status)
  VALUES (m2, 'series', 1, 3, 0, 54, t_ak47, 'FINISHED')
  RETURNING id INTO map2;

  -- AK47 SUPPLIERS oyuncuları (54 round)
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199099964835';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map2, v_player, t_ak47, '76561199099964835', 'Ryuka', 73, 31, 14, 42, ROUND(7202.0 / 54, 1), 7202, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198310852022';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map2, v_player, t_ak47, '76561198310852022', 'BEDOOO', 65, 29, 19, 17, ROUND(6926.0 / 54, 1), 6926, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199226019040';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map2, v_player, t_ak47, '76561199226019040', 'ARKANTOS', 33, 28, 19, 10, ROUND(4074.0 / 54, 1), 4074, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198153053788';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map2, v_player, t_ak47, '76561198153053788', 'aim kaydi dilek tut', 32, 33, 15, 17, ROUND(3235.0 / 54, 1), 3235, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198796358007';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map2, v_player, t_ak47, '76561198796358007', 'G.H.O.S.T.', 28, 33, 14, 12, ROUND(2841.0 / 54, 1), 2841, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- BusCourney oyuncuları (54 round)
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198324665466';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map2, v_player, t_busc, '76561198324665466', 'TERMINATOR', 45, 42, 12, 22, ROUND(5368.0 / 54, 1), 5368, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198367283733';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map2, v_player, t_busc, '76561198367283733', 'CANTURK', 38, 47, 14, 11, ROUND(4462.0 / 54, 1), 4462, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198284365406';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map2, v_player, t_busc, '76561198284365406', 'smoothopeerator', 29, 46, 6, 15, ROUND(2817.0 / 54, 1), 2817, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198074442660';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map2, v_player, t_busc, '76561198074442660', 'Nightwatch', 25, 50, 9, 8, ROUND(3361.0 / 54, 1), 3361, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198191104478';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map2, v_player, t_busc, '76561198191104478', 'ELektroBEyiN', 16, 51, 11, 8, ROUND(2494.0 / 54, 1), 2494, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- ==========================================
  -- MATCH 3: BHEAMB 3-0 Hizalanamayanlar
  -- Map1: dust2 13-4 (17r) | Map2: anubis 13-1 (14r) | Map3: inferno 13-1 (14r)
  -- Toplam: 45 round
  -- ==========================================
  INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
  VALUES (t_bheamb, t_hizal, 'FINISHED', '2026-04-07', t_bheamb, 3, 0)
  RETURNING id INTO m3;

  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status)
  VALUES (m3, 'series', 1, 3, 0, 45, t_bheamb, 'FINISHED')
  RETURNING id INTO map3;

  -- BHEAMB oyuncuları (45 round)
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199487734872';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map3, v_player, t_bheamb, '76561199487734872', 'karac4', 74, 15, 12, 35, ROUND(6432.0 / 45, 1), 6432, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198931423764';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map3, v_player, t_bheamb, '76561198931423764', 'MARATON', 41, 25, 11, 24, ROUND(4377.0 / 45, 1), 4377, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198787017562';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map3, v_player, t_bheamb, '76561198787017562', 'SİNYOR0', 39, 23, 18, 19, ROUND(4186.0 / 45, 1), 4186, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198973020202';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map3, v_player, t_bheamb, '76561198973020202', 'Tech', 35, 27, 19, 14, ROUND(4030.0 / 45, 1), 4030, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199667420627';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map3, v_player, t_bheamb, '76561199667420627', 'gmert0712', 24, 24, 11, 10, ROUND(2698.0 / 45, 1), 2698, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- Hizalanamayanlar oyuncuları (45 round)
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198157758327';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map3, v_player, t_hizal, '76561198157758327', 'Murat', 32, 41, 8, 13, ROUND(3612.0 / 45, 1), 3612, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199099758701';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map3, v_player, t_hizal, '76561199099758701', 'Bahattin', 25, 44, 13, 6, ROUND(3470.0 / 45, 1), 3470, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199067959748';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map3, v_player, t_hizal, '76561199067959748', 'Tezcan', 24, 42, 5, 10, ROUND(2519.0 / 45, 1), 2519, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198930081296';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map3, v_player, t_hizal, '76561198930081296', 'Kamil', 19, 43, 7, 12, ROUND(2207.0 / 45, 1), 2207, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198177045161';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map3, v_player, t_hizal, '76561198177045161', 'Laz Recep', 8, 44, 6, 3, ROUND(1315.0 / 45, 1), 1315, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- ==========================================
  -- MATCH 4: GEGENPRES 2-1 Börü
  -- Map1: dust2 13-9 (22r) | Map2: inferno 13-5 (18r) | Map3: nuke 10-13 (23r)
  -- Toplam: 63 round
  -- ==========================================
  INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
  VALUES (t_gegen, t_boru, 'FINISHED', '2026-04-07', t_gegen, 2, 1)
  RETURNING id INTO m4;

  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status)
  VALUES (m4, 'series', 1, 2, 1, 63, t_gegen, 'FINISHED')
  RETURNING id INTO map4;

  -- GEGENPRES oyuncuları (63 round)
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199120455536';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map4, v_player, t_gegen, '76561199120455536', 'Jackies', 91, 42, 16, 42, ROUND(9576.0 / 63, 1), 9576, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198192462155';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map4, v_player, t_gegen, '76561198192462155', 'Pac', 81, 43, 16, 40, ROUND(8520.0 / 63, 1), 8520, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198967300942';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map4, v_player, t_gegen, '76561198967300942', 'Vendetta', 35, 47, 17, 18, ROUND(4079.0 / 63, 1), 4079, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198160862027';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map4, v_player, t_gegen, '76561198160862027', 'Altarin oglu Tarkan', 27, 42, 6, 14, ROUND(2720.0 / 63, 1), 2720, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198350960783';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map4, v_player, t_gegen, '76561198350960783', 'Trader', 16, 45, 8, 5, ROUND(1770.0 / 63, 1), 1770, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- Börü oyuncuları (63 round)
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198332518466';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map4, v_player, t_boru, '76561198332518466', 'L3o', 79, 42, 13, 25, ROUND(7655.0 / 63, 1), 7655, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198033678583';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map4, v_player, t_boru, '76561198033678583', 'Chedjou', 61, 50, 16, 19, ROUND(6517.0 / 63, 1), 6517, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198867919247';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map4, v_player, t_boru, '76561198867919247', 'Toska', 36, 51, 13, 19, ROUND(4051.0 / 63, 1), 4051, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199051795583';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map4, v_player, t_boru, '76561199051795583', 'f1st_k', 22, 53, 18, 14, ROUND(3245.0 / 63, 1), 3245, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199401287389';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map4, v_player, t_boru, '76561199401287389', 'Natural Intelligence', 17, 54, 5, 12, ROUND(2010.0 / 63, 1), 2010, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- ==========================================
  -- ERTELENEN MAÇ: CRIMSON REAPERS vs SIKLATANLAR
  -- ==========================================
  INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, notes)
  VALUES (t_crimson, t_sik, 'PENDING', '2026-04-07', 'Ertelendi');

  RAISE NOTICE '4. Hafta import tamamlandı: 4 maç oynandı, 1 ertelendi';
END $$;

COMMIT;
