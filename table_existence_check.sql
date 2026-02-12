-- Table Existence Check - Very Basic and Safe
-- This query only checks what tables and columns actually exist

-- Step 1: Check if backoffice_roles table exists
SELECT 'BACKOFFICE_ROLES TABLE EXISTS:' as check_result;
SELECT 
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'backoffice_roles'
    ) as table_exists;

-- Step 2: If table exists, check its columns
SELECT 'BACKOFFICE_ROLES COLUMNS:' as check_result;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'backoffice_roles'
ORDER BY ordinal_position;

-- Step 3: Check profiles table columns for role field
SELECT 'PROFILES ROLE COLUMN EXISTS:' as check_result;
SELECT 
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'role'
    ) as role_column_exists;

-- Step 4: Show profiles table structure
SELECT 'PROFILES TABLE STRUCTURE:' as check_result;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Step 5: Check if we can safely select from backoffice_roles
SELECT 'BACKOFFICE_ROLES SAFE SELECT TEST:' as check_result;
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'backoffice_roles'
        ) THEN 'CAN_SELECT'
        ELSE 'TABLE_DOES_NOT_EXIST'
    END as select_test;

-- Step 6: Final recommendation
SELECT 
    'RECOMMENDATION' as check_result,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'backoffice_roles'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'backoffice_roles' 
            AND column_name = 'user_id'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'backoffice_roles' 
            AND column_name = 'role'
        ) THEN 'RUN_FIX_ADMIN_SCHEMA_SQL'
        ELSE 'CREATE_BACKOFFICE_ROLES_TABLE_FIRST'
    END as recommendation;
