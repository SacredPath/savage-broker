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

-- Check for recent user registrations with potential duplicate phone numbers
SELECT 
    u.id,
    u.email,
    u.phone,
    u.created_at,
    u.email_confirmed_at,
    u.last_sign_in_at,
    u.raw_user_meta_data
FROM auth.users u
ORDER BY u.created_at DESC
LIMIT 50;

-- Check for any duplicate phone numbers in recent registrations
SELECT 
    phone,
    COUNT(*) as count,
    ARRAY_AGG(phone) as phone_list
FROM auth.users 
WHERE phone IN (
        SELECT phone FROM auth.users u
        WHERE u.created_at >= NOW() - INTERVAL '7 days'
    )
    AND phone IS NOT NULL
GROUP BY phone
HAVING COUNT(*) > 1
ORDER BY count DESC, phone;

-- Test the trigger function directly to see what it does
-- SELECT public.handle_new_user();

-- Check if there are any other issues with the profiles table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
    AND table_name = 'profiles'
ORDER BY ordinal_position;

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
WHERE phone = '+203899576465'
GROUP BY phone;

-- Show all users with this phone number
SELECT 
    id,
    email,
    phone,
    created_at,
    email_confirmed_at
FROM auth.users 
WHERE phone = '+203899576465';

-- Check for any recent auth errors or issues
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'auth'
ORDER BY tablename, indexname;

-- Check for recent user signups that might be related to the issue
SELECT 
    id,
    email,
    phone,
    created_at,
    email_confirmed_at,
    raw_user_meta_data
FROM auth.users u
WHERE created_at >= NOW() - INTERVAL '1 day'
ORDER BY created_at DESC
LIMIT 10;

-- Temporarily disable the problematic trigger to test registration
-- ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

-- Alternative: Create a simpler version of the function that just returns without doing anything
/*
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Don't do anything to avoid conflicts
  RETURN new;
END;
$$ LANGUAGE plpgsql;
*/
