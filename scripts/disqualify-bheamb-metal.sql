-- BHEAMB ve METAL DIVISION Diskalifiye İşlemi
-- Hile nedeniyle elendiler
-- - Oynadıkları maçlar forfeit'e çevriliyor (rakibe 3-0)
-- - Pending maçları BAY olarak işaretleniyor (rakibe 3-0)
-- - Oyuncuları ve istatistikleri siliniyor
-- - Takımlar is_disqualified=true olarak işaretleniyor (UI'dan filtrelenecek)

BEGIN;

-- 1) is_disqualified kolonu yoksa ekle
ALTER TABLE cs2_teams ADD COLUMN IF NOT EXISTS is_disqualified BOOLEAN DEFAULT false;

-- 2) BHEAMB ve METAL DIVISION'ı diskalifiye olarak işaretle
UPDATE cs2_teams
SET is_disqualified = true
WHERE name IN ('BHEAMB', 'METAL DIVISION');

-- 3) BHEAMB/METAL oyuncularının tüm istatistiklerini sil
-- (Rakip takımların istatistikleri korunuyor)
DELETE FROM cs2_match_players
WHERE team_id IN (SELECT id FROM cs2_teams WHERE name IN ('BHEAMB', 'METAL DIVISION'));

-- 4) BHEAMB/METAL oyuncu kayıtlarını sil
DELETE FROM cs2_players
WHERE team_id IN (SELECT id FROM cs2_teams WHERE name IN ('BHEAMB', 'METAL DIVISION'));

-- 5) Maç sonuçlarını forfeit'e çevir
DO $$
DECLARE
  t_bheamb UUID;
  t_metal UUID;
  m RECORD;
  opposing_team UUID;
  match_team1_id UUID;
  match_team2_id UUID;
BEGIN
  SELECT id INTO t_bheamb FROM cs2_teams WHERE name = 'BHEAMB';
  SELECT id INTO t_metal FROM cs2_teams WHERE name = 'METAL DIVISION';

  -- FINISHED maçları forfeit olarak güncelle
  FOR m IN
    SELECT id, team1_id, team2_id, status
    FROM cs2_matches
    WHERE (team1_id IN (t_bheamb, t_metal) OR team2_id IN (t_bheamb, t_metal))
  LOOP
    -- Rakip takımı belirle
    IF m.team1_id IN (t_bheamb, t_metal) THEN
      opposing_team := m.team2_id;
    ELSE
      opposing_team := m.team1_id;
    END IF;

    -- Maçı 3-0 forfeit olarak güncelle
    UPDATE cs2_matches SET
      status = 'FINISHED',
      winner_team_id = opposing_team,
      team1_maps_won = CASE WHEN team1_id = opposing_team THEN 3 ELSE 0 END,
      team2_maps_won = CASE WHEN team2_id = opposing_team THEN 3 ELSE 0 END,
      notes = CASE
        WHEN status = 'PENDING' THEN 'BAY - rakip takım elendi'
        ELSE 'Forfeit - rakip takım elendi'
      END
    WHERE id = m.id;

    -- Container map kaydını güncelle
    SELECT team1_id, team2_id INTO match_team1_id, match_team2_id FROM cs2_matches WHERE id = m.id;

    UPDATE cs2_match_maps SET
      team1_score = CASE WHEN match_team1_id = opposing_team THEN 3 ELSE 0 END,
      team2_score = CASE WHEN match_team2_id = opposing_team THEN 3 ELSE 0 END,
      winner_team_id = opposing_team,
      rounds_played = 0,
      dathost_status = 'FINISHED'
    WHERE match_id = m.id;

    -- Eğer hiç match_maps kaydı yoksa (pending idiyse) yeni bir tane ekle
    IF NOT EXISTS (SELECT 1 FROM cs2_match_maps WHERE match_id = m.id) THEN
      INSERT INTO cs2_match_maps (match_id, map, map_number, team1_score, team2_score, rounds_played, winner_team_id, dathost_status)
      VALUES (
        m.id,
        'series',
        1,
        CASE WHEN match_team1_id = opposing_team THEN 3 ELSE 0 END,
        CASE WHEN match_team2_id = opposing_team THEN 3 ELSE 0 END,
        0,
        opposing_team,
        'FINISHED'
      );
    END IF;
  END LOOP;

  RAISE NOTICE 'Diskalifiye tamamlandı: BHEAMB ve METAL DIVISION';
END $$;

COMMIT;
