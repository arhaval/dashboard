-- HAFTA 3 VERİLERİ - CS2 TURNUVA
-- Tarih: 2026-04-01
-- 4 maç (3 oynandı, 1 ertelendi)
-- ADR = damage_dealt / total_rounds (MatchZy N-1 düzeltmesi: +1 per map)
BEGIN;

DO $$
DECLARE
  t_gegen UUID; t_sik UUID; t_crimson UUID; t_metal UUID;
  t_ak47 UUID; t_hizal UUID; t_boru UUID; t_busc UUID;
  t_mamba UUID; t_bheamb UUID;
  m1 UUID; m2 UUID; m3 UUID; m4 UUID;
  map1 UUID; map2 UUID; map3 UUID; map4 UUID;
  v_player UUID;
BEGIN
  -- Takım ID'lerini al
  SELECT id INTO t_gegen FROM cs2_teams WHERE name = 'GEGENPRES';
  SELECT id INTO t_sik FROM cs2_teams WHERE name = 'SIKLATANLAR';
  SELECT id INTO t_crimson FROM cs2_teams WHERE name = 'CRIMSON REAPERS';
  SELECT id INTO t_metal FROM cs2_teams WHERE name = 'METAL DIVISION';
  SELECT id INTO t_ak47 FROM cs2_teams WHERE name = 'AK47 SUPPLIERS';
  SELECT id INTO t_hizal FROM cs2_teams WHERE name = 'Hizalanamayanlar';
  SELECT id INTO t_boru FROM cs2_teams WHERE name = 'Börü';
  SELECT id INTO t_busc FROM cs2_teams WHERE name = 'BusCourney';
  SELECT id INTO t_mamba FROM cs2_teams WHERE name = 'BLACK MAMBA';
  SELECT id INTO t_bheamb FROM cs2_teams WHERE name = 'BHEAMB';

  -- ==========================================
  -- MATCH 1: GEGENPRES 3-0 SIKLATANLAR
  -- Map1: de_dust2 13-9 (21+1=22 rounds)
  -- Map2: de_inferno 13-5 (17+1=18 rounds)
  -- Map3: de_mirage 13-7 (19+1=20 rounds)
  -- Total: 22+18+20 = 60 rounds
  -- ==========================================
  INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
  VALUES (t_gegen, t_sik, 'FINISHED', '2026-04-01', t_gegen, 3, 0)
  RETURNING id INTO m1;

  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status)
  VALUES (m1, 'series', 1, 3, 0, 60, t_gegen, 'FINISHED')
  RETURNING id INTO map1;

  -- GEGENPRES players
  -- JakieS: 3 maps, 75K/37D/15A/7547dmg/41hs, rounds=60
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199120455536';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map1, v_player, t_gegen, '76561199120455536', 'JakieS', 75, 37, 15, 41, 7547, ROUND(7547.0/60, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- Pac: 3 maps, 69K/38D/24A/7623dmg/32hs, rounds=60
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198192462155';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map1, v_player, t_gegen, '76561198192462155', 'Pac', 69, 38, 24, 32, 7623, ROUND(7623.0/60, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- BENETO: 3 maps, 44K/38D/13A/4322dmg/12hs, rounds=60
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198372270608';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map1, v_player, t_gegen, '76561198372270608', 'BENETO', 44, 38, 13, 12, 4322, ROUND(4322.0/60, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- Vandetta: 3 maps, 31K/44D/22A/3741dmg/12hs, rounds=60
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198967300942';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map1, v_player, t_gegen, '76561198967300942', 'Vandetta', 31, 44, 22, 12, 3741, ROUND(3741.0/60, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- Altar: 3 maps, 32K/43D/10A/3012dmg/15hs, rounds=60
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198160862027';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map1, v_player, t_gegen, '76561198160862027', 'Altar', 32, 43, 10, 15, 3012, ROUND(3012.0/60, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- SIKLATANLAR players
  -- Aibo: 3 maps, 58K/51D/24A/6757dmg/34hs, rounds=60
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198298585328';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map1, v_player, t_sik, '76561198298585328', 'Aibo', 58, 51, 24, 34, 6757, ROUND(6757.0/60, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- TRrosh: 3 maps, 52K/49D/18A/6040dmg/24hs, rounds=60
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198341920431';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map1, v_player, t_sik, '76561198341920431', 'TRrosh', 52, 49, 18, 24, 6040, ROUND(6040.0/60, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- PyRo: 3 maps, 35K/52D/12A/3759dmg/18hs, rounds=60
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199879135591';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map1, v_player, t_sik, '76561199879135591', 'PyRo', 35, 52, 12, 18, 3759, ROUND(3759.0/60, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- BLACKBIRD: 3 maps, 24K/50D/9A/2970dmg/12hs, rounds=60
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198227665824';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map1, v_player, t_sik, '76561198227665824', 'BLACKBIRD', 24, 50, 9, 12, 2970, ROUND(2970.0/60, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- Sharpe: 3 maps, 23K/55D/6A/2395dmg/12hs, rounds=60
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198126178777';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map1, v_player, t_sik, '76561198126178777', 'Sharpe', 23, 55, 6, 12, 2395, ROUND(2395.0/60, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- ==========================================
  -- MATCH 2: CRIMSON REAPERS 2-1 METAL DIVISION
  -- Map1: de_dust2 13-7 (19+1=20 rounds)
  -- Map2: de_nuke 13-9 (21+1=22 rounds)
  -- Map3: de_inferno 16-12 OT (27+1=28 rounds)
  -- Total: 20+22+28 = 70 rounds
  -- ==========================================
  INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
  VALUES (t_crimson, t_metal, 'FINISHED', '2026-04-01', t_crimson, 2, 1)
  RETURNING id INTO m2;

  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status)
  VALUES (m2, 'series', 1, 2, 1, 70, t_crimson, 'FINISHED')
  RETURNING id INTO map2;

  -- CRIMSON REAPERS players
  -- Electronica: 3 maps, 69K/41D/13A/6887dmg/39hs, rounds=70
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198074087741';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map2, v_player, t_crimson, '76561198074087741', 'Electronica', 69, 41, 13, 39, 6887, ROUND(6887.0/70, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- DAYI: 3 maps, 52K/53D/19A/5906dmg/31hs, rounds=70
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198380002468';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map2, v_player, t_crimson, '76561198380002468', 'DAYI', 52, 53, 19, 31, 5906, ROUND(5906.0/70, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- Captain: 3 maps, 50K/46D/18A/4999dmg/29hs, rounds=70
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198134625951';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map2, v_player, t_crimson, '76561198134625951', 'Captain', 50, 46, 18, 29, 4999, ROUND(4999.0/70, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- OGZK: 3 maps, 45K/49D/21A/5625dmg/13hs, rounds=70
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198044432985';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map2, v_player, t_crimson, '76561198044432985', 'OGZK', 45, 49, 21, 13, 5625, ROUND(5625.0/70, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- Mr.Boombastic: 3 maps, 26K/55D/10A/3349dmg/9hs, rounds=70
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198340882003';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map2, v_player, t_crimson, '76561198340882003', 'Mr.Boombastic', 26, 55, 10, 9, 3349, ROUND(3349.0/70, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- METAL DIVISION players
  -- Greaw: 3 maps, 65K/45D/5A/6149dmg/18hs, rounds=70
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199104832590';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map2, v_player, t_metal, '76561199104832590', 'Greaw', 65, 45, 5, 18, 6149, ROUND(6149.0/70, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- Alucard: 3 maps, 51K/63D/24A/6743dmg/34hs, rounds=70
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198333867003';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map2, v_player, t_metal, '76561198333867003', 'Alucard', 51, 63, 24, 34, 6743, ROUND(6743.0/70, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- MayoNeTT: 3 maps, 47K/54D/20A/6511dmg/21hs, rounds=70
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198452210637';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map2, v_player, t_metal, '76561198452210637', 'MayoNeTT', 47, 54, 20, 21, 6511, ROUND(6511.0/70, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- FARKETMEZ: 3 maps, 41K/42D/15A/4116dmg/18hs, rounds=70
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199001198568';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map2, v_player, t_metal, '76561199001198568', 'FARKETMEZ', 41, 42, 15, 18, 4116, ROUND(4116.0/70, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- Pasuel: 3 maps, 35K/41D/15A/3534dmg/10hs, rounds=70
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198376809576';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map2, v_player, t_metal, '76561198376809576', 'Pasuel', 35, 41, 15, 10, 3534, ROUND(3534.0/70, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- ==========================================
  -- MATCH 3: AK47 SUPPLIERS 3-0 Hizalanamayanlar
  -- Map1: de_dust2 13-4 (16+1=17 rounds)
  -- Map2: de_mirage 13-3 (15+1=16 rounds)
  -- Map3: de_inferno 13-9 (21+1=22 rounds)
  -- Total: 17+16+22 = 55 rounds
  -- ==========================================
  INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
  VALUES (t_ak47, t_hizal, 'FINISHED', '2026-04-01', t_ak47, 3, 0)
  RETURNING id INTO m3;

  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status)
  VALUES (m3, 'series', 1, 3, 0, 55, t_ak47, 'FINISHED')
  RETURNING id INTO map3;

  -- AK47 SUPPLIERS players
  -- Ryuka: 3 maps, 73K/28D/13A/6689dmg/44hs, rounds=55
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199099964835';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map3, v_player, t_ak47, '76561199099964835', 'Ryuka', 73, 28, 13, 44, 6689, ROUND(6689.0/55, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- BEDOOO: 3 maps, 56K/29D/28A/6529dmg/10hs, rounds=55
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198310852022';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map3, v_player, t_ak47, '76561198310852022', 'BEDOOO', 56, 29, 28, 10, 6529, ROUND(6529.0/55, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- aimkaydi: 3 maps, 45K/31D/10A/4010dmg/13hs, rounds=55
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198153053788';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map3, v_player, t_ak47, '76561198153053788', 'aimkaydi', 45, 31, 10, 13, 4010, ROUND(4010.0/55, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- GHOST: 3 maps, 37K/32D/7A/3590dmg/19hs, rounds=55
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198796358007';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map3, v_player, t_ak47, '76561198796358007', 'GHOST', 37, 32, 7, 19, 3590, ROUND(3590.0/55, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- ARKANTOS: 3 maps, 25K/33D/31A/3856dmg/5hs, rounds=55
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199226019040';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map3, v_player, t_ak47, '76561199226019040', 'ARKANTOS', 25, 33, 31, 5, 3856, ROUND(3856.0/55, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- Hizalanamayanlar players
  -- Murat: 3 maps, 42K/44D/10A/4494dmg/18hs, rounds=55
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198157758327';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map3, v_player, t_hizal, '76561198157758327', 'Murat', 42, 44, 10, 18, 4494, ROUND(4494.0/55, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- Zeki: 3 maps, 38K/50D/14A/4902dmg/25hs, rounds=55
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199045061644';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map3, v_player, t_hizal, '76561199045061644', 'Zeki', 38, 50, 14, 25, 4902, ROUND(4902.0/55, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- Bahattin: 3 maps, 37K/47D/11A/4037dmg/17hs, rounds=55
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199099758701';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map3, v_player, t_hizal, '76561199099758701', 'Bahattin', 37, 47, 11, 17, 4037, ROUND(4037.0/55, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- Kamil: 3 maps, 19K/49D/7A/2060dmg/13hs, rounds=55
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198930081296';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map3, v_player, t_hizal, '76561198930081296', 'Kamil', 19, 49, 7, 13, 2060, ROUND(2060.0/55, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- Tezcan: 3 maps, 15K/51D/8A/1929dmg/3hs, rounds=55
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199067959748';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map3, v_player, t_hizal, '76561199067959748', 'Tezcan', 15, 51, 8, 3, 1929, ROUND(1929.0/55, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- ==========================================
  -- MATCH 4: BORU 3-0 BusCourney
  -- Map1: de_dust2 13-9 (21+1=22 rounds)
  -- Map2: de_nuke 13-4 (16+1=17 rounds)
  -- Map3: de_mirage 13-11 (23+1=24 rounds)
  -- Total: 22+17+24 = 63 rounds
  -- ==========================================
  INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
  VALUES (t_boru, t_busc, 'FINISHED', '2026-04-01', t_boru, 3, 0)
  RETURNING id INTO m4;

  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status)
  VALUES (m4, 'series', 1, 3, 0, 63, t_boru, 'FINISHED')
  RETURNING id INTO map4;

  -- BORU players
  -- L3o: 3 maps, 86K/34D/16A/8595dmg/32hs, rounds=63
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198332518466';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map4, v_player, t_boru, '76561198332518466', 'L3o', 86, 34, 16, 32, 8595, ROUND(8595.0/63, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- Chedjou: 3 maps, 55K/41D/31A/6882dmg/25hs, rounds=63
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198033678583';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map4, v_player, t_boru, '76561198033678583', 'Chedjou', 55, 41, 31, 25, 6882, ROUND(6882.0/63, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- Toska: 3 maps, 52K/40D/15A/5176dmg/20hs, rounds=63
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198867919247';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map4, v_player, t_boru, '76561198867919247', 'Toska', 52, 40, 15, 20, 5176, ROUND(5176.0/63, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- f1st_k: 3 maps, 36K/37D/17A/3797dmg/14hs, rounds=63
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199051795583';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map4, v_player, t_boru, '76561199051795583', 'f1st_k', 36, 37, 17, 14, 3797, ROUND(3797.0/63, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- Saul_Goodman: 3 maps, 23K/49D/11A/2511dmg/10hs, rounds=63
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199110867495';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map4, v_player, t_boru, '76561199110867495', 'Saul_Goodman', 23, 49, 11, 10, 2511, ROUND(2511.0/63, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- BusCourney players
  -- TERMINATOR: 3 maps, 66K/47D/17A/7345dmg/22hs, rounds=63
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198324665466';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map4, v_player, t_busc, '76561198324665466', 'TERMINATOR', 66, 47, 17, 22, 7345, ROUND(7345.0/63, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- CANTURK: 3 maps, 42K/58D/14A/4832dmg/20hs, rounds=63
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198367283733';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map4, v_player, t_busc, '76561198367283733', 'CANTURK', 42, 58, 14, 20, 4832, ROUND(4832.0/63, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- Nightwatch: 3 maps, 36K/49D/14A/4388dmg/14hs, rounds=63
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198074442660';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map4, v_player, t_busc, '76561198074442660', 'Nightwatch', 36, 49, 14, 14, 4388, ROUND(4388.0/63, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- ELektroBEyiN: 3 maps, 32K/55D/12A/3644dmg/12hs, rounds=63
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198191104478';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map4, v_player, t_busc, '76561198191104478', 'ELektroBEyiN', 32, 55, 12, 12, 3644, ROUND(3644.0/63, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- ATO: 3 maps, 21K/55D/11A/2619dmg/9hs, rounds=63
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198312386439';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (map4, v_player, t_busc, '76561198312386439', 'ATO', 21, 55, 11, 9, 2619, ROUND(2619.0/63, 1), 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- ==========================================
  -- POSTPONED: BLACK MAMBA vs BHEAMB
  -- Maç zaten PENDING olarak sistemde, değişiklik yok
  -- ==========================================

  RAISE NOTICE 'Successfully imported Week 3 matches (3 played, 1 postponed)';
  RAISE NOTICE 'Match 1: GEGENPRES 3-0 SIKLATANLAR';
  RAISE NOTICE 'Match 2: CRIMSON REAPERS 2-1 METAL DIVISION';
  RAISE NOTICE 'Match 3: AK47 SUPPLIERS 3-0 Hizalanamayanlar';
  RAISE NOTICE 'Match 4: BORU 3-0 BusCourney';
  RAISE NOTICE 'POSTPONED: BLACK MAMBA vs BHEAMB (remains PENDING)';
END $$;

COMMIT;
