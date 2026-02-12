-- Simple Admin Schema Check - No assumptions about column names
-- This query safely checks what actually exists

-- Check what tables exist
SELECT 
    'existing_tables' as check_type,
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public'
    AND table_name IN ('profiles', 'backoffice_roles', 'users', 'auth_users')
ORDER BY table_name;

-- Check columns in profiles table
SELECT 
    'profiles_columns' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Check columns in backoffice_roles table (if it exists)
SELECT 
    'backoffice_roles_columns' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'backoffice_roles'
ORDER BY ordinal_position;

-- Check if backoffice_roles has any data
SELECT 
    'backoffice_roles_data' as check_type,
    COUNT(*) as row_count,
    CASE 
        WHEN COUNT(*) > 0 THEN 'HAS_DATA'
        ELSE 'EMPTY'
    END as data_status
FROM backoffice_roles;

-- Check if profiles has any admin-related data
SELECT 
    'profiles_admin_data' as check_type,
    COUNT(*) as total_profiles,
    COUNT(*) FILTER (WHERE email IS NOT NULL) as with_email,
    COUNT(*) FILTER (WHERE created_at IS NOT NULL) as with_created_at,
    MIN(created_at) as earliest_created,
    MAX(created_at) as latest_created
FROM profiles;

-- Check for any RLS policies
SELECT 
    'rls_policies' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'backoffice_roles')
ORDER BY tablename, policyname;

-- Check for any triggers
SELECT 
    'triggers' as check_type,
    trigger_name,
    event_manipulation,
    action_timing,
    event_object_table
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
    AND event_object_table IN ('profiles', 'backoffice_roles')
ORDER BY trigger_name;

-- Summary
SELECT 
    'summary' as check_type,
    'Schema Analysis Complete' as status,
    NOW() as check_time;
