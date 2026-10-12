-- Add super_admin staff role for payment settings and full CMS control
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
