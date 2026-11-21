-- Enable RLS on all tables and create policies

-- Profiles table policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Outlets table policies (managers can see their outlets, admins see all)
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers can view their outlets" ON outlets
  FOR SELECT USING (
    auth.uid() = manager_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage outlets" ON outlets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Items table policies (staff can see items for their outlets)
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view items for their outlets" ON items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM outlet_staff
      WHERE outlet_staff.outlet_id = items.outlet_id
      AND outlet_staff.staff_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM outlets
      WHERE outlets.id = items.outlet_id
      AND outlets.manager_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Managers and admins can manage items" ON items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM outlets
      WHERE outlets.id = items.outlet_id
      AND outlets.manager_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Stock opnames table policies
ALTER TABLE stock_opnames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view their own opnames" ON stock_opnames
  FOR SELECT USING (
    auth.uid() = staff_id OR
    EXISTS (
      SELECT 1 FROM outlets
      WHERE outlets.id = stock_opnames.outlet_id
      AND outlets.manager_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Staff can create their own opnames" ON stock_opnames
  FOR INSERT WITH CHECK (auth.uid() = staff_id);

CREATE POLICY "Staff can update their own opnames" ON stock_opnames
  FOR UPDATE USING (auth.uid() = staff_id);

-- Stock opname details policies
ALTER TABLE stock_opname_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view opname details they have access to" ON stock_opname_details
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM stock_opnames
      WHERE stock_opnames.id = stock_opname_details.stock_opname_id
      AND (
        stock_opnames.staff_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM outlets
          WHERE outlets.id = stock_opnames.outlet_id
          AND outlets.manager_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Staff can manage their opname details" ON stock_opname_details
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM stock_opnames
      WHERE stock_opnames.id = stock_opname_details.stock_opname_id
      AND stock_opnames.staff_id = auth.uid()
    )
  );

-- Outlet staff policies
ALTER TABLE outlet_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view outlet assignments" ON outlet_staff
  FOR SELECT USING (
    auth.uid() = staff_id OR
    EXISTS (
      SELECT 1 FROM outlets
      WHERE outlets.id = outlet_staff.outlet_id
      AND outlets.manager_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Managers and admins can manage outlet staff" ON outlet_staff
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM outlets
      WHERE outlets.id = outlet_staff.outlet_id
      AND outlets.manager_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Opname configs policies
ALTER TABLE opname_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view opname configs for accessible outlets" ON opname_configs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM outlet_staff
      WHERE outlet_staff.outlet_id = opname_configs.outlet_id
      AND outlet_staff.staff_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM outlets
      WHERE outlets.id = opname_configs.outlet_id
      AND outlets.manager_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Managers and admins can manage opname configs" ON opname_configs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM outlets
      WHERE outlets.id = opname_configs.outlet_id
      AND outlets.manager_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Staff penalties policies
ALTER TABLE staff_penalties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view their own penalties" ON staff_penalties
  FOR SELECT USING (
    auth.uid() = staff_id OR
    EXISTS (
      SELECT 1 FROM outlets
      WHERE outlets.id = staff_penalties.outlet_id
      AND outlets.manager_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Managers and admins can manage penalties" ON staff_penalties
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM outlets
      WHERE outlets.id = staff_penalties.outlet_id
      AND outlets.manager_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Audit logs policies
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audit logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can view their own audit logs" ON audit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);
