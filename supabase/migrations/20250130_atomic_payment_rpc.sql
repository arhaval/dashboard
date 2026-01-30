-- =============================================================================
-- Atomic Payment RPC Functions
-- Ensures data integrity for payment lifecycle operations
-- =============================================================================

-- =============================================================================
-- 1. RPC: Create Payment from Work Items (Atomic & Idempotent)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_create_payment_from_work_items(
  p_admin_user_id UUID,
  p_target_user_id UUID,
  p_work_item_ids UUID[],
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_admin_role TEXT;
  v_work_item RECORD;
  v_total_amount DECIMAL(10,2) := 0;
  v_item_count INT := 0;
  v_existing_payment_id UUID;
  v_new_payment_id UUID;
  v_work_item_id UUID;
BEGIN
  -- 1. Verify admin role
  SELECT role INTO v_admin_role
  FROM public.users
  WHERE id = p_admin_user_id;

  IF v_admin_role IS NULL OR v_admin_role != 'ADMIN' THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- 2. Prevent admin from creating payment for themselves
  IF p_admin_user_id = p_target_user_id THEN
    RAISE EXCEPTION 'Cannot create payment for yourself';
  END IF;

  -- 3. Validate work items array is not empty
  IF array_length(p_work_item_ids, 1) IS NULL OR array_length(p_work_item_ids, 1) = 0 THEN
    RAISE EXCEPTION 'No work items provided';
  END IF;

  -- 4. Check for existing payments (idempotency)
  -- If ALL provided work items already have the SAME payment, return that payment
  SELECT DISTINCT pi.payment_id INTO v_existing_payment_id
  FROM payment_items pi
  WHERE pi.work_item_id = ANY(p_work_item_ids);

  IF v_existing_payment_id IS NOT NULL THEN
    -- Check if ALL work items belong to this same payment
    IF (
      SELECT COUNT(DISTINCT pi.payment_id)
      FROM payment_items pi
      WHERE pi.work_item_id = ANY(p_work_item_ids)
    ) = 1 THEN
      -- All items belong to same payment - return it (idempotent)
      RETURN v_existing_payment_id;
    ELSE
      -- Some items have different payments or mixed state
      RAISE EXCEPTION 'One or more work items already have different payments';
    END IF;
  END IF;

  -- 5. Lock and validate work items
  FOR v_work_item IN
    SELECT wi.id, wi.user_id, wi.status, wi.cost
    FROM work_items wi
    WHERE wi.id = ANY(p_work_item_ids)
    FOR UPDATE
  LOOP
    -- Verify ownership
    IF v_work_item.user_id != p_target_user_id THEN
      RAISE EXCEPTION 'Work item % does not belong to target user', v_work_item.id;
    END IF;

    -- Verify status is APPROVED
    IF v_work_item.status != 'APPROVED' THEN
      RAISE EXCEPTION 'Work item % is not in APPROVED status (current: %)', v_work_item.id, v_work_item.status;
    END IF;

    -- Verify cost exists
    IF v_work_item.cost IS NULL OR v_work_item.cost <= 0 THEN
      RAISE EXCEPTION 'Work item % has no valid cost', v_work_item.id;
    END IF;

    v_total_amount := v_total_amount + v_work_item.cost;
    v_item_count := v_item_count + 1;
  END LOOP;

  -- Verify all requested items were found
  IF v_item_count != array_length(p_work_item_ids, 1) THEN
    RAISE EXCEPTION 'Not all work items were found. Expected %, found %',
      array_length(p_work_item_ids, 1), v_item_count;
  END IF;

  -- 6. Create payment record
  INSERT INTO payments (user_id, amount, payment_date, notes, status)
  VALUES (p_target_user_id, v_total_amount, CURRENT_DATE, p_notes, 'PENDING')
  RETURNING id INTO v_new_payment_id;

  -- 7. Create payment items (link work items to payment)
  FOREACH v_work_item_id IN ARRAY p_work_item_ids
  LOOP
    INSERT INTO payment_items (payment_id, work_item_id)
    VALUES (v_new_payment_id, v_work_item_id);
  END LOOP;

  RETURN v_new_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.rpc_create_payment_from_work_items(UUID, UUID, UUID[], TEXT) TO authenticated;


-- =============================================================================
-- 2. RPC: Mark Payment as Paid (Atomic)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_mark_payment_paid(
  p_admin_user_id UUID,
  p_payment_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_admin_role TEXT;
  v_payment RECORD;
  v_user_name TEXT;
  v_work_item_ids UUID[];
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

  -- 8. Create transaction record (EXPENSE)
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

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.rpc_mark_payment_paid(UUID, UUID) TO authenticated;


-- =============================================================================
-- 3. RPC: Cancel Payment (Atomic)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.rpc_cancel_payment(
  p_admin_user_id UUID,
  p_payment_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_admin_role TEXT;
  v_payment RECORD;
  v_work_item_ids UUID[];
BEGIN
  -- 1. Verify admin role
  SELECT role INTO v_admin_role
  FROM public.users
  WHERE id = p_admin_user_id;

  IF v_admin_role IS NULL OR v_admin_role != 'ADMIN' THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- 2. Lock and fetch payment
  SELECT p.id, p.user_id, p.status
  INTO v_payment
  FROM payments p
  WHERE p.id = p_payment_id
  FOR UPDATE;

  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  -- 3. Verify payment is PENDING (only PENDING can be cancelled)
  IF v_payment.status != 'PENDING' THEN
    RAISE EXCEPTION 'Payment is %, cannot cancel', v_payment.status;
  END IF;

  -- 4. Get linked work item IDs
  SELECT array_agg(pi.work_item_id) INTO v_work_item_ids
  FROM payment_items pi
  WHERE pi.payment_id = p_payment_id;

  -- 5. Update payment status to CANCELLED
  UPDATE payments
  SET status = 'CANCELLED'
  WHERE id = p_payment_id;

  -- 6. Revert work items back to APPROVED (if they were tied to this payment)
  -- Note: Work items should still be in APPROVED state since payment was PENDING
  -- But we ensure they stay APPROVED in case of any inconsistency
  IF v_work_item_ids IS NOT NULL AND array_length(v_work_item_ids, 1) > 0 THEN
    -- Only update if somehow they got to PAID (safety measure)
    UPDATE work_items
    SET status = 'APPROVED'
    WHERE id = ANY(v_work_item_ids)
    AND status = 'PAID';
  END IF;

  -- Note: We do NOT create any transaction for cancelled payments
  -- Note: We do NOT delete payment_items - they serve as audit trail

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.rpc_cancel_payment(UUID, UUID) TO authenticated;


-- =============================================================================
-- Add unique constraint to prevent duplicate payment items
-- =============================================================================

-- This ensures a work item can only be in one payment at a time
-- (already exists in initial schema but adding IF NOT EXISTS for safety)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_items_work_item_id_key'
  ) THEN
    ALTER TABLE payment_items ADD CONSTRAINT payment_items_work_item_id_key UNIQUE (work_item_id);
  END IF;
END $$;
