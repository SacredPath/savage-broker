-- Query to check ACTUAL table structures first, then sample data
-- This will show us what columns really exist before querying them

-- 1. Show wallet_balances table structure
SELECT 
    'wallet_balances_structure' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'wallet_balances' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Show positions table structure  
SELECT 
    'positions_structure' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'positions' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Show profiles table structure (balance-related columns only)
SELECT 
    'profiles_balance_columns' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
    AND table_schema = 'public'
    AND (column_name LIKE '%balance%' OR column_name LIKE '%wallet%')
ORDER BY column_name;

-- 4. Check if tables exist and show row counts
SELECT 
    'table_existence_check' as info,
    table_name,
    exists_in_schema,
    row_count
FROM (
    SELECT 
        'wallet_balances' as table_name,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'wallet_balances' AND table_schema = 'public') > 0 as exists_in_schema,
        (SELECT COUNT(*) FROM wallet_balances) as row_count
    UNION ALL
    SELECT 
        'positions' as table_name,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'positions' AND table_schema = 'public') > 0 as exists_in_schema,
        (SELECT COUNT(*) FROM positions) as row_count
    UNION ALL
    SELECT 
        'profiles' as table_name,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') > 0 as exists_in_schema,
        (SELECT COUNT(*) FROM profiles) as row_count
) AS table_info;

-- 5. Show all columns in wallet_balances table (for reference)
SELECT 
    'wallet_balances_all_columns' as info,
    STRING_AGG(column_name || ' (' || data_type || ')', ', ' ORDER BY ordinal_position) as all_columns
FROM information_schema.columns 
WHERE table_name = 'wallet_balances' 
    AND table_schema = 'public';

-- 6. Show all columns in positions table (for reference)
SELECT 
    'positions_all_columns' as info,
    STRING_AGG(column_name || ' (' || data_type || ')', ', ' ORDER BY ordinal_position) as all_columns
FROM information_schema.columns 
WHERE table_name = 'positions' 
    AND table_schema = 'public';

-- 7. Show sample data from wallet_balances (using wildcard to avoid column name issues)
SELECT 
    'wallet_balances_sample_data' as info,
    *
FROM wallet_balances 
LIMIT 3;

-- 8. Show sample data from positions (using wildcard to avoid column name issues)
SELECT 
    'positions_sample_data' as info,
    *
FROM positions 
LIMIT 3;
