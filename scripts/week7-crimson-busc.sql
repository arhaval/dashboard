-- Week 7: CRIMSON REAPERS 3-0 BusCourney
-- Tarih: 2026-04-28
-- Map1: dust2 13-8 (21r) | Map2: nuke 13-3 (16r) | Map3: anubis 13-3 (16r)
-- Toplam: 53 round

BEGIN;

DO $$
DECLARE
  t_crimson UUID;
  t_busc UUID;
  v_match UUID;
  v_map UUID;
  v_player UUID;
BEGIN
  SELECT id INTO t_crimson FROM cs2_teams WHERE name = 'CRIMSON REAPERS';
  SELECT id INTO t_busc FROM cs2_teams WHERE name = 'BusCourney';

  -- Mevcut PENDING maçı bul ve güncelle
  SELECT id INTO v_match FROM cs2_matches
  WHERE status = 'PENDING'
  AND match_date::date = '2026-04-28'
  AND (
    (team1_id = t_crimson AND team2_id = t_busc)
    OR (team1_id = t_busc AND team2_id = t_crimson)
  )
  LIMIT 1;

  IF v_match IS NULL THEN
    INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
    VALUES (t_crimson, t_busc, 'FINISHED', '2026-04-28', t_crimson, 3, 0)
    RETURNING id INTO v_match;
  ELSE
    UPDATE cs2_matches SET
      status = 'FINISHED',
      winner_team_id = t_crimson,
      team1_maps_won = CASE WHEN team1_id = t_crimson THEN 3 ELSE 0 END,
      team2_maps_won = CASE WHEN team2_id = t_crimson THEN 3 ELSE 0 END
    WHERE id = v_match;
  END IF;

  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status)
  VALUES (v_match, 'series', 1,
    CASE WHEN (SELECT team1_id FROM cs2_matches WHERE id = v_match) = t_crimson THEN 3 ELSE 0 END,
    CASE WHEN (SELECT team2_id FROM cs2_matches WHERE id = v_match) = t_crimson THEN 3 ELSE 0 END,
    53, t_crimson, 'FINISHED')
  RETURNING id INTO v_map;

  -- CRIMSON REAPERS oyuncuları
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198044432985';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_crimson, '76561198044432985', 'OGZK', 63, 32, 18, 36, ROUND(6585.0 / 53, 1), 6585, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198380002468';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_crimson, '76561198380002468', 'DAYI', 56, 34, 11, 36, ROUND(5072.0 / 53, 1), 5072, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198134625951';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_crimson, '76561198134625951', 'Captain', 39, 32, 20, 16, ROUND(4090.0 / 53, 1), 4090, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199144890979';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_crimson, '76561199144890979', 'BABACAGRI', 34, 33, 18, 10, ROUND(3745.0 / 53, 1), 3745, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198340882003';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_crimson, '76561198340882003', 'Mr.Boombastic', 25, 30, 14, 9, ROUND(3081.0 / 53, 1), 3081, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- BusCourney oyuncuları
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198324665466';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_busc, '76561198324665466', 'TERMINATOR', 63, 41, 15, 19, ROUND(6767.0 / 53, 1), 6767, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198191104478';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_busc, '76561198191104478', 'ELektroBEyiN', 21, 44, 10, 11, ROUND(3034.0 / 53, 1), 3034, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198367283733';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_busc, '76561198367283733', 'CANTURK', 27, 43, 12, 12, ROUND(3431.0 / 53, 1), 3431, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198074442660';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_busc, '76561198074442660', 'Nightwatch', 31, 45, 9, 15, ROUND(3423.0 / 53, 1), 3423, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198284365406';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_busc, '76561198284365406', 'smoothopeerator', 16, 48, 10, 8, ROUND(1867.0 / 53, 1), 1867, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  RAISE NOTICE 'Week 7: CRIMSON 3-0 BusCourney güncellendi';
END $$;

COMMIT;
