-- Update all tier configurations to match new requirements
-- Tier 1: $150 - $1,000 (30% total over 3 days = 10% daily)
-- Tier 2: $1,000.01 - $10,000 (45% total over 7 days = 6.43% daily)
-- Tier 3: $10,000.01 - $20,000 (50% total over 14 days = 3.57% daily)
-- Tier 4: $20,000.01 - $50,000 (100% total over 30 days = 3.33% daily)
-- Tier 5: $50,000.01 - $10,000,000 (200% total over 60 days = 3.33% daily)

UPDATE public.investment_tiers 
SET 
    min_amount = 150.00,
    max_amount = 1000.00,
    investment_period_days = 3,
    daily_roi = 0.1, -- 10% daily (30% total over 3 days)
    updated_at = NOW()
WHERE name = 'Tier 1';

UPDATE public.investment_tiers 
SET 
    min_amount = 1000.01,
    max_amount = 10000.00,
    investment_period_days = 7,
    daily_roi = 0.0643, -- 6.43% daily (45% total over 7 days)
    updated_at = NOW()
WHERE name = 'Tier 2';

UPDATE public.investment_tiers 
SET 
    min_amount = 10000.01,
    max_amount = 20000.00,
    investment_period_days = 14,
    daily_roi = 0.0357, -- 3.57% daily (50% total over 14 days)
    updated_at = NOW()
WHERE name = 'Tier 3';

UPDATE public.investment_tiers 
SET 
    min_amount = 20000.01,
    max_amount = 50000.00,
    investment_period_days = 30,
    daily_roi = 0.0333, -- 3.33% daily (100% total over 30 days)
    updated_at = NOW()
WHERE name = 'Tier 4';

UPDATE public.investment_tiers 
SET 
    min_amount = 50000.01,
    max_amount = 10000000.00,
    investment_period_days = 60,
    daily_roi = 0.0333, -- 3.33% daily (200% total over 60 days)
    updated_at = NOW()
WHERE name = 'Tier 5';

-- Verify all updates
SELECT 
    id,
    name,
    min_amount,
    max_amount,
    investment_period_days,
    daily_roi,
    (daily_roi * investment_period_days * 100) as total_roi_percentage,
    sort_order,
    updated_at
FROM public.investment_tiers 
ORDER BY sort_order;
