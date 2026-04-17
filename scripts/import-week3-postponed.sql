-- ERTELENEN MAÇ: BLACK MAMBA vs BHEAMB (3. Hafta)
-- Tarih: 2026-04-06
-- BHEAMB 3-0 BLACK MAMBA
-- Map 1: de_dust2 BHEAMB 13-5 (round 17+1=18)
-- Map 2: de_anubis BHEAMB 13-4 (round 16+1=17)
-- Map 3: de_inferno BHEAMB 13-2 (round 14+1=15)
-- Total rounds: 18+17+15 = 50

BEGIN;

DO $$
DECLARE
  t_mamba UUID; t_bheamb UUID;
  v_match UUID;
  v_map UUID;
  v_player UUID;
BEGIN
  SELECT id INTO t_mamba FROM cs2_teams WHERE name = 'BLACK MAMBA';
  SELECT id INTO t_bheamb FROM cs2_teams WHERE name = 'BHEAMB';

  -- Mevcut ertelenen maçı bul ve güncelle
  SELECT id INTO v_match FROM cs2_matches
  WHERE status = 'PENDING'
  AND match_date::date = '2026-04-01'
  AND (
    (team1_id = t_mamba AND team2_id = t_bheamb)
    OR (team1_id = t_bheamb AND team2_id = t_mamba)
  )
  LIMIT 1;

  -- Eğer ertelenen maç bulunamazsa yeni oluştur
  IF v_match IS NULL THEN
    INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
    VALUES (t_bheamb, t_mamba, 'FINISHED', '2026-04-06', t_bheamb, 3, 0)
    RETURNING id INTO v_match;
  ELSE
    -- Mevcut maçı güncelle
    UPDATE cs2_matches SET
      status = 'FINISHED',
      winner_team_id = t_bheamb,
      team1_maps_won = CASE WHEN team1_id = t_bheamb THEN 3 ELSE 0 END,
      team2_maps_won = CASE WHEN team2_id = t_bheamb THEN 3 ELSE 0 END,
      match_date = '2026-04-06',
      notes = NULL
    WHERE id = v_match;
  END IF;

  -- Container map kaydı oluştur
  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status)
  VALUES (v_match, 'series', 1,
    CASE WHEN (SELECT team1_id FROM cs2_matches WHERE id = v_match) = t_bheamb THEN 3 ELSE 0 END,
    CASE WHEN (SELECT team2_id FROM cs2_matches WHERE id = v_match) = t_bheamb THEN 3 ELSE 0 END,
    50, t_bheamb, 'FINISHED')
  RETURNING id INTO v_map;

  -- ==========================================
  -- BHEAMB oyuncuları (3 map, 50 round)
  -- ==========================================

  -- karac4 (76561199487734872): 60K, 24D, 17A, 5721dmg, 24hs, ADR=5721/50=114.4
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199487734872';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_bheamb, '76561199487734872', 'karac4', 60, 24, 17, 24, ROUND(5721.0 / 50, 1), 5721, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- MARATON (76561198931423764): 43K, 30D, 9A, 4531dmg, 29hs, ADR=4531/50=90.6
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198931423764';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_bheamb, '76561198931423764', 'MARATON', 43, 30, 9, 29, ROUND(4531.0 / 50, 1), 4531, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- SİNYOR0 (76561198787017562): 43K, 26D, 21A, 4713dmg, 24hs, ADR=4713/50=94.3
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198787017562';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_bheamb, '76561198787017562', 'SİNYOR0', 43, 26, 21, 24, ROUND(4713.0 / 50, 1), 4713, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- Tech (76561198973020202): 42K, 33D, 10A, 4528dmg, 16hs, ADR=4528/50=90.6
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198973020202';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_bheamb, '76561198973020202', 'Tech', 42, 33, 10, 16, ROUND(4528.0 / 50, 1), 4528, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- gmert0712 (76561199667420627): 34K, 37D, 11A, 3429dmg, 23hs, ADR=3429/50=68.6
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199667420627';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_bheamb, '76561199667420627', 'gmert0712', 34, 37, 11, 23, ROUND(3429.0 / 50, 1), 3429, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- ==========================================
  -- BLACK MAMBA oyuncuları (3 map, 50 round)
  -- ==========================================

  -- GÜLLÜ (76561199559185953): 41K, 46D, 6A, 4551dmg, 17hs, ADR=4551/50=91.0
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199559185953';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_mamba, '76561199559185953', 'GÜLLÜ', 41, 46, 6, 17, ROUND(4551.0 / 50, 1), 4551, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- Fatih (76561198955462483): 33K, 45D, 9A, 3509dmg, 17hs, ADR=3509/50=70.2
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198955462483';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_mamba, '76561198955462483', 'Fatih', 33, 45, 9, 17, ROUND(3509.0 / 50, 1), 3509, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- XANAX-1mg (76561199059099181): 30K, 43D, 14A, 3747dmg, 17hs, ADR=3747/50=74.9
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199059099181';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_mamba, '76561199059099181', 'XANAX-1mg', 30, 43, 14, 17, ROUND(3747.0 / 50, 1), 3747, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- APOLLO (76561199380502718): 27K, 45D, 8A, 3172dmg, 15hs, ADR=3172/50=63.4
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199380502718';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_mamba, '76561199380502718', 'APOLLO', 27, 45, 8, 15, ROUND(3172.0 / 50, 1), 3172, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- TheJaveLin (76561198386239863): 15K, 46D, 7A, 1892dmg, 4hs, ADR=1892/50=37.8
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198386239863';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_mamba, '76561198386239863', 'TheJaveLin', 15, 46, 7, 4, ROUND(1892.0 / 50, 1), 1892, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  RAISE NOTICE 'BLACK MAMBA vs BHEAMB maçı güncellendi: BHEAMB 3-0 BLACK MAMBA';
END $$;

COMMIT;
