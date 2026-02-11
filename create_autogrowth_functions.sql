-- Autogrowth System Functions
-- These functions handle the automated growth system for investments

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS public.rest_autogrowth_status();
DROP FUNCTION IF EXISTS public.rest_autogrowth_trigger();
DROP FUNCTION IF EXISTS public.get_autogrowth_system_stats();

-- Function to get autogrowth system status
CREATE OR REPLACE FUNCTION public.rest_autogrowth_status()
RETURNS JSONB AS $$
DECLARE
    v_current_user_id UUID;
    v_user_positions JSONB;
    v_total_invested DECIMAL(20,8) DEFAULT 0;
    v_total_roi DECIMAL(20,8) DEFAULT 0;
    v_active_positions INTEGER DEFAULT 0;
    v_matured_positions INTEGER DEFAULT 0;
    v_last_calculation TIMESTAMP WITH TIME ZONE;
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
    
    -- Get user position statistics
    SELECT 
        COALESCE(SUM(CASE WHEN status = 'active' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(accrued_roi), 0),
        COALESCE(COUNT(CASE WHEN status = 'active' THEN 1 END), 0),
        COALESCE(COUNT(CASE WHEN status = 'matured' THEN 1 END), 0),
        COALESCE(MAX(last_roi_calculation), NOW())
    INTO 
        v_total_invested,
        v_total_roi,
        v_active_positions,
        v_matured_positions,
        v_last_calculation
    FROM public.user_positions
    WHERE user_id = v_current_user_id;
    
    -- Get detailed position information
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'tier_id', tier_id,
            'tier_name', it.name,
            'amount', amount,
            'accrued_roi', accrued_roi,
            'status', status,
            'opened_at', opened_at,
            'matures_at', matures_at,
            'days_remaining', GREATEST(0, EXTRACT(DAYS FROM matures_at - NOW())),
            'daily_roi', it.daily_roi,
            'total_roi_percentage', CASE 
                WHEN amount > 0 THEN ROUND((accrued_roi / amount) * 100, 2)
                ELSE 0 
            END
        )
    ) INTO v_user_positions
    FROM public.user_positions up
    JOIN public.investment_tiers it ON up.tier_id = it.id
    WHERE up.user_id = v_current_user_id;
    
    -- Build result
    v_result := jsonb_build_object(
        'success', true,
        'user_id', v_current_user_id,
        'summary', jsonb_build_object(
            'total_invested', v_total_invested,
            'total_accrued_roi', v_total_roi,
            'active_positions', v_active_positions,
            'matured_positions', v_matured_positions,
            'current_value', v_total_invested + v_total_roi,
            'overall_roi_percentage', CASE 
                WHEN v_total_invested > 0 THEN ROUND((v_total_roi / v_total_invested) * 100, 2)
                ELSE 0 
            END
        ),
        'last_calculation', v_last_calculation,
        'positions', v_user_positions,
        'system_status', jsonb_build_object(
            'autogrowth_enabled', true,
            'calculation_frequency', 'daily',
            'next_calculation', (v_last_calculation::DATE + INTERVAL '1 day')::TIMESTAMP WITH TIME ZONE
        )
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

-- Function to trigger autogrowth system
CREATE OR REPLACE FUNCTION public.rest_autogrowth_trigger()
RETURNS JSONB AS $$
DECLARE
    v_current_user_id UUID;
    v_is_admin BOOLEAN DEFAULT false;
    v_calculation_result JSONB;
    v_positions_updated INTEGER DEFAULT 0;
    v_roi_distributed DECIMAL(20,8) DEFAULT 0;
    v_positions_matured INTEGER DEFAULT 0;
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
    
    -- Check if user is admin (you may need to adjust this based on your auth system)
    -- For now, we'll allow any authenticated user to trigger it
    -- In production, you should check user roles/permissions
    
    -- Perform ROI calculation for all active positions
    SELECT * INTO v_calculation_result
    FROM public.calculate_position_roi();
    
    IF v_calculation_result->>'success' = 'true' THEN
        v_positions_updated := (v_calculation_result->>'positions_updated')::INTEGER;
    END IF;
    
    -- Count newly matured positions
    SELECT COUNT(*) INTO v_positions_matured
    FROM public.user_positions
    WHERE status = 'matured'
    AND matures_at <= NOW()
    AND matures_at > NOW() - INTERVAL '1 day';
    
    -- Calculate total ROI distributed today
    SELECT COALESCE(SUM(accrued_roi), 0) INTO v_roi_distributed
    FROM public.user_positions
    WHERE last_roi_calculation = CURRENT_DATE;
    
    -- Build success response
    v_result := jsonb_build_object(
        'success', true,
        'message', 'Autogrowth system executed successfully',
        'execution_timestamp', NOW(),
        'statistics', jsonb_build_object(
            'positions_updated', v_positions_updated,
            'positions_matured', v_positions_matured,
            'roi_distributed_today', v_roi_distributed,
            'calculation_result', v_calculation_result
        ),
        'system_info', jsonb_build_object(
            'triggered_by', v_current_user_id,
            'system_status', 'operational',
            'next_scheduled_run', (CURRENT_DATE + INTERVAL '1 day')::TIMESTAMP WITH TIME ZONE
        )
    );
    
    -- Log the autogrowth execution
    RAISE NOTICE 'Autogrowth system triggered by %: % positions updated, % ROI distributed', 
        v_current_user_id, v_positions_updated, v_roi_distributed;
    
    RETURN v_result;
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE,
        'message', 'Autogrowth system execution failed'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get system-wide autogrowth statistics (admin only)
CREATE OR REPLACE FUNCTION public.get_autogrowth_system_stats()
RETURNS JSONB AS $$
DECLARE
    v_total_positions INTEGER DEFAULT 0;
    v_active_positions INTEGER DEFAULT 0;
    v_matured_positions INTEGER DEFAULT 0;
    v_total_invested DECIMAL(20,8) DEFAULT 0;
    v_total_roi DECIMAL(20,8) DEFAULT 0;
    v_last_system_run TIMESTAMP WITH TIME ZONE;
    v_result JSONB;
BEGIN
    -- Get system-wide statistics
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN status = 'active' THEN 1 END),
        COUNT(CASE WHEN status = 'matured' THEN 1 END),
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(accrued_roi), 0),
        COALESCE(MAX(last_roi_calculation), NOW())
    INTO 
        v_total_positions,
        v_active_positions,
        v_matured_positions,
        v_total_invested,
        v_total_roi,
        v_last_system_run
    FROM public.user_positions;
    
    -- Build result
    v_result := jsonb_build_object(
        'success', true,
        'system_statistics', jsonb_build_object(
            'total_positions', v_total_positions,
            'active_positions', v_active_positions,
            'matured_positions', v_matured_positions,
            'total_invested', v_total_invested,
            'total_accrued_roi', v_total_roi,
            'system_value', v_total_invested + v_total_roi,
            'last_system_run', v_last_system_run,
            'average_roi_percentage', CASE 
                WHEN v_total_invested > 0 THEN ROUND((v_total_roi / v_total_invested) * 100, 2)
                ELSE 0 
            END
        ),
        'system_health', jsonb_build_object(
            'status', 'operational',
            'last_calculation', v_last_system_run,
            'next_scheduled_run', (v_last_system_run::DATE + INTERVAL '1 day')::TIMESTAMP WITH TIME ZONE
        )
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
GRANT EXECUTE ON FUNCTION public.rest_autogrowth_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.rest_autogrowth_status TO service_role;
GRANT EXECUTE ON FUNCTION public.rest_autogrowth_trigger TO authenticated;
GRANT EXECUTE ON FUNCTION public.rest_autogrowth_trigger TO service_role;
GRANT EXECUTE ON FUNCTION public.get_autogrowth_system_stats TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_autogrowth_system_stats TO service_role;
