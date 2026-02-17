-- Final balance verification query using ACTUAL table structure
-- Based on the real wallet_balances table with columns: id, user_id, currency, available, locked, total, created_at, updated_at

-- 1. Show the correct balance table structure
SELECT 
    'CORRECT_BALANCE_TABLE' as table_info,
    'wallet_balances' as table_name,
    'PRIMARY balance source used by home, portfolio, and admin' as description,
    'available, locked, total columns contain balance data' as key_columns;

-- 2. Show current balance totals per user (REAL DATA)
SELECT 
    'CURRENT_BALANCES' as info,
    user_id,
    COUNT(*) as wallet_count,
    SUM(available) as total_available,
    SUM(locked) as total_locked,
    SUM(total) as total_balance,
    STRING_AGG(currency, ', ') as currencies
FROM wallet_balances 
GROUP BY user_id
ORDER BY total_balance DESC;

-- 3. Show sample balance records (REAL DATA)
SELECT 
    'SAMPLE_BALANCE_RECORDS' as info,
    id,
    user_id,
    currency,
    available,
    locked,
    total,
    created_at,
    updated_at
FROM wallet_balances 
ORDER BY created_at DESC
LIMIT 10;

-- 4. Verify balance consistency (available + locked = total)
SELECT 
    'BALANCE_CONSISTENCY_CHECK' as info,
    user_id,
    currency,
    available,
    locked,
    total,
    (available + locked) as calculated_total,
    CASE 
        WHEN (available + locked) = total THEN 'CONSISTENT'
        ELSE 'INCONSISTENT'
    END as balance_check
FROM wallet_balances 
ORDER BY user_id, currency;

-- 5. Show which pages use which tables (VERIFICATION)
SELECT 
    'PAGE_TABLE_MAPPING' as info,
    'Home Page' as page,
    'wallet_balances' as table_used,
    'BalanceService.getUserBalances()' as method,
    'available, locked, total' as columns_accessed
UNION ALL
SELECT 
    'PAGE_TABLE_MAPPING' as info,
    'Portfolio Page' as page,
    'wallet_balances' as table_used,
    'BalanceService.getUserBalances()' as method,
    'available, locked, total' as columns_accessed
UNION ALL
SELECT 
    'PAGE_TABLE_MAPPING' as info,
    'Admin Panel' as page,
    'wallet_balances' as table_used,
    'Direct query via bo_user_detail' as method,
    'available, locked, total' as columns_accessed;

-- 6. Summary of balance data
SELECT 
    'BALANCE_SUMMARY' as info,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) as total_wallet_records,
    SUM(available) as total_available_across_all_users,
    SUM(locked) as total_locked_across_all_users,
    SUM(total) as total_balance_across_all_users,
    COUNT(DISTINCT currency) as unique_currencies
FROM wallet_balances;
