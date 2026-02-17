-- Query to show the correct balance table and columns
-- This will verify what tables contain balance data and their structure

-- 1. Show wallet_balances table structure (PRIMARY balance source)
SELECT 
    'wallet_balances' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'wallet_balances' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Show sample data from wallet_balances table
SELECT 
    'wallet_balances_sample' as info,
    user_id,
    currency,
    available,
    frozen,
    total,
    created_at,
    updated_at
FROM wallet_balances 
LIMIT 5;

-- 3. Show positions table structure (investment data - NOT cash balance)
SELECT 
    'positions' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'positions' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Show sample data from positions table
SELECT 
    'positions_sample' as info,
    user_id,
    symbol,
    quantity,
    entry_price,
    current_price,
    total_value,
    created_at
FROM positions 
LIMIT 5;

-- 5. Check what balance-related columns exist in profiles table
SELECT 
    'profiles_balance_columns' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
    AND table_schema = 'public'
    AND (column_name LIKE '%balance%' OR column_name LIKE '%wallet%')
ORDER BY column_name;

-- 6. Show current balance totals per user (from wallet_balances)
SELECT 
    'wallet_balances_totals' as info,
    user_id,
    COUNT(*) as wallet_count,
    SUM(available) as total_available,
    SUM(frozen) as total_frozen,
    SUM(total) as total_balance,
    STRING_AGG(currency, ', ') as currencies
FROM wallet_balances 
GROUP BY user_id
ORDER BY total_balance DESC
LIMIT 10;

-- 7. Show current investment totals per user (from positions)
SELECT 
    'positions_totals' as info,
    user_id,
    COUNT(*) as position_count,
    SUM(quantity * current_price) as total_investment_value,
    STRING_AGG(symbol, ', ') as symbols
FROM positions 
GROUP BY user_id
ORDER BY total_investment_value DESC
LIMIT 10;

-- 8. Verify which tables are being used by checking row counts
SELECT 
    'table_row_counts' as info,
    table_name,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = t.table_name AND table_schema = 'public') > 0 as exists,
    CASE 
        WHEN table_name = 'wallet_balances' THEN (SELECT COUNT(*) FROM wallet_balances)
        WHEN table_name = 'positions' THEN (SELECT COUNT(*) FROM positions)
        WHEN table_name = 'profiles' THEN (SELECT COUNT(*) FROM profiles)
        ELSE 0
    END as row_count
FROM (VALUES ('wallet_balances'), ('positions'), ('profiles')) AS t(table_name);
