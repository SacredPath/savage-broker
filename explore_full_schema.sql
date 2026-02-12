-- Full Database Schema Explorer for Supabase
-- This query will show all tables, columns, relationships, and constraints

-- 1. Get all tables with their details
SELECT 
    t.table_schema,
    t.table_name,
    t.table_type,
    obj_description(c.oid) as table_comment
FROM information_schema.tables t
LEFT JOIN pg_class c ON c.relname = t.table_name
WHERE 
    t.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
    AND t.table_type = 'BASE TABLE'
ORDER BY t.table_schema, t.table_name;

-- 2. Get all columns with detailed information
SELECT 
    c.table_schema,
    c.table_name,
    c.column_name,
    c.ordinal_position,
    c.data_type,
    c.character_maximum_length,
    c.numeric_precision,
    c.numeric_scale,
    c.is_nullable,
    c.column_default,
    col_description(pgc.oid, c.ordinal_position) as column_comment
FROM information_schema.columns c
JOIN pg_class pgc ON pgc.relname = c.table_name
JOIN pg_namespace pgn ON pgn.oid = pgc.relnamespace AND pgn.nspname = c.table_schema
WHERE 
    c.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
ORDER BY c.table_schema, c.table_name, c.ordinal_position;

-- 3. Get all primary key constraints
SELECT 
    tc.table_schema,
    tc.table_name,
    tc.constraint_name,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name 
    AND tc.table_schema = kcu.table_schema
WHERE 
    tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
ORDER BY tc.table_schema, tc.table_name;

-- 4. Get all foreign key relationships
SELECT 
    tc.table_schema,
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name 
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name 
    AND ccu.table_schema = tc.table_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
ORDER BY tc.table_schema, tc.table_name;

-- 5. Get all indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE 
    schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
    AND tablename NOT LIKE 'pg_%'
ORDER BY schemaname, tablename, indexname;

-- 6. Get all RLS (Row Level Security) policies
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
WHERE schemaname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
ORDER BY schemaname, tablename, policyname;

-- 7. Get all functions and stored procedures
SELECT 
    routine_schema,
    routine_name,
    routine_type,
    data_type,
    external_language,
    is_deterministic,
    sql_data_access,
    routine_definition
FROM information_schema.routines
WHERE 
    routine_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
ORDER BY routine_schema, routine_name;

-- 8. Get all triggers
SELECT 
    trigger_schema,
    trigger_name,
    event_object_table,
    action_timing,
    action_condition,
    action_statement,
    action_orientation,
    action_reference_old_table,
    action_reference_new_table
FROM information_schema.triggers
WHERE 
    trigger_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
ORDER BY trigger_schema, event_object_table;

-- 9. Get table sizes and row counts
SELECT 
    schemaname,
    relname AS tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) AS size,
    pg_total_relation_size(schemaname||'.'||relname) AS size_bytes,
    n_tup_ins AS inserts,
    n_tup_upd AS updates,
    n_tup_del AS deletes,
    n_live_tup AS live_rows,
    n_dead_tup AS dead_rows,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
ORDER BY schemaname, relname;

-- 10. Get all enum types
SELECT 
    n.nspname AS schema_name,
    t.typname AS type_name,
    e.enumlabel AS enum_value,
    e.enumsortorder AS sort_order
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE 
    t.typtype = 'e'
    AND n.nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
ORDER BY schema_name, type_name, sort_order;

-- 11. Get all extensions
SELECT 
    extname AS extension_name,
    extversion AS version,
    extrelocatable AS relocatable,
    extconfig AS configuration
FROM pg_extension
ORDER BY extname;

-- 12. Get all views
SELECT 
    table_schema,
    table_name,
    view_definition,
    check_option,
    is_updatable,
    is_insertable_into,
    is_trigger_updatable,
    is_trigger_deletable,
    is_trigger_insertable_into
FROM information_schema.views
WHERE 
    table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
ORDER BY table_schema, table_name;

-- 13. Get all sequences
SELECT 
    sequence_schema,
    sequence_name,
    data_type,
    start_value,
    minimum_value,
    maximum_value,
    increment,
    cycle_option
FROM information_schema.sequences
WHERE 
    sequence_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
ORDER BY sequence_schema, sequence_name;

-- 14. Get check constraints
SELECT 
    tc.table_schema,
    tc.table_name,
    tc.constraint_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE 
    tc.constraint_type = 'CHECK'
    AND tc.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
ORDER BY tc.table_schema, tc.table_name;

-- 15. Get unique constraints
SELECT 
    tc.table_schema,
    tc.table_name,
    tc.constraint_name,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name 
    AND tc.table_schema = kcu.table_schema
WHERE 
    tc.constraint_type = 'UNIQUE'
    AND tc.table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
ORDER BY tc.table_schema, tc.table_name;
