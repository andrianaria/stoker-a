-- Create function to check and apply automatic penalties
CREATE OR REPLACE FUNCTION check_missed_opnames()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    outlet_record RECORD;
    staff_record RECORD;
    config_record RECORD;
    last_opname_date DATE;
    days_since_last INTEGER;
    penalty_points INTEGER;
BEGIN
    -- Loop through all active outlets with opname configs
    FOR outlet_record IN
        SELECT o.id as outlet_id, o.name as outlet_name, oc.*
        FROM outlets o
        JOIN opname_configs oc ON o.id = oc.outlet_id
        WHERE o.is_active = true AND oc.is_active = true
    LOOP
        -- Loop through staff assigned to this outlet
        FOR staff_record IN
            SELECT os.staff_id, p.full_name, p.email
            FROM outlet_staff os
            JOIN profiles p ON os.staff_id = p.id
            WHERE os.outlet_id = outlet_record.outlet_id
            AND p.is_active = true
        LOOP
            -- Check last completed opname for this staff/outlet
            SELECT opname_date INTO last_opname_date
            FROM stock_opnames
            WHERE staff_id = staff_record.staff_id
            AND outlet_id = outlet_record.outlet_id
            AND status = 'completed'
            ORDER BY opname_date DESC
            LIMIT 1;

            -- Calculate days since last opname
            IF last_opname_date IS NULL THEN
                days_since_last := 999; -- No previous opname
            ELSE
                days_since_last := CURRENT_DATE - last_opname_date;
            END IF;

            -- Check if opname is overdue
            IF days_since_last > outlet_record.frequency_days THEN
                -- Check if penalty already exists for today
                IF NOT EXISTS (
                    SELECT 1 FROM staff_penalties
                    WHERE staff_id = staff_record.staff_id
                    AND outlet_id = outlet_record.outlet_id
                    AND penalty_date = CURRENT_DATE
                ) THEN
                    -- Calculate penalty points
                    penalty_points := (days_since_last - outlet_record.frequency_days) * outlet_record.penalty_points_per_day;

                    -- Insert penalty record
                    INSERT INTO staff_penalties (
                        staff_id,
                        outlet_id,
                        penalty_date,
                        penalty_points,
                        reason,
                        notes,
                        resolved
                    ) VALUES (
                        staff_record.staff_id,
                        outlet_record.outlet_id,
                        CURRENT_DATE,
                        penalty_points,
                        'Missed stock opname - ' || (days_since_last - outlet_record.frequency_days) || ' day(s) overdue',
                        'Automatic penalty for missing opname at ' || outlet_record.outlet_name,
                        false
                    );

                    -- Log the action
                    INSERT INTO audit_logs (
                        user_id,
                        table_name,
                        action,
                        record_id,
                        new_values
                    ) VALUES (
                        staff_record.staff_id,
                        'staff_penalties',
                        'INSERT',
                        NULL,
                        jsonb_build_object(
                            'penalty_points', penalty_points,
                            'reason', 'Automatic penalty for missed opname',
                            'outlet_name', outlet_record.outlet_name
                        )
                    );
                END IF;
            END IF;
        END LOOP;
    END LOOP;
END;
$$;

-- Create function to get staff reminders
CREATE OR REPLACE FUNCTION get_staff_reminders(staff_user_id UUID)
RETURNS TABLE (
    outlet_id UUID,
    outlet_name TEXT,
    days_overdue INTEGER,
    frequency_days INTEGER,
    is_urgent BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id as outlet_id,
        o.name as outlet_name,
        GREATEST(0, CURRENT_DATE - COALESCE(last_opname.opname_date, CURRENT_DATE - INTERVAL '999 days')::DATE - oc.frequency_days) as days_overdue,
        oc.frequency_days,
        (CURRENT_DATE - COALESCE(last_opname.opname_date, CURRENT_DATE - INTERVAL '999 days')::DATE) > oc.frequency_days as is_urgent
    FROM outlets o
    JOIN opname_configs oc ON o.id = oc.outlet_id
    JOIN outlet_staff os ON o.id = os.outlet_id
    LEFT JOIN LATERAL (
        SELECT opname_date
        FROM stock_opnames so
        WHERE so.staff_id = staff_user_id
        AND so.outlet_id = o.id
        AND so.status = 'completed'
        ORDER BY so.opname_date DESC
        LIMIT 1
    ) last_opname ON true
    WHERE os.staff_id = staff_user_id
    AND o.is_active = true
    AND oc.is_active = true
    AND NOT EXISTS (
        SELECT 1 FROM stock_opnames today_opname
        WHERE today_opname.staff_id = staff_user_id
        AND today_opname.outlet_id = o.id
        AND today_opname.opname_date = CURRENT_DATE
    )
    AND (
        last_opname.opname_date IS NULL OR
        (CURRENT_DATE - last_opname.opname_date) >= oc.frequency_days
    );
END;
$$;
