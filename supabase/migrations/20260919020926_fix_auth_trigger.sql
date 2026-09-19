-- 0. Ensure companies and missing profile/attendance columns exist
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    subscription_status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.companies (id, name, slug, subscription_status)
VALUES ('11111111-1111-1111-1111-111111111111', 'Main Campus', 'main', 'active')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all to read companies" ON public.companies;
CREATE POLICY "Allow all to read companies"
    ON public.companies FOR SELECT
    TO anon, authenticated, service_role
    USING (true);

DROP POLICY IF EXISTS "Allow authenticated and service_role to manage companies" ON public.companies;
CREATE POLICY "Allow authenticated and service_role to manage companies"
    ON public.companies FOR ALL
    TO authenticated, service_role
    USING (true)
    WITH CHECK (true);

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS designation TEXT,
    ADD COLUMN IF NOT EXISTS department TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS campus_id UUID,
    ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '11111111-1111-1111-1111-111111111111' REFERENCES public.companies(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS salary NUMERIC,
    ADD COLUMN IF NOT EXISTS working_days TEXT[] DEFAULT ARRAY['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    ADD COLUMN IF NOT EXISTS registered_device_id TEXT,
    ADD COLUMN IF NOT EXISTS device_locked_at TIMESTAMPTZ;

ALTER TABLE public.attendance_logs
    ADD COLUMN IF NOT EXISTS company_id UUID DEFAULT '11111111-1111-1111-1111-111111111111' REFERENCES public.companies(id) ON DELETE SET NULL;

-- 1. Remove the broken trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Schema-accurate profile creation handler with role injection into Auth JWT (raw_app_meta_data)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  the_assigned_role text;
BEGIN
  -- Conditional role assignment: admin for designated email, otherwise staff
  IF lower(COALESCE(new.email, '')) = 'buildwithsuraj001@gmail.com' THEN
    the_assigned_role := 'admin';
  ELSE
    the_assigned_role := 'staff';
  END IF;

  -- Insert this role and email into public.profiles
  INSERT INTO public.profiles (id, name, email, role, company_id)
  VALUES (
    new.id, 
    -- Dynamically grab the name from meta data, or fallback to the email prefix
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 
    new.email,
    the_assigned_role,
    '11111111-1111-1111-1111-111111111111'
  )
  ON CONFLICT (id) DO UPDATE 
    SET role = EXCLUDED.role,
        email = COALESCE(EXCLUDED.email, public.profiles.email);

  -- Immediately after the insert, execute an UPDATE auth.users on new.id to set raw_app_meta_data
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', the_assigned_role)
  WHERE id = new.id;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- 3. Rebind the trigger cleanly
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();