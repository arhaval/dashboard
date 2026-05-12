-- HAFTA 8 VERİLERİ - CS2 TURNUVA
-- Tarih: 2026-05-06
-- CRIMSON REAPERS 3-0 BLACK MAMBA
-- Map1: 12-2 (14r) | Map2: 12-9 (21r) | Map3: 12-1 (13r)
-- Toplam: 48 round
-- Not: BLACK MAMBA'da Ozibaba yeni (önceki haftalarda APOLLO vardı)

BEGIN;

DO $$
DECLARE
  t_crimson UUID;
  t_mamba   UUID;
  v_match   UUID;
  v_map     UUID;
  v_player  UUID;
BEGIN
  SELECT id INTO t_crimson FROM cs2_teams WHERE name = 'CRIMSON REAPERS';
  SELECT id INTO t_mamba   FROM cs2_teams WHERE name = 'BLACK MAMBA';

  IF t_crimson IS NULL THEN RAISE EXCEPTION 'CRIMSON REAPERS takımı bulunamadı'; END IF;
  IF t_mamba   IS NULL THEN RAISE EXCEPTION 'BLACK MAMBA takımı bulunamadı'; END IF;

  -- -------------------------------------------------------
  -- YENİ OYUNCU: Ozibaba (BLACK MAMBA) — APOLLO'nun yerini aldı
  -- -------------------------------------------------------
  INSERT INTO cs2_players (team_id, name, steam_id, is_active)
  VALUES (t_mamba, 'Ozibaba', '76561199037532344', true)
  ON CONFLICT (steam_id) DO NOTHING;

  -- -------------------------------------------------------
  -- MATCH: CRIMSON REAPERS 3-0 BLACK MAMBA
  -- -------------------------------------------------------
  SELECT id INTO v_match FROM cs2_matches
  WHERE status = 'PENDING'
    AND match_date::date = '2026-05-06'
    AND (
      (team1_id = t_crimson AND team2_id = t_mamba)
      OR (team1_id = t_mamba AND team2_id = t_crimson)
    )
  LIMIT 1;

  IF v_match IS NULL THEN
    INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
    VALUES (t_crimson, t_mamba, 'FINISHED', '2026-05-06', t_crimson, 3, 0)
    RETURNING id INTO v_match;
  ELSE
    UPDATE cs2_matches SET
      status         = 'FINISHED',
      winner_team_id = t_crimson,
      team1_maps_won = CASE WHEN team1_id = t_crimson THEN 3 ELSE 0 END,
      team2_maps_won = CASE WHEN team2_id = t_crimson THEN 3 ELSE 0 END
    WHERE id = v_match;
  END IF;

  -- Seri özeti (3 map, toplam 48 round)
  -- Map1: CRIMSON 12-2 MAMBA (14r) | Map2: 12-9 (21r) | Map3: 12-1 (13r)
  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status)
  VALUES (
    v_match, 'series', 1,
    CASE WHEN (SELECT team1_id FROM cs2_matches WHERE id = v_match) = t_crimson THEN 3 ELSE 0 END,
    CASE WHEN (SELECT team2_id FROM cs2_matches WHERE id = v_match) = t_crimson THEN 3 ELSE 0 END,
    48, t_crimson, 'FINISHED'
  )
  RETURNING id INTO v_map;

  -- =========================================================
  -- CRIMSON REAPERS OYUNCULARI (3 map, 48 round)
  -- ADR = toplam_damage / 48
  -- =========================================================

  -- OGZK | K:70 D:28 A:18 HS:34 DMG:6110 ADR:127.3
  -- Map16: K24/D7/A9/HS12/DMG2042 + Map17: K34/D15/A5/HS18/DMG2881 + Map18: K12/D6/A4/HS4/DMG1187
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198044432985';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_crimson, '76561198044432985', 'OGZK',
    70, 28, 18, 34, ROUND(6110.0 / 48, 1), 6110, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- Electronica | K:61 D:18 A:19 HS:37 DMG:6153 ADR:128.2
  -- Map16: K13/D2/A5/HS8/DMG1280 + Map17: K25/D11/A8/HS12/DMG2425 + Map18: K23/D5/A6/HS17/DMG2448
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198074087741';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_crimson, '76561198074087741', 'Electronica',
    61, 18, 19, 37, ROUND(6153.0 / 48, 1), 6153, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- DAYI | K:39 D:38 A:14 HS:22 DMG:4343 ADR:90.5
  -- Map16: K12/D11/A3/HS8/DMG1195 + Map17: K12/D20/A6/HS4/DMG1612 + Map18: K15/D7/A5/HS10/DMG1536
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198380002468';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_crimson, '76561198380002468', 'DAYI',
    39, 38, 14, 22, ROUND(4343.0 / 48, 1), 4343, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- Captain | K:32 D:30 A:13 HS:19 DMG:3506 ADR:73.0
  -- Map16: K12/D10/A6/HS9/DMG1590 + Map17: K9/D16/A5/HS3/DMG1043 + Map18: K11/D4/A2/HS7/DMG873
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198134625951';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_crimson, '76561198134625951', 'Captain',
    32, 30, 13, 19, ROUND(3506.0 / 48, 1), 3506, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- Mr.Boombastic | K:21 D:31 A:14 HS:4 DMG:2561 ADR:53.4
  -- Map16: K7/D11/A3/HS2/DMG761 + Map17: K7/D15/A8/HS0/DMG1033 + Map18: K7/D5/A3/HS2/DMG767
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198340882003';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_crimson, '76561198340882003', 'Mr.Boombastic',
    21, 31, 14, 4, ROUND(2561.0 / 48, 1), 2561, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- =========================================================
  -- BLACK MAMBA OYUNCULARI (3 map, 48 round)
  -- ADR = toplam_damage / 48
  -- =========================================================

  -- GÜLLÜ | K:50 D:45 A:14 HS:20 DMG:5525 ADR:115.1
  -- Map16: K14/D14/A7/HS5/DMG1783 + Map17: K24/D18/A5/HS10/DMG2386 + Map18: K12/D13/A2/HS5/DMG1356
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199559185953';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_mamba, '76561199559185953', 'GÜLLÜ',
    50, 45, 14, 20, ROUND(5525.0 / 48, 1), 5525, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- Ozibaba | K:35 D:43 A:14 HS:13 DMG:3923 ADR:81.7
  -- Map16: K8/D14/A6/HS3/DMG1002 + Map17: K22/D16/A4/HS7/DMG2195 + Map18: K5/D13/A4/HS3/DMG726
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199037532344';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_mamba, '76561199037532344', 'Ozibaba',
    35, 43, 14, 13, ROUND(3923.0 / 48, 1), 3923, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- XANAX-1mg | K:29 D:48 A:6 HS:17 DMG:3420 ADR:71.3
  -- Map16: K9/D14/A2/HS7/DMG1018 + Map17: K16/D20/A3/HS8/DMG1710 + Map18: K4/D14/A1/HS2/DMG692
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199059099181';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_mamba, '76561199059099181', 'XANAX-1mg',
    29, 48, 6, 17, ROUND(3420.0 / 48, 1), 3420, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- Fatih | K:23 D:44 A:8 HS:16 DMG:2848 ADR:59.3
  -- Map16: K7/D13/A1/HS5/DMG712 + Map17: K12/D17/A7/HS9/DMG1634 + Map18: K4/D14/A0/HS2/DMG502
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198955462483';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_mamba, '76561198955462483', 'Fatih',
    23, 44, 8, 16, ROUND(2848.0 / 48, 1), 2848, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  -- TheJaveLin | K:7 D:44 A:4 HS:3 DMG:1114 ADR:23.2
  -- Map16: K3/D13/A2/HS0/DMG365 + Map17: K2/D17/A2/HS2/DMG459 + Map18: K2/D14/A0/HS1/DMG290
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198386239863';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper, entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_mamba, '76561198386239863', 'TheJaveLin',
    7, 44, 4, 3, ROUND(1114.0 / 48, 1), 1114, 3,
    0, 0, 0, 0, 0, 0, 0, 0);

  RAISE NOTICE '8. Hafta import tamamlandı: CRIMSON REAPERS 3-0 BLACK MAMBA (Map skorları: 12-2 / 12-9 / 12-1)';
END $$;

COMMIT;
