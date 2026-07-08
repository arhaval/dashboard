-- Instagram OAuth (Graph API / Instagram Login) — stores the long-lived token.
-- Single row, written/read only via the service-role admin client.

CREATE TABLE IF NOT EXISTS instagram_oauth (
  id INT PRIMARY KEY DEFAULT 1,
  access_token TEXT,
  token_expires_at TIMESTAMPTZ,
  ig_user_id TEXT,
  username TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT instagram_oauth_single_row CHECK (id = 1)
);

ALTER TABLE instagram_oauth ENABLE ROW LEVEL SECURITY;
-- No policies: only the service-role admin client touches it.
