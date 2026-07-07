-- YouTube OAuth (Analytics API) — stores the channel owner's refresh token.
-- Single row. Written/read only via the service-role admin client (RLS blocks
-- everyone else; service role bypasses RLS).

CREATE TABLE IF NOT EXISTS youtube_oauth (
  id INT PRIMARY KEY DEFAULT 1,
  refresh_token TEXT,
  connected_email TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT youtube_oauth_single_row CHECK (id = 1)
);

ALTER TABLE youtube_oauth ENABLE ROW LEVEL SECURITY;
-- No policies: only the service-role admin client (which bypasses RLS) touches it.
