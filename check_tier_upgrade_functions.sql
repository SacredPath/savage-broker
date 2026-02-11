-- Query to check all functions with the name 'tier_upgrade_rpc'
-- This will help identify any conflicting functions

SELECT 
    proname AS function_name,
    oid::regprocedure AS full_signature,
    pronargs AS num_arguments,
    proargtypes AS argument_types,
    pronamespace::regnamespace AS schema_name
FROM pg_proc 
WHERE proname = 'tier_upgrade_rpc' 
ORDER BY pronamespace, pronargs;

-- Also check for any similar function names
SELECT 
    proname AS function_name,
    oid::regprocedure AS full_signature,
    pronamespace::regnamespace AS schema_name
FROM pg_proc 
WHERE proname LIKE '%tier_upgrade%'
ORDER BY pronamespace, proname;
