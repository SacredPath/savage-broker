-- Query to check all database triggers
-- Run this in Supabase SQL Editor

-- Check all triggers in the database (including auth schema)
SELECT 
    trigger_schema,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_condition,
    action_statement,
    action_orientation
FROM information_schema.triggers 
WHERE trigger_schema IN ('public', 'auth')
ORDER BY trigger_schema, event_object_table, trigger_name;

-- Check the problematic function that's causing registration to fail
SELECT 
    routine_schema,
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema IN ('public', 'auth')
    AND routine_name = 'handle_new_user';

-- Check all functions that might be used by triggers
SELECT 
    routine_schema,
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema IN ('public', 'auth')
    AND routine_type = 'FUNCTION'
ORDER BY routine_schema, routine_name;

-- Check RLS policies on auth.users table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users' OR tablename LIKE '%auth%';

-- Check constraints on auth.users
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'auth.users'::regclass
ORDER BY conname;

-- Check if phone number already exists (ISSUE IDENTIFIED: UNIQUE constraint on phone)
SELECT 
    phone,
    COUNT(*) as count
FROM auth.users 
WHERE phone = '08054545454'
GROUP BY phone;

-- Show all users with this phone number
SELECT 
    id,
    email,
    phone,
    created_at,
    email_confirmed_at
FROM auth.users 
WHERE phone = '08054545454';

-- Check for any recent auth errors or issues
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'auth'
ORDER BY tablename, indexname;
