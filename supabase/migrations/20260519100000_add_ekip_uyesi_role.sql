-- Add EKİP_ÜYESİ and GRAFIKER roles to user_role enum
-- EKİP_ÜYESİ: general team member — limited dashboard access, no matches
-- GRAFIKER: designer role (was already in app code, now synced to DB)

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'GRAFIKER';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'TEAM_MEMBER';
