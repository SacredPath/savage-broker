-- Check positions table schema and relationships (safe version)
-- Run this in Supabase SQL Editor

-- 1. Check if positions table exists and its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public'
    AND table_name = 'positions'
ORDER BY ordinal_position;

-- 2. Check foreign key relationships in positions table
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
    AND tc.table_name = 'positions'
    AND tc.constraint_type = 'FOREIGN KEY';

-- 3. Check investment_tiers table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public'
    AND table_name = 'investment_tiers'
ORDER BY ordinal_position;

-- 4. Check sample data from positions table (using wildcard to avoid column errors)
SELECT *
FROM positions 
LIMIT 5;

-- 5. Check sample data from investment_tiers table
SELECT *
FROM investment_tiers 
ORDER BY id
LIMIT 5;

-- 6. Check if there's a relationship between positions and investment_tiers
-- This will help us understand how to properly join them
SELECT 
    p.*,
    it.name as tier_name,
    it.daily_roi,
    it.min_amount
FROM positions p
LEFT JOIN investment_tiers it ON p.tier_id = it.id
LIMIT 3;
