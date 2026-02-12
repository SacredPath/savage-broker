-- Update all tier configurations to match new requirements
-- Tier 1: $150 - $1,000
-- Tier 2: $1,000.01 - $10,000
-- Tier 3: $10,000.01 - $20,000
-- Tier 4: $20,000.01 - $50,000
-- Tier 5: $50,000.01 - $10,000,000

UPDATE public.investment_tiers 
SET 
    min_amount = 150.00,
    max_amount = 1000.00,
    updated_at = NOW()
WHERE name = 'Tier 1';

UPDATE public.investment_tiers 
SET 
    min_amount = 1000.01,
    max_amount = 10000.00,
    updated_at = NOW()
WHERE name = 'Tier 2';

UPDATE public.investment_tiers 
SET 
    min_amount = 10000.01,
    max_amount = 20000.00,
    updated_at = NOW()
WHERE name = 'Tier 3';

UPDATE public.investment_tiers 
SET 
    min_amount = 20000.01,
    max_amount = 50000.00,
    updated_at = NOW()
WHERE name = 'Tier 4';

UPDATE public.investment_tiers 
SET 
    min_amount = 50000.01,
    max_amount = 10000000.00,
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
    sort_order,
    updated_at
FROM public.investment_tiers 
ORDER BY sort_order;
