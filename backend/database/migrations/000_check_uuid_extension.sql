/*
UUID Extension Check Migration
Version: 0.1.0
Description: Checks and enables UUID extension if available
This should run before other migrations.
*/

-- Try to enable UUID extension
DO $$
BEGIN
    -- Check if extension already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp'
    ) THEN
        -- Try to create extension
        BEGIN
            CREATE EXTENSION "uuid-ossp";
            RAISE NOTICE 'UUID extension created successfully';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Could not create UUID extension: %', SQLERRM;
            RAISE NOTICE 'Some features requiring UUIDs may not work properly';
        END;
    ELSE
        RAISE NOTICE 'UUID extension already exists';
    END IF;
END $$;

-- Create a simple test to verify UUID generation works
DO $$
DECLARE
    test_uuid UUID;
BEGIN
    -- Try to generate a UUID
    BEGIN
        test_uuid := uuid_generate_v4();
        RAISE NOTICE 'UUID generation test successful: %', test_uuid;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'UUID generation failed: %', SQLERRM;
        RAISE NOTICE 'Will use alternative ID generation methods';
    END;
END $$;

RAISE NOTICE 'UUID extension check completed';