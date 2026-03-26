-- HAFTA 2 VERİLERİ - CS2 TURNUVA
-- Tarih: 2026-03-25
-- 4 maç, hepsi 2-1
-- Round tahmini: toplam kills / 5 + 1 (MatchZy N-1 düzeltmesi) per map
BEGIN;

DO $$
DECLARE
  t_gegen UUID; t_metal UUID; t_busc UUID; t_hizal UUID;
  t_crimson UUID; t_bheamb UUID; t_ak47 UUID; t_mamba UUID;
  m1 UUID; m2 UUID; m3 UUID; m4 UUID;
  map1 UUID; map2 UUID; map3 UUID; map4 UUID;
  v_player UUID;
BEGIN
  -- Takım ID'lerini al
  SELECT id INTO t_gegen FROM cs2_teams WHERE name = 'GEGENPRES';
  SELECT id INTO t_metal FROM cs2_teams WHERE name = 'METAL DIVISION';
  SELECT id INTO t_busc FROM cs2_teams WHERE name = 'BusCourney';
  SELECT id INTO t_hizal FROM cs2_teams WHERE name = 'Hizalanamayanlar';
  SELECT id INTO t_crimson FROM cs2_teams WHERE name = 'CRIMSON REAPERS';
  SELECT id INTO t_bheamb FROM cs2_teams WHERE name = 'BHEAMB';
  SELECT id INTO t_ak47 FROM cs2_teams WHERE name = 'AK47 SUPPLIERS';
  SELECT id INTO t_mamba FROM cs2_teams WHERE name = 'BLACK MAMBA';

  -- ============================================================
  -- Hafta 1'de oynamayan oyuncular icin cs2_players kaydi olustur
  -- ============================================================

  -- BABACAGRI (CRIMSON REAPERS) - Hafta 1'de oynamamis
  INSERT INTO cs2_players (team_id, name, steam_id)
  VALUES (t_crimson, 'BABACAGRI', '76561199144890979')
  ON CONFLICT (steam_id) DO NOTHING;

  -- Ryuka (AK47 SUPPLIERS) - Hafta 1'de oynamamis
  INSERT INTO cs2_players (team_id, name, steam_id)
  VALUES (t_ak47, 'Ryuka', '76561199099964835')
  ON CONFLICT (steam_id) DO NOTHING;

  -- ==========================================
  -- MATCH 1: GEGENPRES 2-1 METAL DIVISION
  -- Map1: ~24 rounds, Map2: ~44 rounds (OT), Map3: ~27 rounds
  -- Total: 95 rounds
  -- ==========================================
  INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
  VALUES (t_gegen, t_metal, 'FINISHED', '2026-03-25', t_gegen, 2, 1)
  RETURNING id INTO m1;

  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status)
  VALUES (m1, 'series', 1, 2, 1, 95, t_gegen, 'FINISHED')
  RETURNING id INTO map1;

  -- GEGENPRES players
  -- JakieS: 3 maps, 78K/49D/17A/8032dmg/31hs, rounds=95
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199120455536';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map1, v_player, t_gegen, '76561199120455536', 'JakieS', 78, 49, 17, 31, 8032, ROUND(8032.0/95, 1), 3, 0, 0);

  -- Pac: 3 maps, 59K/51D/11A/5647dmg/31hs, rounds=95
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198192462155';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map1, v_player, t_gegen, '76561198192462155', 'Pac', 59, 51, 11, 31, 5647, ROUND(5647.0/95, 1), 3, 0, 0);

  -- Vandetta: 3 maps, 35K/52D/15A/4061dmg/13hs, rounds=95
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198967300942';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map1, v_player, t_gegen, '76561198967300942', 'Vandetta', 35, 52, 15, 13, 4061, ROUND(4061.0/95, 1), 3, 0, 0);

  -- BENETO: 3 maps, 25K/54D/12A/2894dmg/9hs, rounds=95
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198372270608';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map1, v_player, t_gegen, '76561198372270608', 'BENETO', 25, 54, 12, 9, 2894, ROUND(2894.0/95, 1), 3, 0, 0);

  -- TRader: 1 map only (map1), 2K/15D/1A/413dmg/1hs, rounds=24
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198350960783';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map1, v_player, t_gegen, '76561198350960783', 'TRader', 2, 15, 1, 1, 413, ROUND(413.0/24, 1), 1, 0, 0);

  -- Altar: 2 maps (map2+map3), 27K/32D/7A/2962dmg/13hs, rounds=71
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198160862027';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map1, v_player, t_gegen, '76561198160862027', 'Altar', 27, 32, 7, 13, 2962, ROUND(2962.0/71, 1), 2, 0, 0);

  -- METAL DIVISION players
  -- MayoNeTT: 3 maps, 62K/46D/19A/6392dmg/25hs, rounds=95
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198452210637';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map1, v_player, t_metal, '76561198452210637', 'MayoNeTT', 62, 46, 19, 25, 6392, ROUND(6392.0/95, 1), 3, 0, 0);

  -- Alucard: 3 maps, 60K/44D/14A/5911dmg/31hs, rounds=95
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198333867003';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map1, v_player, t_metal, '76561198333867003', 'Alucard', 60, 44, 14, 31, 5911, ROUND(5911.0/95, 1), 3, 0, 0);

  -- Greaw: 3 maps, 53K/48D/10A/5447dmg/19hs, rounds=95
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199104832590';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map1, v_player, t_metal, '76561199104832590', 'Greaw', 53, 48, 10, 19, 5447, ROUND(5447.0/95, 1), 3, 0, 0);

  -- FARKETMEZ: 3 maps, 37K/43D/19A/4295dmg/17hs, rounds=95
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199001198568';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map1, v_player, t_metal, '76561199001198568', 'FARKETMEZ', 37, 43, 19, 17, 4295, ROUND(4295.0/95, 1), 3, 0, 0);

  -- Pasuel: 3 maps, 21K/45D/12A/2528dmg/10hs, rounds=95
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198376809576';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map1, v_player, t_metal, '76561198376809576', 'Pasuel', 21, 45, 12, 10, 2528, ROUND(2528.0/95, 1), 3, 0, 0);

  -- ==========================================
  -- MATCH 2: BusCourney 2-1 Hizalanamayanlar
  -- Map1: ~26 rounds, Map2: ~35 rounds, Map3: ~35 rounds
  -- Total: 96 rounds
  -- ==========================================
  INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
  VALUES (t_busc, t_hizal, 'FINISHED', '2026-03-25', t_busc, 2, 1)
  RETURNING id INTO m2;

  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status)
  VALUES (m2, 'series', 1, 2, 1, 96, t_busc, 'FINISHED')
  RETURNING id INTO map2;

  -- BusCourney players
  -- TERMINATOR: 3 maps, 94K/40D/11A/9545dmg/34hs, rounds=96
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198324665466';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map2, v_player, t_busc, '76561198324665466', 'TERMINATOR', 94, 40, 11, 34, 9545, ROUND(9545.0/96, 1), 3, 0, 0);

  -- Nightwatch: 3 maps, 46K/44D/17A/4956dmg/24hs, rounds=96
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198074442660';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map2, v_player, t_busc, '76561198074442660', 'Nightwatch', 46, 44, 17, 24, 4956, ROUND(4956.0/96, 1), 3, 0, 0);

  -- ELektroBEyiN: 3 maps, 39K/46D/26A/4946dmg/16hs, rounds=96
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198191104478';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map2, v_player, t_busc, '76561198191104478', 'ELektroBEyiN', 39, 46, 26, 16, 4946, ROUND(4946.0/96, 1), 3, 0, 0);

  -- smoothopeerator: 3 maps, 46K/47D/14A/5110dmg/22hs, rounds=96
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198284365406';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map2, v_player, t_busc, '76561198284365406', 'smoothopeerator', 46, 47, 14, 22, 5110, ROUND(5110.0/96, 1), 3, 0, 0);

  -- ATO: 3 maps, 23K/43D/8A/2201dmg/8hs, rounds=96
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198312386439';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map2, v_player, t_busc, '76561198312386439', 'ATO', 23, 43, 8, 8, 2201, ROUND(2201.0/96, 1), 3, 0, 0);

  -- Hizalanamayanlar players
  -- Bahattin: 3 maps, 49K/49D/16A/5730dmg/15hs, rounds=96
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199099758701';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map2, v_player, t_hizal, '76561199099758701', 'Bahattin', 49, 49, 16, 15, 5730, ROUND(5730.0/96, 1), 3, 0, 0);

  -- Kamil: 3 maps, 36K/49D/16A/4157dmg/14hs, rounds=96
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198930081296';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map2, v_player, t_hizal, '76561198930081296', 'Kamil', 36, 49, 16, 14, 4157, ROUND(4157.0/96, 1), 3, 0, 0);

  -- Tezcan: 3 maps, 36K/51D/18A/3912dmg/11hs, rounds=96
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199067959748';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map2, v_player, t_hizal, '76561199067959748', 'Tezcan', 36, 51, 18, 11, 3912, ROUND(3912.0/96, 1), 3, 0, 0);

  -- LazRecep: 3 maps, 24K/53D/15A/3315dmg/10hs, rounds=96
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198177045161';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map2, v_player, t_hizal, '76561198177045161', 'LazRecep', 24, 53, 15, 10, 3315, ROUND(3315.0/96, 1), 3, 0, 0);

  -- Zeki: 1 map only (map1), 7K/14D/2A/679dmg/1hs, rounds=26
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199045061644';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map2, v_player, t_hizal, '76561199045061644', 'Zeki', 7, 14, 2, 1, 679, ROUND(679.0/26, 1), 1, 0, 0);

  -- Murat: 2 maps (map2+map3), 61K/35D/9A/6461dmg/18hs, rounds=70
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198157758327';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map2, v_player, t_hizal, '76561198157758327', 'Murat', 61, 35, 9, 18, 6461, ROUND(6461.0/70, 1), 2, 0, 0);

  -- ==========================================
  -- MATCH 3: CRIMSON REAPERS 2-1 BHEAMB
  -- Map1: ~29 rounds, Map2: ~26 rounds, Map3: ~34 rounds
  -- Total: 89 rounds
  -- ==========================================
  INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
  VALUES (t_crimson, t_bheamb, 'FINISHED', '2026-03-25', t_crimson, 2, 1)
  RETURNING id INTO m3;

  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status)
  VALUES (m3, 'series', 1, 2, 1, 89, t_crimson, 'FINISHED')
  RETURNING id INTO map3;

  -- CRIMSON REAPERS players
  -- OGZK: 3 maps, 64K/37D/19A/7292dmg/29hs, rounds=89
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198044432985';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map3, v_player, t_crimson, '76561198044432985', 'OGZK', 64, 37, 19, 29, 7292, ROUND(7292.0/89, 1), 3, 0, 0);

  -- Electronica: 3 maps, 62K/33D/12A/5876dmg/39hs, rounds=89
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198074087741';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map3, v_player, t_crimson, '76561198074087741', 'Electronica', 62, 33, 12, 39, 5876, ROUND(5876.0/89, 1), 3, 0, 0);

  -- BABACAGRI: 3 maps, 44K/41D/11A/5154dmg/21hs, rounds=89
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199144890979';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map3, v_player, t_crimson, '76561199144890979', 'BABACAGRI', 44, 41, 11, 21, 5154, ROUND(5154.0/89, 1), 3, 0, 0);

  -- Mr.Boombastic: 3 maps, 35K/42D/11A/3337dmg/10hs, rounds=89
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198340882003';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map3, v_player, t_crimson, '76561198340882003', 'Mr.Boombastic', 35, 42, 11, 10, 3337, ROUND(3337.0/89, 1), 3, 0, 0);

  -- Captain: 3 maps, 34K/39D/15A/3786dmg/14hs, rounds=89
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198134625951';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map3, v_player, t_crimson, '76561198134625951', 'Captain', 34, 39, 15, 14, 3786, ROUND(3786.0/89, 1), 3, 0, 0);

  -- BHEAMB players
  -- karac4: 3 maps, 80K/45D/7A/7742dmg/49hs, rounds=89
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199487734872';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map3, v_player, t_bheamb, '76561199487734872', 'karac4', 80, 45, 7, 49, 7742, ROUND(7742.0/89, 1), 3, 0, 0);

  -- MARATON: 3 maps, 38K/48D/11A/5059dmg/23hs, rounds=89
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198931423764';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map3, v_player, t_bheamb, '76561198931423764', 'MARATON', 38, 48, 11, 23, 5059, ROUND(5059.0/89, 1), 3, 0, 0);

  -- Tech: 3 maps, 35K/48D/14A/4294dmg/12hs, rounds=89
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198973020202';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map3, v_player, t_bheamb, '76561198973020202', 'Tech', 35, 48, 14, 12, 4294, ROUND(4294.0/89, 1), 3, 0, 0);

  -- SİNYOR0: 3 maps, 20K/51D/11A/2514dmg/9hs, rounds=89
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198787017562';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map3, v_player, t_bheamb, '76561198787017562', 'SİNYOR0', 20, 51, 11, 9, 2514, ROUND(2514.0/89, 1), 3, 0, 0);

  -- KANTARES: 3 maps, 15K/49D/6A/1506dmg/7hs, rounds=89
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199045769578';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map3, v_player, t_bheamb, '76561199045769578', 'KANTARES', 15, 49, 6, 7, 1506, ROUND(1506.0/89, 1), 3, 0, 0);

  -- ==========================================
  -- MATCH 4: AK47 SUPPLIERS 2-1 BLACK MAMBA
  -- Map1: ~31 rounds, Map2: ~28 rounds, Map3: ~23 rounds
  -- Total: 82 rounds
  -- ==========================================
  INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
  VALUES (t_ak47, t_mamba, 'FINISHED', '2026-03-25', t_ak47, 2, 1)
  RETURNING id INTO m4;

  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status)
  VALUES (m4, 'series', 1, 2, 1, 82, t_ak47, 'FINISHED')
  RETURNING id INTO map4;

  -- AK47 SUPPLIERS players
  -- BEDOOO: 3 maps, 66K/32D/10A/6136dmg/39hs, rounds=82
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198310852022';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map4, v_player, t_ak47, '76561198310852022', 'BEDOOO', 66, 32, 10, 39, 6136, ROUND(6136.0/82, 1), 3, 0, 0);

  -- Ryuka: 3 maps, 58K/34D/9A/5255dmg/13hs, rounds=82
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199099964835';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map4, v_player, t_ak47, '76561199099964835', 'Ryuka', 58, 34, 9, 13, 5255, ROUND(5255.0/82, 1), 3, 0, 0);

  -- aimkaydi: 3 maps, 40K/35D/10A/3987dmg/18hs, rounds=82
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198153053788';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map4, v_player, t_ak47, '76561198153053788', 'aimkaydi', 40, 35, 10, 18, 3987, ROUND(3987.0/82, 1), 3, 0, 0);

  -- ARKANTOS: 3 maps, 35K/37D/9A/3454dmg/13hs, rounds=82
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199226019040';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map4, v_player, t_ak47, '76561199226019040', 'ARKANTOS', 35, 37, 9, 13, 3454, ROUND(3454.0/82, 1), 3, 0, 0);

  -- GHOST: 3 maps, 22K/38D/11A/2608dmg/14hs, rounds=82
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198796358007';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map4, v_player, t_ak47, '76561198796358007', 'GHOST', 22, 38, 11, 14, 2608, ROUND(2608.0/82, 1), 3, 0, 0);

  -- BLACK MAMBA players
  -- XANAX-1mg: 3 maps, 58K/42D/14A/5536dmg/26hs, rounds=82
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199059099181';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map4, v_player, t_mamba, '76561199059099181', 'XANAX-1mg', 58, 42, 14, 26, 5536, ROUND(5536.0/82, 1), 3, 0, 0);

  -- GULLU: 3 maps, 43K/42D/11A/4054dmg/20hs, rounds=82
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199559185953';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map4, v_player, t_mamba, '76561199559185953', 'GULLU', 43, 42, 11, 20, 4054, ROUND(4054.0/82, 1), 3, 0, 0);

  -- Fatih: 3 maps, 29K/43D/7A/2939dmg/13hs, rounds=82
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198955462483';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map4, v_player, t_mamba, '76561198955462483', 'Fatih', 29, 43, 7, 13, 2939, ROUND(2939.0/82, 1), 3, 0, 0);

  -- APOLLO: 3 maps, 20K/46D/18A/2712dmg/9hs, rounds=82
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199380502718';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map4, v_player, t_mamba, '76561199380502718', 'APOLLO', 20, 46, 18, 9, 2712, ROUND(2712.0/82, 1), 3, 0, 0);

  -- TheJaveLin: 3 maps, 18K/48D/4A/1913dmg/7hs, rounds=82
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198386239863';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, damage_dealt, adr, maps_played, mvps, score)
  VALUES (map4, v_player, t_mamba, '76561198386239863', 'TheJaveLin', 18, 48, 4, 7, 1913, ROUND(1913.0/82, 1), 3, 0, 0);

  RAISE NOTICE 'Successfully imported 4 Week 2 matches';
  RAISE NOTICE 'Match 1: GEGENPRES 2-1 METAL DIVISION';
  RAISE NOTICE 'Match 2: BusCourney 2-1 Hizalanamayanlar';
  RAISE NOTICE 'Match 3: CRIMSON REAPERS 2-1 BHEAMB';
  RAISE NOTICE 'Match 4: AK47 SUPPLIERS 2-1 BLACK MAMBA';
END $$;

COMMIT;
