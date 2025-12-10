-- ============================================================================
-- Decision Helper App - Database Schema
-- 2-person decision helper app with venue recommendations and swiping
-- ============================================================================

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: Users can read their own profile, update their own profile
-- CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
-- CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- ============================================================================
-- 2. USER_PREFERENCES TABLE
-- Stores onboarding preferences and learned weights from swipes
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  liked_activities TEXT[] DEFAULT '{}',
  liked_cuisines TEXT[] DEFAULT '{}',
  min_price_level INTEGER DEFAULT 1,
  max_price_level INTEGER DEFAULT 4,
  max_distance_km NUMERIC NOT NULL,
  dietary_restrictions TEXT[] DEFAULT '{}',
  home_lat NUMERIC NOT NULL,
  home_lng NUMERIC NOT NULL,
  activity_weights JSONB DEFAULT '{}', -- tag → weight (for learning from swipes)
  cuisine_weights JSONB DEFAULT '{}', -- tag → weight
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: Users can read/update their own preferences
-- CREATE POLICY "Users can view own preferences" ON user_preferences FOR SELECT USING (auth.uid() = user_id);
-- CREATE POLICY "Users can insert own preferences" ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
-- CREATE POLICY "Users can update own preferences" ON user_preferences FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================================
-- 3. SESSIONS TABLE
-- Represents a 2-person session/room for decision making
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- human-friendly room code
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT different_users CHECK (user1_id != user2_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sessions_user1_id ON public.sessions(user1_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user2_id ON public.sessions(user2_id);
CREATE INDEX IF NOT EXISTS idx_sessions_code ON public.sessions(code);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions(status);

-- RLS: Users can only access sessions they are part of
-- CREATE POLICY "Users can view own sessions" ON sessions FOR SELECT 
--   USING (auth.uid() = user1_id OR auth.uid() = user2_id);
-- CREATE POLICY "Users can update own sessions" ON sessions FOR UPDATE 
--   USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- ============================================================================
-- 4. VENUES TABLE
-- Stores venue/place information for recommendations
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  categories TEXT[] DEFAULT '{}', -- e.g. ['bar', 'live_music']
  cuisines TEXT[] DEFAULT '{}', -- e.g. ['sushi', 'japanese']
  price_level INTEGER NOT NULL CHECK (price_level >= 1 AND price_level <= 4),
  is_good_for_groups BOOLEAN NOT NULL DEFAULT true,
  rating NUMERIC CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for spatial queries (distance filtering)
-- Note: ll_to_earth requires PostGIS extension. If not available, use:
-- CREATE INDEX IF NOT EXISTS idx_venues_location ON public.venues(lat, lng);
-- For production with PostGIS:
-- CREATE EXTENSION IF NOT EXISTS postgis;
-- CREATE INDEX IF NOT EXISTS idx_venues_location ON public.venues USING GIST (
--   ll_to_earth(lat, lng)
-- );
CREATE INDEX IF NOT EXISTS idx_venues_location ON public.venues(lat, lng);
CREATE INDEX IF NOT EXISTS idx_venues_categories ON public.venues USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_venues_cuisines ON public.venues USING GIN(cuisines);
CREATE INDEX IF NOT EXISTS idx_venues_price_level ON public.venues(price_level);
CREATE INDEX IF NOT EXISTS idx_venues_good_for_groups ON public.venues(is_good_for_groups);

-- RLS: Venues are public (all authenticated users can read)
-- CREATE POLICY "Authenticated users can view venues" ON venues FOR SELECT 
--   USING (auth.role() = 'authenticated');

-- ============================================================================
-- 5. SWIPES TABLE
-- Records individual user votes (swipes) on venues within a session
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('LIKE', 'DISLIKE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id, venue_id) -- Critical: ensures one vote per user per venue per session
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_swipes_session_id ON public.swipes(session_id);
CREATE INDEX IF NOT EXISTS idx_swipes_user_id ON public.swipes(user_id);
CREATE INDEX IF NOT EXISTS idx_swipes_venue_id ON public.swipes(venue_id);
CREATE INDEX IF NOT EXISTS idx_swipes_direction ON public.swipes(direction);
CREATE INDEX IF NOT EXISTS idx_swipes_session_venue ON public.swipes(session_id, venue_id);

-- RLS: Users can only view/insert/update their own swipes in sessions they belong to
-- CREATE POLICY "Users can view own swipes" ON swipes FOR SELECT 
--   USING (auth.uid() = user_id);
-- CREATE POLICY "Users can insert own swipes" ON swipes FOR INSERT 
--   WITH CHECK (
--     auth.uid() = user_id AND
--     EXISTS (SELECT 1 FROM sessions WHERE id = session_id AND (user1_id = auth.uid() OR user2_id = auth.uid()))
--   );
-- CREATE POLICY "Users can update own swipes" ON swipes FOR UPDATE 
--   USING (auth.uid() = user_id);

-- ============================================================================
-- 6. SESSION_MATCHES TABLE
-- Tracks venues where both users have swiped LIKE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.session_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, venue_id) -- One match per venue per session
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_session_matches_session_id ON public.session_matches(session_id);
CREATE INDEX IF NOT EXISTS idx_session_matches_venue_id ON public.session_matches(venue_id);

-- RLS: Users can only view matches for sessions they belong to
-- CREATE POLICY "Users can view session matches" ON session_matches FOR SELECT 
--   USING (
--     EXISTS (SELECT 1 FROM sessions WHERE id = session_id AND (user1_id = auth.uid() OR user2_id = auth.uid()))
--   );

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate distance between two points (Haversine formula)
-- Returns distance in kilometers
CREATE OR REPLACE FUNCTION public.distance_km(
  lat1 NUMERIC,
  lng1 NUMERIC,
  lat2 NUMERIC,
  lng2 NUMERIC
) RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  earth_radius_km NUMERIC := 6371;
  dlat NUMERIC;
  dlng NUMERIC;
  a NUMERIC;
  c NUMERIC;
BEGIN
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  
  a := sin(dlat/2) * sin(dlat/2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dlng/2) * sin(dlng/2);
  
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN earth_radius_km * c;
END;
$$;

-- ============================================================================
-- 8. TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 9. ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_matches ENABLE ROW LEVEL SECURITY;

