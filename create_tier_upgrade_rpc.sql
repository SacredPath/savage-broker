-- Tier Upgrade RPC Function
-- This function handles upgrading users to higher investment tiers

-- Drop all existing versions of the function by querying pg_proc
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT oid::regprocedure AS func_signature
        FROM pg_proc 
        WHERE proname = 'tier_upgrade_rpc' 
        AND pronamespace = 'public'::regnamespace
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.signature;
        RAISE NOTICE 'Dropped function: %', func_record.signature;
    END LOOP;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error dropping functions: %', SQLERRM;
END $$;

-- Create function with a temporary name first
CREATE OR REPLACE FUNCTION public.tier_upgrade_rpc_temp(
    p_target_tier_id BIGINT,
    p_auto_claim_roi BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
    v_current_user_id UUID;
    v_target_tier RECORD;
    v_current_positions DECIMAL(20,8) DEFAULT 0;
    v_total_equity DECIMAL(20,8) DEFAULT 0;
    v_current_tier_id BIGINT;
    v_new_position_id BIGINT;
    v_claimed_amount DECIMAL(20,8) DEFAULT 0;
    v_result JSONB;
BEGIN
    -- Get current user ID
    v_current_user_id := auth.uid();
    IF v_current_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not authenticated'
        );
    END IF;
    
    -- Get target tier information
    SELECT * INTO v_target_tier
    FROM public.investment_tiers
    WHERE id = p_target_tier_id AND is_active = true;
    
    IF v_target_tier IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid target tier'
        );
    END IF;
    
    -- Calculate current user's total equity from active positions
    SELECT COALESCE(SUM(amount), 0) INTO v_total_equity
    FROM public.user_positions
    WHERE user_id = v_current_user_id AND status = 'active';
    
    -- Check if user qualifies for the target tier
    IF v_total_equity < v_target_tier.min_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient equity for tier upgrade',
            'required_amount', v_target_tier.min_amount,
            'current_equity', v_total_equity,
            'shortfall', v_target_tier.min_amount - v_total_equity
        );
    END IF;
    
    -- Get current highest tier
    SELECT COALESCE(MAX(tier_id), 1) INTO v_current_tier_id
    FROM public.user_positions
    WHERE user_id = v_current_user_id AND status = 'active';
    
    -- Check if user is already at or above target tier
    IF v_current_tier_id >= p_target_tier_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User is already at this tier or higher',
            'current_tier', v_current_tier_id,
            'target_tier', p_target_tier_id
        );
    END IF;
    
    -- Auto-claim ROI if requested
    IF p_auto_claim_roi THEN
        -- Calculate total claimable ROI from matured positions
        SELECT COALESCE(SUM(accrued_roi), 0) INTO v_claimed_amount
        FROM public.user_positions
        WHERE user_id = v_current_user_id 
        AND status = 'matured'
        AND accrued_roi > 0;
        
        -- Mark positions as closed and ROI as claimed
        UPDATE public.user_positions
        SET status = 'closed', 
            closed_at = NOW(),
            accrued_roi = 0
        WHERE user_id = v_current_user_id 
        AND status = 'matured'
        AND accrued_roi > 0;
    END IF;
    
    -- Create new position in target tier
    INSERT INTO public.user_positions (
        user_id,
        tier_id,
        amount,
        currency,
        status,
        symbol,
        position_type,
        entry_price,
        current_price,
        quantity
    ) VALUES (
        v_current_user_id,
        p_target_tier_id,
        v_total_equity,
        'USDT',
        'active',
        'USDT',
        'long',
        1.0,
        1.0,
        v_total_equity
    ) RETURNING id INTO v_new_position_id;
    
    -- Close old positions
    UPDATE public.user_positions
    SET status = 'closed', 
        closed_at = NOW()
    WHERE user_id = v_current_user_id 
    AND tier_id < p_target_tier_id
    AND status = 'active';
    
    -- Build success response
    v_result := jsonb_build_object(
        'success', true,
        'message', 'Successfully upgraded to tier',
        'new_tier_id', p_target_tier_id,
        'new_tier_name', v_target_tier.name,
        'position_id', v_new_position_id,
        'invested_amount', v_total_equity,
        'previous_tier_id', v_current_tier_id
    );
    
    -- Add claim information if applicable
    IF p_auto_claim_roi AND v_claimed_amount > 0 THEN
        v_result := v_result || jsonb_build_object(
            'claimed_amount', v_claimed_amount,
            'roi_claimed', true
        );
    END IF;
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now rename the function to the correct name
DO $$
BEGIN
    DROP FUNCTION IF EXISTS public.tier_upgrade_rpc(BIGINT, BOOLEAN);
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

ALTER FUNCTION public.tier_upgrade_rpc_temp(BIGINT, BOOLEAN) RENAME TO tier_upgrade_rpc;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.tier_upgrade_rpc TO authenticated;
GRANT EXECUTE ON FUNCTION public.tier_upgrade_rpc TO service_role;
