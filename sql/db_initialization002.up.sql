-- ==========================================
-- UP MIGRATION: 002
-- Applies 30-minute rounding to attendance hours
-- ==========================================

\c chembur_samithi_seva;

CREATE OR REPLACE FUNCTION calculate_attendance_hours() RETURNS TRIGGER AS $$
DECLARE
    raw_hours NUMERIC;
BEGIN
    IF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL THEN
        -- 1. Calculate the exact decimal hours
        raw_hours := (EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 3600.0)::NUMERIC;
        
        -- 2. Round to the nearest 0.5 (30-minute intervals)
        NEW.hours_logged := ROUND(raw_hours * 2.0) / 2.0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;