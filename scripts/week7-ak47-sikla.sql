-- Week 7: AK47 SUPPLIERS 2-1 SIKLATANLAR
-- Tarih: 2026-04-28
-- Map1: dust2 13-7 (20r) | Map2: anubis 13-3 (16r) | Map3: mirage 13-16 OT (29r)
-- Toplam: 65 round

BEGIN;

DO $$
DECLARE
  t_ak47 UUID;
  t_sik UUID;
  v_match UUID;
  v_map UUID;
  v_player UUID;
BEGIN
  SELECT id INTO t_ak47 FROM cs2_teams WHERE name = 'AK47 SUPPLIERS';
  SELECT id INTO t_sik FROM cs2_teams WHERE name = 'SIKLATANLAR';

  SELECT id INTO v_match FROM cs2_matches
  WHERE status = 'PENDING'
  AND match_date::date = '2026-04-28'
  AND (
    (team1_id = t_ak47 AND team2_id = t_sik)
    OR (team1_id = t_sik AND team2_id = t_ak47)
  )
  LIMIT 1;

  IF v_match IS NULL THEN
    INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
    VALUES (t_ak47, t_sik, 'FINISHED', '2026-04-28', t_ak47, 2, 1)
    RETURNING id INTO v_match;
  ELSE
    UPDATE cs2_matches SET
      status = 'FINISHED',
      winner_team_id = t_ak47,
      team1_maps_won = CASE WHEN team1_id = t_ak47 THEN 2 ELSE 1 END,
      team2_maps_won = CASE WHEN team2_id = t_ak47 THEN 2 ELSE 1 END
    WHERE id = v_match;
  END IF;

  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status)
  VALUES (v_match, 'series', 1,
    CASE WHEN (SELECT team1_id FROM cs2_matches WHERE id = v_match) = t_ak47 THEN 2 ELSE 1 END,
    CASE WHEN (SELECT team2_id FROM cs2_matches WHERE id = v_match) = t_ak47 THEN 2 ELSE 1 END,
    65, t_ak47, 'FINISHED')
  RETURNING id INTO v_map;

  -- AK47 SUPPLIERS oyuncuları
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198310852022';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_ak47, '76561198310852022', 'BEDOOO', 78, 43, 22, 29, ROUND(7986.0 / 65, 1), 7986, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199099964835';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_ak47, '76561199099964835', 'Ryuka', 78, 51, 28, 48, ROUND(8554.0 / 65, 1), 8554, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199226019040';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_ak47, '76561199226019040', 'ARKANTOS', 40, 45, 17, 16, ROUND(4749.0 / 65, 1), 4749, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198796358007';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_ak47, '76561198796358007', 'G.H.O.S.T.', 34, 45, 14, 18, ROUND(3486.0 / 65, 1), 3486, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198295103268';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_ak47, '76561198295103268', 'settingler', 20, 45, 8, 7, ROUND(2037.0 / 65, 1), 2037, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- SIKLATANLAR oyuncuları
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198298585328';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_sik, '76561198298585328', 'Aibo', 78, 49, 17, 27, ROUND(7874.0 / 65, 1), 7874, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198341920431';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_sik, '76561198341920431', 'TRrosh', 57, 47, 27, 19, ROUND(6653.0 / 65, 1), 6653, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198847238087';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_sik, '76561198847238087', 'MHK', 44, 58, 13, 19, ROUND(4472.0 / 65, 1), 4472, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199879135591';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_sik, '76561199879135591', 'PyRo', 30, 49, 16, 12, ROUND(3648.0 / 65, 1), 3648, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198227665824';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_sik, '76561198227665824', 'BLACKBIRD', 18, 50, 9, 6, ROUND(2321.0 / 65, 1), 2321, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  RAISE NOTICE 'Week 7: AK47 2-1 SIKLATANLAR güncellendi';
END $$;

COMMIT;
