-- Merkezi rol yetki sistemi: her rolün erişebileceği sayfalar (page key'leri).
-- Satır yoksa kod içindeki DEFAULT_PAGES geçerli olur (mevcut davranış korunur).
-- ADMIN her zaman her şeye erişir (DB'de tutulmaz). Erişim yalnız admin client.
CREATE TABLE IF NOT EXISTS role_access (
  role TEXT PRIMARY KEY,               -- PUBLISHER | EDITOR | VOICE | GRAFIKER | TEAM_MEMBER
  pages TEXT[] NOT NULL DEFAULT '{}',  -- izin verilen sayfa key'leri
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE role_access ENABLE ROW LEVEL SECURITY;
