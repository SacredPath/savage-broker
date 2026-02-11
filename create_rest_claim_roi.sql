-- ROI Claim RPC Function
-- This function handles claiming ROI from matured investment positions

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS public.rest_claim_roi(BIGINT);
DROP FUNCTION IF EXISTS public.calculate_position_roi();

CREATE OR REPLACE FUNCTION public.rest_claim_roi(
    p_position_id BIGINT DEFAULT NULL -- NULL means claim all available ROI
)
RETURNS JSONB AS $$
DECLARE
    v_current_user_id UUID;
    v_positions_to_claim BIGINT[];
    v_total_claimable DECIMAL(20,8) DEFAULT 0;
    v_total_claimed DECIMAL(20,8) DEFAULT 0;
    v_position RECORD;
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
    
    -- If specific position ID provided, validate it belongs to user
    IF p_position_id IS NOT NULL THEN
        SELECT id INTO v_total_claimable -- Using this variable temporarily for validation
        FROM public.user_positions
        WHERE id = p_position_id 
        AND user_id = v_current_user_id
        AND status = 'matured'
        AND accrued_roi > 0;
        
        IF v_total_claimable IS NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Position not found or not eligible for ROI claim'
            );
        END IF;
        
        v_positions_to_claim := ARRAY[p_position_id];
    ELSE
        -- Get all matured positions with claimable ROI
        SELECT ARRAY_AGG(id) INTO v_positions_to_claim
        FROM public.user_positions
        WHERE user_id = v_current_user_id 
        AND status = 'matured'
        AND accrued_roi > 0;
    END IF;
    
    -- Check if there are positions to claim
    IF v_positions_to_claim IS NULL OR array_length(v_positions_to_claim, 1) = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No claimable ROI found',
            'message', 'You have no matured positions with available ROI'
        );
    END IF;
    
    -- Calculate total claimable amount
    SELECT COALESCE(SUM(accrued_roi), 0) INTO v_total_claimable
    FROM public.user_positions
    WHERE id = ANY(v_positions_to_claim);
    
    -- Process each position claim
    FOR v_position IN 
        SELECT id, accrued_roi, tier_id, amount
        FROM public.user_positions
        WHERE id = ANY(v_positions_to_claim)
    LOOP
        -- Update position to mark ROI as claimed
        UPDATE public.user_positions
        SET accrued_roi = 0,
            last_roi_calculation = NOW()
        WHERE id = v_position.id;
        
        v_total_claimed := v_total_claimed + v_position.accrued_roi;
        
        -- Here you would typically:
        -- 1. Add the claimed amount to user's wallet balance
        -- 2. Create a transaction record
        -- 3. Send notification
        
        -- For now, we'll just log the transaction
        RAISE NOTICE 'ROI claimed: User %, Position %, Amount %', 
            v_current_user_id, v_position.id, v_position.accrued_roi;
    END LOOP;
    
    -- Build success response
    v_result := jsonb_build_object(
        'success', true,
        'message', 'ROI successfully claimed',
        'total_claimed', v_total_claimed,
        'claimed_amount', v_total_claimed,
        'positions_count', array_length(v_positions_to_claim, 1),
        'claimed_positions', v_positions_to_claim
    );
    
    -- Add transaction details
    v_result := v_result || jsonb_build_object(
        'transaction_type', 'roi_claim',
        'currency', 'USDT',
        'timestamp', NOW()
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to calculate and update ROI for all active positions
CREATE OR REPLACE FUNCTION public.calculate_position_roi()
RETURNS JSONB AS $$
DECLARE
    v_position RECORD;
    v_days_elapsed INTEGER;
    v_daily_roi DECIMAL(10,8);
    v_new_roi DECIMAL(20,8);
    v_updated_count INTEGER DEFAULT 0;
    v_result JSONB;
BEGIN
    -- Process each active position
    FOR v_position IN 
        SELECT 
            up.id,
            up.user_id,
            up.amount,
            up.accrued_roi,
            up.opened_at,
            up.last_roi_calculation,
            it.daily_roi,
            it.investment_period_days
        FROM public.user_positions up
        JOIN public.investment_tiers it ON up.tier_id = it.id
        WHERE up.status = 'active'
        AND (
            up.last_roi_calculation IS NULL 
            OR up.last_roi_calculation < CURRENT_DATE
        )
    LOOP
        -- Calculate days since last ROI calculation (or since opening if never calculated)
        IF v_position.last_roi_calculation IS NULL THEN
            v_days_elapsed := CURRENT_DATE - v_position.opened_at::DATE;
        ELSE
            v_days_elapsed := CURRENT_DATE - v_position.last_roi_calculation::DATE;
        END IF;
        
        -- Don't calculate beyond the investment period
        IF v_days_elapsed > v_position.investment_period_days THEN
            v_days_elapsed := v_position.investment_period_days;
        END IF;
        
        -- Calculate new ROI for this period
        v_new_roi := v_position.amount * v_position.daily_roi * v_days_elapsed;
        
        -- Update position with new ROI
        UPDATE public.user_positions
        SET accrued_roi = accrued_roi + v_new_roi,
            last_roi_calculation = CURRENT_DATE
        WHERE id = v_position.id;
        
        v_updated_count := v_updated_count + 1;
        
        RAISE NOTICE 'ROI calculated: Position %, Days %, New ROI %', 
            v_position.id, v_days_elapsed, v_new_roi;
    END LOOP;
    
    -- Check for positions that have matured
    UPDATE public.user_positions
    SET status = 'matured'
    WHERE status = 'active'
    AND matures_at <= NOW();
    
    -- Build result
    v_result := jsonb_build_object(
        'success', true,
        'message', 'ROI calculation completed',
        'positions_updated', v_updated_count,
        'timestamp', NOW()
    );
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.rest_claim_roi TO authenticated;
GRANT EXECUTE ON FUNCTION public.rest_claim_roi TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_position_roi TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_position_roi TO service_role;
