-- ==========================================
-- DOWN MIGRATION: 002
-- Reverts attendance hours back to exact decimals
-- ==========================================

\c chembur_samithi_seva;

CREATE OR REPLACE FUNCTION calculate_attendance_hours() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL THEN
        -- Revert to exact decimal calculation (rounded to 2 decimal places)
        NEW.hours_logged := ROUND((EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 3600.0)::NUMERIC, 2);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;