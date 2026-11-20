-- Müşteri/ortak bazlı otomatik fiyatlandırma.
--
-- Neden: işlerin fiyatı sadece "iş türü" değil, aynı zamanda KİM yaptığı ve
-- KİMİN İÇİN yapıldığı ile değişiyor. Örnek: Engin'in yayını Arhaval için bir
-- ücret, Sangal için başka bir ücret. Sangal işinde parayı Sangal öder (Arhaval
-- aradan geçer), şu an kâr yok ama ileride olabilir.
--
-- Model:
--   clients      → müşteri/ortak listesi (Arhaval'in kendisi = iç iş)
--   rate_cards   → (kişi × iş türü × uzunluk × müşteri) başına fiyat
--                  pay_amount  = çalışanın hak edişi (Arhaval öder)
--                  bill_amount = müşterinin ödediği (dış ortak faturası)
--                  kâr = bill_amount - pay_amount  (şu an 0: ikisi eşit)
--   work_items   → client_id (kimin için) + bill_amount (müşteri ücreti)
--
-- Güvenlik: rate_cards fiyat bilgisi hassastır. Çalışan yalnızca KENDİ fiyatını
-- görebilir; başkalarınınkini asla. Admin hepsini yönetir.

-- ── 1. Müşteriler / İş ortakları ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS clients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  -- true: Arhaval'in kendi işi (faturalama yok, sadece gider)
  -- false: dış ortak (Sangal gibi) — müşteri öder, Arhaval aradan geçer
  is_internal BOOLEAN NOT NULL DEFAULT false,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_active ON clients(is_active);

COMMENT ON TABLE clients IS
  'Müşteri/iş ortağı listesi. is_internal=true → Arhaval kendi işi; false → dış ortak (Sangal vb.).';

-- Varsayılan iç müşteri: Arhaval. İş ortağı seçilmeyen işler buna bağlanır.
INSERT INTO clients (name, is_internal, notes)
SELECT 'Arhaval', true, 'Varsayılan iç iş — Arhaval''ın kendi içerik ve yayınları.'
WHERE NOT EXISTS (SELECT 1 FROM clients WHERE is_internal = true);

-- ── 2. Fiyat kartları (rate cards) ───────────────────────────────────────────
-- Her satır: belirli kişi, belirli müşteri için belirli iş türünün (opsiyonel
-- uzunluk) fiyatı. content_length NULL = o iş türünün tüm uzunlukları için
-- geçerli (örn. yayında uzunluk kavramı yok).

CREATE TABLE IF NOT EXISTS rate_cards (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id      UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  work_type      work_type NOT NULL,
  content_length content_length,            -- NULL → her uzunluk için geçerli
  pay_amount     DECIMAL(10,2) NOT NULL,     -- çalışanın hak edişi
  bill_amount    DECIMAL(10,2),              -- müşterinin ödediği (dış ortak)
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Aynı (kişi, müşteri, iş türü, uzunluk) için tek fiyat. PG15+ NULLS NOT
-- DISTINCT sayesinde NULL uzunluk da tekil sayılır.
CREATE UNIQUE INDEX IF NOT EXISTS uq_rate_card
  ON rate_cards (user_id, client_id, work_type, content_length) NULLS NOT DISTINCT;

CREATE INDEX IF NOT EXISTS idx_rate_cards_user ON rate_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_rate_cards_client ON rate_cards(client_id);

COMMENT ON TABLE rate_cards IS
  'Kişi × müşteri × iş türü (× uzunluk) başına fiyat. pay=çalışan hak edişi, bill=müşteri ücreti.';

-- ── 3. work_items: müşteri + müşteri ücreti ──────────────────────────────────

ALTER TABLE work_items
  ADD COLUMN IF NOT EXISTS client_id   UUID REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bill_amount DECIMAL(10,2);

CREATE INDEX IF NOT EXISTS idx_work_items_client ON work_items(client_id);

COMMENT ON COLUMN work_items.bill_amount IS
  'Dış ortak işlerinde müşterinin ödediği tutar. İç işte NULL. Kâr = bill_amount - cost.';

-- ── 4. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_cards ENABLE ROW LEVEL SECURITY;

-- Müşteriler: herkes okuyabilir (iş girişinde seçim için), sadece admin yazar.
DROP POLICY IF EXISTS "clients_read_authenticated" ON clients;
CREATE POLICY "clients_read_authenticated" ON clients
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "clients_write_admin" ON clients;
CREATE POLICY "clients_write_admin" ON clients
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Fiyat kartları: çalışan YALNIZCA kendi fiyatını görür; admin hepsini yönetir.
DROP POLICY IF EXISTS "rate_cards_read_own" ON rate_cards;
CREATE POLICY "rate_cards_read_own" ON rate_cards
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

DROP POLICY IF EXISTS "rate_cards_write_admin" ON rate_cards;
CREATE POLICY "rate_cards_write_admin" ON rate_cards
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ── 5. Ödeme RPC: dış ortak geliri ───────────────────────────────────────────
-- Mevcut fonksiyon ödeme onaylanınca çalışana ödenen tutarı GİDER olarak
-- yazıyordu. Dış ortak işlerinde ayrıca ortaktan gelen tutarı GELİR olarak
-- yazıyoruz; böylece defter dengeli kalır ve kâr = gelir - gider doğru görünür
-- (şu an pay=bill olduğu için net 0). Fonksiyonun geri kalanı birebir aynı.

CREATE OR REPLACE FUNCTION public.rpc_mark_payment_paid(
  p_admin_user_id UUID,
  p_payment_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_admin_role TEXT;
  v_payment RECORD;
  v_work_item_ids UUID[];
  v_partner_income DECIMAL(10,2);
BEGIN
  -- 1. Verify admin role
  SELECT role INTO v_admin_role
  FROM public.users
  WHERE id = p_admin_user_id;

  IF v_admin_role IS NULL OR v_admin_role != 'ADMIN' THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- 2. Lock and fetch payment
  SELECT p.id, p.user_id, p.amount, p.status, u.full_name
  INTO v_payment
  FROM payments p
  JOIN users u ON u.id = p.user_id
  WHERE p.id = p_payment_id
  FOR UPDATE;

  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  -- 3. Verify payment is PENDING
  IF v_payment.status != 'PENDING' THEN
    RAISE EXCEPTION 'Payment is %, cannot mark as paid', v_payment.status;
  END IF;

  -- 4. Prevent admin from paying themselves
  IF v_payment.user_id = p_admin_user_id THEN
    RAISE EXCEPTION 'Cannot mark your own payment as paid';
  END IF;

  -- 5. Get linked work item IDs
  SELECT array_agg(pi.work_item_id) INTO v_work_item_ids
  FROM payment_items pi
  WHERE pi.payment_id = p_payment_id;

  -- 6. Update payment status to PAID
  UPDATE payments
  SET status = 'PAID'
  WHERE id = p_payment_id;

  -- 7. Update all linked work items to PAID status
  IF v_work_item_ids IS NOT NULL AND array_length(v_work_item_ids, 1) > 0 THEN
    UPDATE work_items
    SET status = 'PAID'
    WHERE id = ANY(v_work_item_ids);
  END IF;

  -- 8. Create transaction record (EXPENSE) — çalışana ödenen
  INSERT INTO transactions (
    type,
    category,
    amount,
    description,
    transaction_date,
    payment_id,
    user_id
  )
  VALUES (
    'EXPENSE',
    'Team Payments',
    v_payment.amount,
    'Payment to ' || v_payment.full_name,
    CURRENT_DATE,
    p_payment_id,
    v_payment.user_id
  );

  -- 9. Dış ortak geliri (INCOME) — bu ödemedeki dış ortak işlerinde müşterinin
  -- ödediği tutar toplamı. Sadece is_internal=false müşteriler ve bill_amount
  -- dolu işler sayılır. 0 ise gelir kaydı oluşturmayız.
  IF v_work_item_ids IS NOT NULL AND array_length(v_work_item_ids, 1) > 0 THEN
    SELECT COALESCE(SUM(wi.bill_amount), 0) INTO v_partner_income
    FROM work_items wi
    JOIN clients c ON c.id = wi.client_id
    WHERE wi.id = ANY(v_work_item_ids)
      AND c.is_internal = false
      AND wi.bill_amount IS NOT NULL;

    IF v_partner_income > 0 THEN
      INSERT INTO transactions (
        type,
        category,
        amount,
        description,
        transaction_date,
        payment_id,
        user_id
      )
      VALUES (
        'INCOME',
        'Partner Billing',
        v_partner_income,
        'Partner billing for ' || v_payment.full_name,
        CURRENT_DATE,
        p_payment_id,
        v_payment.user_id
      );
    END IF;
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.rpc_mark_payment_paid(UUID, UUID) TO authenticated;
