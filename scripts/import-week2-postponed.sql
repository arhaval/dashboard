-- 2. HAFTA ERTELENEN MAÇ: ŞIKLATANLAR vs BusCourney
-- Oynandı: 2026-04-08
-- ŞIKLATANLAR 3-0 BusCourney
-- Map1: dust2 13-9 (22r) | Map2: mirage 13-5 (18r) | Map3: inferno 13-1 (14r)
-- Toplam: 54 round

BEGIN;

DO $$
DECLARE
  t_sik UUID; t_busc UUID;
  v_match UUID;
  v_map UUID;
  v_player UUID;
BEGIN
  SELECT id INTO t_sik FROM cs2_teams WHERE name = 'SIKLATANLAR';
  SELECT id INTO t_busc FROM cs2_teams WHERE name = 'BusCourney';

  -- Mevcut PENDING maçı bul (2. haftanın ertelenen maçı)
  SELECT id INTO v_match FROM cs2_matches
  WHERE status = 'PENDING'
  AND (
    (team1_id = t_sik AND team2_id = t_busc)
    OR (team1_id = t_busc AND team2_id = t_sik)
  )
  LIMIT 1;

  IF v_match IS NULL THEN
    -- Yoksa yeni oluştur
    INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
    VALUES (t_sik, t_busc, 'FINISHED', '2026-03-25', t_sik, 3, 0)
    RETURNING id INTO v_match;
  ELSE
    -- Mevcut maçı güncelle
    UPDATE cs2_matches SET
      status = 'FINISHED',
      winner_team_id = t_sik,
      team1_maps_won = CASE WHEN team1_id = t_sik THEN 3 ELSE 0 END,
      team2_maps_won = CASE WHEN team2_id = t_sik THEN 3 ELSE 0 END,
      notes = NULL
    WHERE id = v_match;
  END IF;

  -- Container map kaydı oluştur
  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status)
  VALUES (v_match, 'series', 1,
    CASE WHEN (SELECT team1_id FROM cs2_matches WHERE id = v_match) = t_sik THEN 3 ELSE 0 END,
    CASE WHEN (SELECT team2_id FROM cs2_matches WHERE id = v_match) = t_sik THEN 3 ELSE 0 END,
    54, t_sik, 'FINISHED')
  RETURNING id INTO v_map;

  -- ==========================================
  -- ŞIKLATANLAR oyuncuları (3 map, 54 round)
  -- ==========================================

  -- Aibo: 76K/31D/18A/7954dmg/51hs → ADR=147.3
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198298585328';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_sik, '76561198298585328', 'Aibo', 76, 31, 18, 51, ROUND(7954.0 / 54, 1), 7954, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- TRrosh: 54K/31D/16A/5293dmg/19hs → ADR=98.0
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198341920431';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_sik, '76561198341920431', 'TRrosh', 54, 31, 16, 19, ROUND(5293.0 / 54, 1), 5293, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- Sharpe: 51K/33D/18A/6062dmg/24hs → ADR=112.3
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198126178777';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_sik, '76561198126178777', 'Sharpe', 51, 33, 18, 24, ROUND(6062.0 / 54, 1), 6062, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- PyRo: 34K/28D/8A/2998dmg/12hs → ADR=55.5
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199879135591';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_sik, '76561199879135591', 'PyRo', 34, 28, 8, 12, ROUND(2998.0 / 54, 1), 2998, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- BLΛCKBIRD: 16K/34D/4A/1983dmg/6hs → ADR=36.7
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198227665824';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_sik, '76561198227665824', 'BLACKBIRD', 16, 34, 4, 6, ROUND(1983.0 / 54, 1), 1983, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- ==========================================
  -- BusCourney oyuncuları (3 map, 54 round)
  -- ==========================================

  -- TERMİNATÖR: 56K/41D/15A/6762dmg/24hs → ADR=125.2
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198324665466';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_busc, '76561198324665466', 'TERMINATOR', 56, 41, 15, 24, ROUND(6762.0 / 54, 1), 6762, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- CANTURK: 35K/47D/10A/3989dmg/15hs → ADR=73.9
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198367283733';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_busc, '76561198367283733', 'CANTURK', 35, 47, 10, 15, ROUND(3989.0 / 54, 1), 3989, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- Nightwatch: 30K/47D/12A/3910dmg/13hs → ADR=72.4
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198074442660';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_busc, '76561198074442660', 'Nightwatch', 30, 47, 12, 13, ROUND(3910.0 / 54, 1), 3910, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- ELektroBEyiN: 23K/49D/12A/2857dmg/11hs → ADR=52.9
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198191104478';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_busc, '76561198191104478', 'ELektroBEyiN', 23, 49, 12, 11, ROUND(2857.0 / 54, 1), 2857, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  -- ATO: 11K/48D/6A/1298dmg/7hs → ADR=24.0
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198312386439';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name, kills, deaths, assists, headshots, adr, damage_dealt, maps_played, mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_busc, '76561198312386439', 'ATO', 11, 48, 6, 7, ROUND(1298.0 / 54, 1), 1298, 3, 0, 0, 0, 0, 0, 0, 0, 0);

  RAISE NOTICE '2. Hafta ertelenen maç güncellendi: SIKLATANLAR 3-0 BusCourney';
END $$;

COMMIT;
