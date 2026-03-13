-- ============================================================
-- Manikstu Agro — Attendance & Workforce Management System
-- PostgreSQL 15+ Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── DEPARTMENTS ────────────────────────────────────────────
CREATE TABLE departments (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  manager_id VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── EMPLOYEES ──────────────────────────────────────────────
CREATE TABLE employees (
  employee_id       VARCHAR(20)  PRIMARY KEY,        -- e.g. MKA-001
  full_name         VARCHAR(150) NOT NULL,
  email             VARCHAR(255) NOT NULL UNIQUE,
  phone             VARCHAR(20)  NOT NULL UNIQUE,
  department_id     INTEGER      REFERENCES departments(id) ON DELETE SET NULL,
  designation       VARCHAR(100),
  date_of_joining   DATE         NOT NULL,
  base_salary       NUMERIC(12,2) NOT NULL DEFAULT 0,
  password_hash     VARCHAR(255) NOT NULL,

  -- Leave balances
  casual_leave_balance  INTEGER NOT NULL DEFAULT 12,
  sick_leave_balance    INTEGER NOT NULL DEFAULT 10,
  paid_leave_balance    INTEGER NOT NULL DEFAULT 15,

  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  profile_photo_url TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_emp_email  ON employees(email);
CREATE INDEX idx_emp_phone  ON employees(phone);
CREATE INDEX idx_emp_dept   ON employees(department_id);

-- ─── ADMINS ─────────────────────────────────────────────────
CREATE TYPE admin_role AS ENUM ('super_admin', 'hr_admin', 'viewer');

CREATE TABLE admins (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          admin_role   NOT NULL DEFAULT 'hr_admin',
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── ATTENDANCE ─────────────────────────────────────────────
CREATE TYPE attendance_method AS ENUM ('qr', 'face', 'manual', 'offline_sync');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'leave', 'holiday', 'half_day');

CREATE TABLE attendance (
  id             BIGSERIAL    PRIMARY KEY,
  employee_id    VARCHAR(20)  NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  date           DATE         NOT NULL,
  check_in_time  TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  working_minutes INTEGER,                    -- auto-calculated on check-out

  -- Location data
  checkin_lat    NUMERIC(10,7),
  checkin_lng    NUMERIC(10,7),
  checkout_lat   NUMERIC(10,7),
  checkout_lng   NUMERIC(10,7),
  gps_verified   BOOLEAN NOT NULL DEFAULT FALSE,

  -- Device / method
  device_id      VARCHAR(255),
  ip_address     VARCHAR(45),
  method         attendance_method NOT NULL DEFAULT 'qr',
  status         attendance_status NOT NULL DEFAULT 'present',
  is_late        BOOLEAN NOT NULL DEFAULT FALSE,
  late_minutes   INTEGER DEFAULT 0,
  overtime_minutes INTEGER DEFAULT 0,

  -- Offline sync
  is_offline_record BOOLEAN NOT NULL DEFAULT FALSE,
  synced_at      TIMESTAMPTZ,

  -- Admin edit
  is_manually_edited  BOOLEAN NOT NULL DEFAULT FALSE,
  edited_by_admin_id  INTEGER REFERENCES admins(id) ON DELETE SET NULL,
  edit_reason         TEXT,

  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_attendance_employee_date UNIQUE (employee_id, date)
);

CREATE INDEX idx_att_employee ON attendance(employee_id);
CREATE INDEX idx_att_date     ON attendance(date);
CREATE INDEX idx_att_status   ON attendance(status);

-- ─── LEAVE REQUESTS ─────────────────────────────────────────
CREATE TYPE leave_type   AS ENUM ('casual', 'sick', 'paid', 'other');
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled');

CREATE TABLE leave_requests (
  id             BIGSERIAL   PRIMARY KEY,
  employee_id    VARCHAR(20) NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  leave_type     leave_type  NOT NULL,
  from_date      DATE        NOT NULL,
  to_date        DATE        NOT NULL,
  days_requested INTEGER     NOT NULL,
  reason         TEXT        NOT NULL,
  status         leave_status NOT NULL DEFAULT 'pending',
  admin_comment  TEXT,
  reviewed_by    INTEGER     REFERENCES admins(id) ON DELETE SET NULL,
  reviewed_at    TIMESTAMPTZ,
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_dates CHECK (to_date >= from_date),
  CONSTRAINT chk_days  CHECK (days_requested > 0)
);

CREATE INDEX idx_leave_emp    ON leave_requests(employee_id);
CREATE INDEX idx_leave_status ON leave_requests(status);

-- ─── FACE EMBEDDINGS ────────────────────────────────────────
CREATE TABLE face_embeddings (
  id          BIGSERIAL   PRIMARY KEY,
  employee_id VARCHAR(20) NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  embedding   JSONB       NOT NULL,            -- float array stored as JSON
  model_version VARCHAR(50) NOT NULL DEFAULT 'face-api-v1',
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_face_employee UNIQUE (employee_id)
);

-- ─── PAYROLL RECORDS ────────────────────────────────────────
CREATE TABLE payroll_records (
  id                  BIGSERIAL   PRIMARY KEY,
  employee_id         VARCHAR(20) NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  month               INTEGER     NOT NULL CHECK (month BETWEEN 1 AND 12),
  year                INTEGER     NOT NULL,
  base_salary         NUMERIC(12,2) NOT NULL,
  working_days        INTEGER     NOT NULL DEFAULT 0,
  present_days        INTEGER     NOT NULL DEFAULT 0,
  absent_days         INTEGER     NOT NULL DEFAULT 0,
  leave_days          INTEGER     NOT NULL DEFAULT 0,
  late_deduction      NUMERIC(12,2) NOT NULL DEFAULT 0,
  overtime_bonus      NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_deductions    NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_allowances    NUMERIC(12,2) NOT NULL DEFAULT 0,
  gross_salary        NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_salary          NUMERIC(12,2) NOT NULL DEFAULT 0,
  status              VARCHAR(20)  NOT NULL DEFAULT 'draft',   -- draft | finalized | paid
  generated_by        INTEGER      REFERENCES admins(id) ON DELETE SET NULL,
  generated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  finalized_at        TIMESTAMPTZ,
  notes               TEXT,

  CONSTRAINT uq_payroll_emp_month UNIQUE (employee_id, month, year)
);

CREATE INDEX idx_payroll_emp   ON payroll_records(employee_id);
CREATE INDEX idx_payroll_month ON payroll_records(month, year);

-- ─── PUBLIC HOLIDAYS ────────────────────────────────────────
CREATE TABLE public_holidays (
  id         SERIAL      PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  date       DATE         NOT NULL UNIQUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── SYSTEM SETTINGS ────────────────────────────────────────
CREATE TABLE system_settings (
  key         VARCHAR(100) PRIMARY KEY,
  value       TEXT         NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

INSERT INTO system_settings (key, value, description) VALUES
  ('company_name',         'Manikstu Agro',    'Company display name'),
  ('office_lat',           '22.5726',           'Office latitude'),
  ('office_lng',           '88.3639',           'Office longitude'),
  ('gps_radius_meters',    '100',               'GPS allowed radius in metres'),
  ('face_confidence',      '0.85',              'Face recognition confidence threshold (0-1)'),
  ('late_threshold',       '09:30',             'Check-in after this time is marked Late (24h)'),
  ('working_hours_per_day','8',                 'Standard working hours per day'),
  ('overtime_threshold',   '480',               'Minutes after which overtime is counted'),
  ('late_deduction_rate',  '0.5',               'Salary deduction multiplier per late day'),
  ('attend_page_url',      'https://manikstu-agro.vercel.app/attend', 'QR attendance URL'),
  ('payroll_day',          '1',                 'Day of month payroll is generated');

-- ─── AUTO update_at TRIGGER ─────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_employees_upd   BEFORE UPDATE ON employees      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_attendance_upd  BEFORE UPDATE ON attendance      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_leave_upd       BEFORE UPDATE ON leave_requests  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_face_upd        BEFORE UPDATE ON face_embeddings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── AUTO CALCULATE working_minutes on checkout ─────────────
CREATE OR REPLACE FUNCTION calc_working_minutes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.check_out_time IS NOT NULL AND NEW.check_in_time IS NOT NULL THEN
    NEW.working_minutes = EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 60;
    -- Calculate overtime (minutes beyond standard working hours)
    NEW.overtime_minutes = GREATEST(0, NEW.working_minutes - 480);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calc_minutes
  BEFORE INSERT OR UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION calc_working_minutes();

-- ─── SEED DATA ───────────────────────────────────────────────
INSERT INTO departments (name) VALUES
  ('Management'), ('Field Operations'), ('Processing'), ('Logistics'),
  ('Finance'), ('Human Resources'), ('IT'), ('Sales & Marketing');

-- Default super admin (password: Admin@1234)
INSERT INTO admins (name, email, password_hash, role) VALUES (
  'System Admin', 'admin@manikstuagro.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpfQN5nw6Y5mBy',
  'super_admin'
);
