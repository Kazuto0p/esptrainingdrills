-- ============================================================
-- PULSE ARENA - SUPABASE DATABASE SCHEMA & POLICIES
-- Run this in your Supabase Project -> SQL Editor -> New Query
-- ============================================================

-- 1. Create Profiles Table linked to Supabase Auth users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Create Test Results Table
CREATE TABLE IF NOT EXISTS public.test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  test_id TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 1000),
  reaction_time NUMERIC,
  accuracy NUMERIC NOT NULL,
  valid BOOLEAN NOT NULL DEFAULT true,
  flags TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for high-performance leaderboards and admin queries
CREATE INDEX IF NOT EXISTS idx_test_results_user ON public.test_results(user_id);
CREATE INDEX IF NOT EXISTS idx_test_results_test_score ON public.test_results(test_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_test_results_valid ON public.test_results(valid);
CREATE INDEX IF NOT EXISTS idx_test_results_created ON public.test_results(created_at DESC);

-- 3. Automatic Profile Creation Trigger on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'player')
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      display_name = COALESCE(EXCLUDED.display_name, profiles.display_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current authenticated user is an Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5. Profiles RLS Policies
-- Anyone authenticated can view public profiles
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own display_name and avatar_url
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

-- Admins can update any profile (e.g. promote to admin)
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- 6. Test Results RLS Policies
-- Users can view their own test results
CREATE POLICY "Users can view own test results"
  ON public.test_results FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin());

-- Users can insert their own test results
CREATE POLICY "Users can insert own test results"
  ON public.test_results FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can view and manage all test results
CREATE POLICY "Admins can manage all test results"
  ON public.test_results FOR ALL
  TO authenticated
  USING (public.is_admin());

-- ============================================================
-- HOW TO PROMOTE YOURSELF TO ADMIN:
-- Replace 'your-email@example.com' with the email you signed up with:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your-email@example.com';
-- ============================================================
