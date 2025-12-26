-- Database trigger to automatically create user profile when a user signs up
-- This bypasses RLS issues by running with elevated privileges
-- Run this in Supabase SQL Editor

-- Function to create user profile automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, password_hash, is_super_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    '', -- Not needed for Supabase Auth
    false
  )
  ON CONFLICT (id) DO NOTHING; -- Don't error if profile already exists
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- SECURITY DEFINER allows bypassing RLS

-- Trigger that fires when a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also handle existing users - create a function to sync existing auth users
CREATE OR REPLACE FUNCTION public.sync_existing_users()
RETURNS void AS $$
BEGIN
  INSERT INTO public.users (id, email, name, password_hash, is_super_admin)
  SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', au.email),
    '',
    false
  FROM auth.users au
  WHERE NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = au.id
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run this once to sync existing users
-- SELECT public.sync_existing_users();

-- Create an RPC function that can be called from the client to sync a single user
-- This allows the app to request profile creation for existing users
CREATE OR REPLACE FUNCTION public.sync_user_profile(user_id_param UUID)
RETURNS void AS $$
BEGIN
  -- Only insert if profile doesn't exist (check by ID first, then by email)
  -- This prevents duplicate key errors
  IF NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = user_id_param
  ) AND NOT EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.email = (SELECT email FROM auth.users WHERE id = user_id_param)
  ) THEN
    INSERT INTO public.users (id, email, name, password_hash, is_super_admin)
    SELECT 
      au.id,
      au.email,
      COALESCE(au.raw_user_meta_data->>'name', au.email),
      '',
      false
    FROM auth.users au
    WHERE au.id = user_id_param
    ON CONFLICT (id) DO NOTHING; -- Handle ID conflicts (primary key)
  END IF;
  -- If profile already exists (by ID or email), do nothing - that's fine
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.sync_user_profile(UUID) TO authenticated;

