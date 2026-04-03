-- =============================================================================
-- Content Plans Table
-- İçerik planlama ve takvim yönetimi
-- =============================================================================

CREATE TABLE content_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content info
  title TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('VOICE', 'EDIT', 'STREAM')),
  planned_date DATE NOT NULL,

  -- Assignment
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Status & priority
  status TEXT NOT NULL DEFAULT 'PLANNED'
    CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'DONE', 'CANCELLED')),
  priority TEXT NOT NULL DEFAULT 'NORMAL'
    CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),

  -- Notes & link to work item when completed
  notes TEXT,
  work_item_id UUID REFERENCES work_items(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_content_plans_date ON content_plans(planned_date);
CREATE INDEX idx_content_plans_assigned ON content_plans(assigned_to);
CREATE INDEX idx_content_plans_status ON content_plans(status);

-- RLS
ALTER TABLE content_plans ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins full access on content_plans" ON content_plans
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Team members can view plans assigned to them
CREATE POLICY "Users view own content plans" ON content_plans
  FOR SELECT USING (assigned_to = auth.uid());

-- Team members can update status of their own plans
CREATE POLICY "Users update own content plan status" ON content_plans
  FOR UPDATE USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());
