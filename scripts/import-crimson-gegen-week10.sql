-- =============================================================================
-- HAFTA 10 MAÇ — CS2 TURNUVA
-- Tarih: 2026-05-11
-- CRIMSON REAPERS 2-1 GEGENPRES
-- Map1 (de_dust2):  GEGEN 12 - CRIMSON 10 | 22 round | GEGEN kazandı
-- Map2 (de_mirage): CRIMSON 12 - GEGEN 3  | 15 round | CRIMSON kazandı
-- Map3:             GEGENPRES çekildi      | 0 round  | CRIMSON walkover
-- Toplam oynanmış round: 37
--
-- NOT: Oyuncu başına oynanan map sayısı
--   CRIMSON (Electronica, OGZK, cagri, Captain, Mr.Boombastic) → 2 map (37r)
--   GEGEN   (Pac, JakieS, Tarkan, Vendetta) → 2 map (37r)
--   BENETO (ECK) → 1 map (22r, sadece Map1)
--   TRader (OK)  → 1 map (15r, sadece Map2)
-- =============================================================================

BEGIN;

DO $$
DECLARE
  t_crimson UUID;
  t_gegen   UUID;
  v_match   UUID;
  v_map     UUID;
  v_player  UUID;
BEGIN
  SELECT id INTO t_crimson FROM cs2_teams WHERE name = 'CRIMSON REAPERS';
  SELECT id INTO t_gegen   FROM cs2_teams WHERE name = 'GEGENPRES';

  IF t_crimson IS NULL THEN RAISE EXCEPTION 'CRIMSON REAPERS takımı bulunamadı'; END IF;
  IF t_gegen   IS NULL THEN RAISE EXCEPTION 'GEGENPRES takımı bulunamadı'; END IF;

  -- -------------------------------------------------------
  -- MATCH: CRIMSON REAPERS 2-1 GEGENPRES
  -- -------------------------------------------------------
  SELECT id INTO v_match FROM cs2_matches
  WHERE status = 'PENDING'
    AND match_date::date = '2026-05-11'
    AND (
      (team1_id = t_crimson AND team2_id = t_gegen)
      OR (team1_id = t_gegen AND team2_id = t_crimson)
    )
  LIMIT 1;

  IF v_match IS NULL THEN
    INSERT INTO cs2_matches (team1_id, team2_id, status, match_date, winner_team_id, team1_maps_won, team2_maps_won)
    VALUES (t_crimson, t_gegen, 'FINISHED', '2026-05-11', t_crimson, 2, 1)
    RETURNING id INTO v_match;
  ELSE
    UPDATE cs2_matches SET
      status         = 'FINISHED',
      winner_team_id = t_crimson,
      team1_maps_won = CASE WHEN team1_id = t_crimson THEN 2 ELSE 1 END,
      team2_maps_won = CASE WHEN team2_id = t_crimson THEN 2 ELSE 1 END
    WHERE id = v_match;
  END IF;

  -- -------------------------------------------------------
  -- SERİ ÖZETİ (map='series', 37 round)
  -- Map1: GEGEN 12-10 CRIMSON | Map2: CRIMSON 12-3 GEGEN
  -- -------------------------------------------------------
  INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status, ended_at)
  VALUES (
    v_match, 'series', 1,
    CASE WHEN (SELECT team1_id FROM cs2_matches WHERE id = v_match) = t_crimson THEN 2 ELSE 1 END,
    CASE WHEN (SELECT team2_id FROM cs2_matches WHERE id = v_match) = t_crimson THEN 2 ELSE 1 END,
    37, t_crimson, 'FINISHED', '2026-05-11 21:00:00+03'
  )
  RETURNING id INTO v_map;

  -- =========================================================
  -- CRIMSON REAPERS OYUNCULARI (tümü 2 map, 37 round)
  -- =========================================================

  -- Electronica (Ö.H.) | K:47 D:20 A:9 HS:21 DMG:4783 ADR:129.3
  -- Map1(dust2): K23/D15/A4/HS9/DMG2266 | Map2(mirage): K24/D5/A5/HS12/DMG2517
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198074087741';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper,
    entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_crimson, '76561198074087741', 'Electronica (Ö.H.)',
    47, 20, 9, 21, ROUND(4783.0/37,1), 4783, 2,
    0, 0, 0, 0, 7, 4, 3, 2);

  -- OGZK | K:36 D:28 A:10 HS:11 DMG:3494 ADR:94.4
  -- Map1(dust2): K17/D17/A6/HS7/DMG1805 | Map2(mirage): K19/D11/A4/HS4/DMG1689
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198044432985';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper,
    entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_crimson, '76561198044432985', 'OGZK',
    36, 28, 10, 11, ROUND(3494.0/37,1), 3494, 2,
    0, 0, 0, 0, 12, 7, 4, 2);

  -- cagrisakarya0 | K:30 D:30 A:9 HS:14 DMG:3283 ADR:88.7
  -- Map1(dust2): K19/D20/A5/HS9/DMG2291 | Map2(mirage): K11/D10/A4/HS5/DMG992
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199144890979';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper,
    entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_crimson, '76561199144890979', 'cagrisakarya0',
    30, 30, 9, 14, ROUND(3283.0/37,1), 3283, 2,
    0, 0, 0, 0, 6, 3, 2, 1);

  -- Captain (MG) | K:20 D:31 A:9 HS:13 DMG:2728 ADR:73.7
  -- Map1(dust2): K9/D20/A4/HS8/DMG1434 | Map2(mirage): K11/D11/A5/HS5/DMG1294
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198134625951';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper,
    entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_crimson, '76561198134625951', 'Captain (MG)',
    20, 31, 9, 13, ROUND(2728.0/37,1), 2728, 2,
    0, 0, 0, 0, 6, 2, 0, 0);

  -- Mr. Boombastic | K:12 D:30 A:8 HS:3 DMG:1407 ADR:38.0
  -- Map1(dust2): K4/D19/A3/HS2/DMG492 | Map2(mirage): K8/D11/A5/HS1/DMG915
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198340882003';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper,
    entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_crimson, '76561198340882003', 'Mr. Boombastic',
    12, 30, 8, 3, ROUND(1407.0/37,1), 1407, 2,
    0, 0, 0, 0, 8, 1, 0, 0);

  -- =========================================================
  -- GEGENPRES OYUNCULARI
  -- Pac, JakieS, Tarkan, Vendetta → 2 map (37r)
  -- BENETO (ECK) → 1 map (Map1, 22r)
  -- TRader (OK)  → 1 map (Map2, 15r)
  -- =========================================================

  -- Pac | K:42 D:27 A:10 HS:28 DMG:4395 ADR:118.8 (2 map, 37r)
  -- Map1(dust2): K27/D13/A9/HS18/DMG3068 | Map2(mirage): K15/D14/A1/HS10/DMG1327
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198192462155';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper,
    entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_gegen, '76561198192462155', 'Pac',
    42, 27, 10, 28, ROUND(4395.0/37,1), 4395, 2,
    0, 0, 0, 0, 8, 4, 2, 0);

  -- JakieS | K:38 D:30 A:9 HS:10 DMG:4342 ADR:117.4 (2 map, 37r)
  -- Map1(dust2): K25/D14/A4/HS4/DMG2601 | Map2(mirage): K13/D16/A5/HS6/DMG1741
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561199120455536';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper,
    entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_gegen, '76561199120455536', 'JakieS',
    38, 30, 9, 10, ROUND(4342.0/37,1), 4342, 2,
    0, 0, 0, 0, 16, 8, 3, 0);

  -- Altarın Oğlu Tarkan | K:21 D:28 A:5 HS:10 DMG:2324 ADR:62.8 (2 map, 37r)
  -- Map1(dust2): K14/D14/A1/HS7/DMG1361 | Map2(mirage): K7/D14/A4/HS3/DMG963
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198160862027';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper,
    entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_gegen, '76561198160862027', 'Altarın Oğlu Tarkan',
    21, 28, 5, 10, ROUND(2324.0/37,1), 2324, 2,
    0, 0, 0, 0, 7, 4, 4, 1);

  -- Vendetta | K:23 D:30 A:2 HS:12 DMG:2535 ADR:68.5 (2 map, 37r)
  -- Map1(dust2): K13/D16/A0/HS8/DMG1288 | Map2(mirage): K10/D14/A2/HS4/DMG1247
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198967300942';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper,
    entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_gegen, '76561198967300942', 'Vendetta',
    23, 30, 2, 12, ROUND(2535.0/37,1), 2535, 2,
    0, 0, 0, 0, 4, 4, 6, 0);

  -- BENETO (ECK) | K:10 D:15 A:6 HS:5 DMG:1476 ADR:67.1 (1 map, 22r — sadece Map1)
  -- Map1(dust2): K10/D15/A6/HS5/DMG1476
  INSERT INTO cs2_players (team_id, name, steam_id, is_active)
  VALUES (t_gegen, 'BENETO (ECK)', '76561198372270608', true)
  ON CONFLICT (steam_id) DO NOTHING;
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198372270608';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper,
    entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_gegen, '76561198372270608', 'BENETO (ECK)',
    10, 15, 6, 5, ROUND(1476.0/22,1), 1476, 1,
    0, 0, 0, 0, 2, 1, 0, 0);

  -- TRader (OK) | K:2 D:15 A:4 HS:0 DMG:484 ADR:32.3 (1 map, 15r — sadece Map2)
  -- Map2(mirage): K2/D15/A4/HS0/DMG484
  SELECT id INTO v_player FROM cs2_players WHERE steam_id = '76561198350960783';
  INSERT INTO cs2_match_players (map_id, player_id, team_id, steam_id, player_name,
    kills, deaths, assists, headshots, adr, damage_dealt, maps_played,
    mvps, score, kills_pistol, kills_sniper,
    entry_attempts, entry_successes, clutch_attempts, clutch_wins)
  VALUES (v_map, v_player, t_gegen, '76561198350960783', 'TRader (OK)',
    2, 15, 4, 0, ROUND(484.0/15,1), 484, 1,
    0, 0, 0, 0, 2, 1, 2, 0);

  RAISE NOTICE 'Import tamamlandı: CRIMSON REAPERS 2-1 GEGENPRES | Dust2: 10-12 | Mirage: 12-3 | Map3: walkover (GEGEN çekildi)';
END $$;

COMMIT;
