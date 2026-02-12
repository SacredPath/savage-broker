-- Basic Admin Schema Check - Simple and Safe
-- This query uses basic SQL to avoid syntax errors

-- Check what tables exist
SELECT 'TABLES THAT EXIST:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('profiles', 'backoffice_roles')
ORDER BY table_name;

-- Check columns in profiles table
SELECT 'PROFILES TABLE COLUMNS:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Check if backoffice_roles table exists and its columns
SELECT 'BACKOFFICE_ROLES TABLE:' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'backoffice_roles'
ORDER BY ordinal_position;

-- Check data counts
SELECT 'DATA COUNTS:' as info;
SELECT 
    'profiles' as table_name,
    COUNT(*) as row_count
FROM profiles;

SELECT 
    'backoffice_roles' as table_name,
    COUNT(*) as row_count
FROM backoffice_roles;

-- Check for any recent data
SELECT 'RECENT PROFILES (last 5):' as info;
SELECT id, email, created_at 
FROM profiles 
ORDER BY created_at DESC 
LIMIT 5;

SELECT 'RECENT BACKOFFICE_ROLES (last 5):' as info;
SELECT id, user_id, role, created_at 
FROM backoffice_roles 
ORDER BY created_at DESC 
LIMIT 5;

-- Check for any constraints
SELECT 'CONSTRAINTS:' as info;
SELECT tc.constraint_name, tc.table_name, tc.constraint_type
FROM information_schema.table_constraints tc
WHERE tc.table_schema = 'public' 
    AND tc.table_name IN ('profiles', 'backoffice_roles')
ORDER BY tc.table_name, tc.constraint_name;

SELECT 'DIAGNOSTIC COMPLETE' as status, NOW() as completed_at;
