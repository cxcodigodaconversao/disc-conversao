-- Step 1: Migrate any existing admin users to client
UPDATE user_roles 
SET role = 'client' 
WHERE role = 'admin';

-- Step 2: Drop all policies that depend on app_role enum
DROP POLICY IF EXISTS "Super admins can manage all roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admins can create assessments" ON assessments;
DROP POLICY IF EXISTS "Admins can view all assessments" ON assessments;

-- Step 3: Drop the has_role function
DROP FUNCTION IF EXISTS has_role(uuid, app_role);

-- Step 4: Update the app_role enum
ALTER TYPE app_role RENAME TO app_role_old;
CREATE TYPE app_role AS ENUM ('super_admin', 'client');

ALTER TABLE user_roles 
ALTER COLUMN role TYPE app_role 
USING role::text::app_role;

DROP TYPE app_role_old CASCADE;

-- Step 5: Recreate the has_role function with new enum
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Step 6: Recreate RLS policies for user_roles
CREATE POLICY "Super admins can manage all roles" 
ON user_roles
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view their own roles" 
ON user_roles
FOR SELECT 
USING (auth.uid() = user_id);

-- Step 7: Recreate RLS policies for profiles
CREATE POLICY "Super admins can view all profiles" 
ON profiles
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view their own profile" 
ON profiles
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON profiles
FOR UPDATE 
USING (auth.uid() = id);

-- Step 8: Recreate RLS policies for campaigns
CREATE POLICY "Super admins can manage all campaigns" 
ON campaigns
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Clients can manage own campaigns" 
ON campaigns
FOR ALL 
USING (created_by = auth.uid() AND has_role(auth.uid(), 'client'));

-- Step 9: Recreate RLS policies for assessments
CREATE POLICY "Super admins can manage all assessments" 
ON assessments
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Clients can manage own assessments" 
ON assessments
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM campaigns 
    WHERE campaigns.id = assessments.campaign_id 
    AND campaigns.created_by = auth.uid()
  ) AND has_role(auth.uid(), 'client')
);