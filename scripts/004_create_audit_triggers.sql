-- Create comprehensive audit logging triggers for all critical tables

-- Function to capture audit information
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    -- For INSERT operations
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (
            user_id,
            table_name,
            action,
            record_id,
            new_values,
            ip_address,
            user_agent,
            created_at
        ) VALUES (
            auth.uid(),
            TG_TABLE_NAME,
            TG_OP,
            NEW.id,
            to_jsonb(NEW),
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent',
            NOW()
        );
        RETURN NEW;
    END IF;

    -- For UPDATE operations
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (
            user_id,
            table_name,
            action,
            record_id,
            old_values,
            new_values,
            ip_address,
            user_agent,
            created_at
        ) VALUES (
            auth.uid(),
            TG_TABLE_NAME,
            TG_OP,
            NEW.id,
            to_jsonb(OLD),
            to_jsonb(NEW),
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent',
            NOW()
        );
        RETURN NEW;
    END IF;

    -- For DELETE operations
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (
            user_id,
            table_name,
            action,
            record_id,
            old_values,
            ip_address,
            user_agent,
            created_at
        ) VALUES (
            auth.uid(),
            TG_TABLE_NAME,
            TG_OP,
            OLD.id,
            to_jsonb(OLD),
            inet_client_addr(),
            current_setting('request.headers', true)::json->>'user-agent',
            NOW()
        );
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for critical tables

-- Outlets audit
DROP TRIGGER IF EXISTS outlets_audit_trigger ON outlets;
CREATE TRIGGER outlets_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON outlets
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Profiles audit
DROP TRIGGER IF EXISTS profiles_audit_trigger ON profiles;
CREATE TRIGGER profiles_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Stock opnames audit
DROP TRIGGER IF EXISTS stock_opnames_audit_trigger ON stock_opnames;
CREATE TRIGGER stock_opnames_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON stock_opnames
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Stock opname details audit
DROP TRIGGER IF EXISTS stock_opname_details_audit_trigger ON stock_opname_details;
CREATE TRIGGER stock_opname_details_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON stock_opname_details
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Staff penalties audit
DROP TRIGGER IF EXISTS staff_penalties_audit_trigger ON staff_penalties;
CREATE TRIGGER staff_penalties_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON staff_penalties
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Items audit
DROP TRIGGER IF EXISTS items_audit_trigger ON items;
CREATE TRIGGER items_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON items
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Opname configs audit
DROP TRIGGER IF EXISTS opname_configs_audit_trigger ON opname_configs;
CREATE TRIGGER opname_configs_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON opname_configs
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Outlet staff audit
DROP TRIGGER IF EXISTS outlet_staff_audit_trigger ON outlet_staff;
CREATE TRIGGER outlet_staff_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON outlet_staff
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create function for compliance reporting
CREATE OR REPLACE FUNCTION generate_compliance_report(
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'report_period', json_build_object(
            'start_date', start_date,
            'end_date', end_date
        ),
        'summary', json_build_object(
            'total_outlets', (
                SELECT COUNT(*) FROM outlets WHERE created_at BETWEEN start_date AND end_date
            ),
            'total_opnames', (
                SELECT COUNT(*) FROM stock_opnames WHERE created_at BETWEEN start_date AND end_date
            ),
            'completion_rate', (
                SELECT ROUND(
                    (COUNT(CASE WHEN status = 'completed' THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2
                ) FROM stock_opnames WHERE created_at BETWEEN start_date AND end_date
            ),
            'total_penalties', (
                SELECT COUNT(*) FROM staff_penalties WHERE created_at BETWEEN start_date AND end_date
            )
        ),
        'audit_activity', json_build_object(
            'total_actions', (
                SELECT COUNT(*) FROM audit_logs WHERE created_at BETWEEN start_date AND end_date
            ),
            'by_action', (
                SELECT json_object_agg(action, count)
                FROM (
                    SELECT action, COUNT(*) as count
                    FROM audit_logs
                    WHERE created_at BETWEEN start_date AND end_date
                    GROUP BY action
                ) t
            )
        )
    ) INTO result;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better audit performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION generate_compliance_report TO authenticated;
GRANT EXECUTE ON FUNCTION audit_trigger_function TO authenticated;
