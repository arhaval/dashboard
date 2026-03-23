-- =============================================================================
-- CS2 Turnuva Sistemi
-- Maç = Seri (Bo3/Bo5), her seri içinde birden fazla map
-- =============================================================================

-- Takımlar
CREATE TABLE cs2_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tag TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Oyuncular (takıma bağlı, Steam ID ile)
CREATE TABLE cs2_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES cs2_teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steam_id TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maçlar (seri seviyesi: X vs Y)
CREATE TABLE cs2_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team1_id UUID NOT NULL REFERENCES cs2_teams(id),
  team2_id UUID NOT NULL REFERENCES cs2_teams(id),
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'LIVE', 'FINISHED', 'CANCELLED')),
  winner_team_id UUID REFERENCES cs2_teams(id),
  match_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Map'ler (her maç içinde birden fazla map: Bo3 = 3 map)
CREATE TABLE cs2_match_maps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES cs2_matches(id) ON DELETE CASCADE,
  map_number INTEGER NOT NULL DEFAULT 1,
  map TEXT NOT NULL,
  team1_score INTEGER DEFAULT 0,
  team2_score INTEGER DEFAULT 0,
  rounds_played INTEGER DEFAULT 0,
  winner_team_id UUID REFERENCES cs2_teams(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(match_id, map_number)
);

-- Oyuncu İstatistikleri (map bazında)
CREATE TABLE cs2_match_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id UUID NOT NULL REFERENCES cs2_match_maps(id) ON DELETE CASCADE,
  player_id UUID REFERENCES cs2_players(id),
  team_id UUID NOT NULL REFERENCES cs2_teams(id),
  steam_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  kills INTEGER DEFAULT 0,
  deaths INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  mvps INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  headshots INTEGER DEFAULT 0,
  kills_pistol INTEGER DEFAULT 0,
  kills_sniper INTEGER DEFAULT 0,
  damage_dealt INTEGER DEFAULT 0,
  entry_attempts INTEGER DEFAULT 0,
  entry_successes INTEGER DEFAULT 0,
  clutch_attempts INTEGER DEFAULT 0,
  clutch_wins INTEGER DEFAULT 0,
  adr DECIMAL(5,1) DEFAULT 0,
  UNIQUE(map_id, steam_id)
);

-- Indexes
CREATE INDEX idx_cs2_players_team ON cs2_players(team_id);
CREATE INDEX idx_cs2_players_steam ON cs2_players(steam_id);
CREATE INDEX idx_cs2_matches_status ON cs2_matches(status);
CREATE INDEX idx_cs2_matches_date ON cs2_matches(match_date DESC);
CREATE INDEX idx_cs2_match_maps_match ON cs2_match_maps(match_id);
CREATE INDEX idx_cs2_match_players_map ON cs2_match_players(map_id);

-- =============================================================================
-- RLS: Okuma herkese, yazma admin-only
-- =============================================================================

ALTER TABLE cs2_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs2_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs2_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs2_match_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs2_match_players ENABLE ROW LEVEL SECURITY;

-- cs2_teams
CREATE POLICY "Anyone can read cs2_teams" ON cs2_teams
  FOR SELECT USING (true);
CREATE POLICY "Admin can insert cs2_teams" ON cs2_teams
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Admin can update cs2_teams" ON cs2_teams
  FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Admin can delete cs2_teams" ON cs2_teams
  FOR DELETE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));

-- cs2_players
CREATE POLICY "Anyone can read cs2_players" ON cs2_players
  FOR SELECT USING (true);
CREATE POLICY "Admin can insert cs2_players" ON cs2_players
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Admin can update cs2_players" ON cs2_players
  FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Admin can delete cs2_players" ON cs2_players
  FOR DELETE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));

-- cs2_matches
CREATE POLICY "Anyone can read cs2_matches" ON cs2_matches
  FOR SELECT USING (true);
CREATE POLICY "Admin can insert cs2_matches" ON cs2_matches
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Admin can update cs2_matches" ON cs2_matches
  FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Admin can delete cs2_matches" ON cs2_matches
  FOR DELETE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));

-- cs2_match_maps
CREATE POLICY "Anyone can read cs2_match_maps" ON cs2_match_maps
  FOR SELECT USING (true);
CREATE POLICY "Admin can insert cs2_match_maps" ON cs2_match_maps
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Admin can update cs2_match_maps" ON cs2_match_maps
  FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Admin can delete cs2_match_maps" ON cs2_match_maps
  FOR DELETE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));

-- cs2_match_players
CREATE POLICY "Anyone can read cs2_match_players" ON cs2_match_players
  FOR SELECT USING (true);
CREATE POLICY "Admin can insert cs2_match_players" ON cs2_match_players
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Admin can update cs2_match_players" ON cs2_match_players
  FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
CREATE POLICY "Admin can delete cs2_match_players" ON cs2_match_players
  FOR DELETE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
