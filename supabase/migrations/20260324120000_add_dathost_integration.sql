-- ============================================================
-- DatHost Integration: match_maps alanları, sunucular, event log
-- ============================================================

-- 1a. cs2_match_maps tablosuna DatHost alanları
ALTER TABLE cs2_match_maps ADD COLUMN dathost_match_id TEXT;
ALTER TABLE cs2_match_maps ADD COLUMN dathost_status TEXT DEFAULT NULL
  CHECK (dathost_status IN (
    'CREATED', 'WAITING_PLAYERS', 'LIVE', 'FINISHED', 'CANCELLED', 'FAILED'
  ));
ALTER TABLE cs2_match_maps ADD COLUMN ended_at TIMESTAMPTZ;
CREATE INDEX idx_cs2_match_maps_dathost ON cs2_match_maps(dathost_match_id);

-- Aynı seri için aynı anda yalnızca 1 aktif DatHost map
CREATE UNIQUE INDEX idx_cs2_match_maps_one_active_dathost
  ON cs2_match_maps(match_id)
  WHERE dathost_status IN ('CREATED', 'WAITING_PLAYERS', 'LIVE');

-- 1b. DatHost sunucu kayıtları
CREATE TABLE dathost_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dathost_server_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  server_status TEXT DEFAULT 'IDLE'
    CHECK (server_status IN ('IDLE', 'IN_MATCH', 'OFFLINE')),
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE dathost_servers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_dathost_servers" ON dathost_servers
  FOR SELECT USING (true);
CREATE POLICY "admin_manage_dathost_servers" ON dathost_servers
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));

-- 1c. DatHost webhook event log (idempotency + audit)
CREATE TABLE dathost_event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dathost_match_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  processed BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_dathost_event_log_idempotent
  ON dathost_event_log(dathost_match_id, event_type);
CREATE INDEX idx_dathost_event_log_unprocessed
  ON dathost_event_log(processed) WHERE processed = false;

ALTER TABLE dathost_event_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_dathost_event_log" ON dathost_event_log
  FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));
