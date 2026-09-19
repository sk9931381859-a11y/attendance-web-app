-- Migration: Ensure demo accounts are always present and compatible with GoTrue
-- Fixes "Scan error on column index 3, name confirmation_token: converting NULL to string is unsupported"
-- Guarantees that default demo credentials can never be missing or corrupted.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 1. Helper function to ensure demo accounts exist
CREATE OR REPLACE FUNCTION public.ensure_default_demo_accounts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_admin_id UUID := '594746d2-cd8c-4cbc-8cb0-5fd47c0bbd96';
  v_staff_id UUID := 'b678a5d7-6159-44ef-a61a-970eee23ef86';
  v_school_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
  -- Ensure default school exists
  INSERT INTO public.schools (id, name, school_code, kiosk_pin, address, pincode)
  VALUES (v_school_id, 'Apex Global Academy', '100001', '1234', 'Sector 4, Innovation Park', '560100')
  ON CONFLICT (id) DO UPDATE
  SET school_code = '100001', kiosk_pin = '1234';

  -- Ensure company exists for backwards compatibility
  INSERT INTO public.companies (id, name, slug, subscription_status)
  VALUES (v_school_id, 'Apex Global Academy', 'default', 'active')
  ON CONFLICT (id) DO NOTHING;

  -- Create or update Admin User in auth.users (with empty string tokens to prevent GoTrue scanning crashes)
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    phone_change_token,
    reauthentication_token,
    email_change_token_current,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES (
    v_admin_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'buildwithsuraj001@gmail.com',
    extensions.crypt('123456', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', 'admin', 'school_id', v_school_id),
    jsonb_build_object('name', 'School Principal (Admin)', 'role', 'admin', 'school_id', v_school_id),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET encrypted_password = extensions.crypt('123456', extensions.gen_salt('bf')),
      email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now()),
      confirmation_token = COALESCE(auth.users.confirmation_token, ''),
      recovery_token = COALESCE(auth.users.recovery_token, ''),
      email_change_token_new = COALESCE(auth.users.email_change_token_new, ''),
      email_change = COALESCE(auth.users.email_change, ''),
      phone_change_token = COALESCE(auth.users.phone_change_token, ''),
      reauthentication_token = COALESCE(auth.users.reauthentication_token, ''),
      email_change_token_current = COALESCE(auth.users.email_change_token_current, ''),
      raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', 'admin', 'school_id', v_school_id),
      raw_user_meta_data = jsonb_build_object('name', 'School Principal (Admin)', 'role', 'admin', 'school_id', v_school_id),
      updated_at = now();

  -- Admin Identity
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_admin_id,
    v_admin_id,
    jsonb_build_object('sub', v_admin_id::text, 'email', 'buildwithsuraj001@gmail.com', 'email_verified', true),
    'email',
    v_admin_id::text,
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE
  SET identity_data = jsonb_build_object('sub', v_admin_id::text, 'email', 'buildwithsuraj001@gmail.com', 'email_verified', true),
      updated_at = now();

  -- Create or update Teacher User in auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    phone_change_token,
    reauthentication_token,
    email_change_token_current,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES (
    v_staff_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'teacher@attendance.app',
    extensions.crypt('demo123456', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', 'staff', 'school_id', v_school_id),
    jsonb_build_object('name', 'Demo Teacher (Staff)', 'role', 'staff', 'school_id', v_school_id),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET encrypted_password = extensions.crypt('demo123456', extensions.gen_salt('bf')),
      email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now()),
      confirmation_token = COALESCE(auth.users.confirmation_token, ''),
      recovery_token = COALESCE(auth.users.recovery_token, ''),
      email_change_token_new = COALESCE(auth.users.email_change_token_new, ''),
      email_change = COALESCE(auth.users.email_change, ''),
      phone_change_token = COALESCE(auth.users.phone_change_token, ''),
      reauthentication_token = COALESCE(auth.users.reauthentication_token, ''),
      email_change_token_current = COALESCE(auth.users.email_change_token_current, ''),
      raw_app_meta_data = jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', 'staff', 'school_id', v_school_id),
      raw_user_meta_data = jsonb_build_object('name', 'Demo Teacher (Staff)', 'role', 'staff', 'school_id', v_school_id),
      updated_at = now();

  -- Teacher Identity
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_staff_id,
    v_staff_id,
    jsonb_build_object('sub', v_staff_id::text, 'email', 'teacher@attendance.app', 'email_verified', true),
    'email',
    v_staff_id::text,
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE
  SET identity_data = jsonb_build_object('sub', v_staff_id::text, 'email', 'teacher@attendance.app', 'email_verified', true),
      updated_at = now();

  -- Ensure matching profiles exist in public.profiles
  INSERT INTO public.profiles (id, name, email, role, school_id, company_id, shift_start_time)
  VALUES 
    (v_admin_id, 'School Principal (Admin)', 'buildwithsuraj001@gmail.com', 'admin', v_school_id, v_school_id, '08:00:00'),
    (v_staff_id, 'Demo Teacher (Staff)', 'teacher@attendance.app', 'staff', v_school_id, v_school_id, '08:00:00')
  ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role,
      school_id = EXCLUDED.school_id,
      company_id = EXCLUDED.company_id,
      email = EXCLUDED.email;

END;
$$;

-- Execute initial seed
SELECT public.ensure_default_demo_accounts();
