-- Create sessions table for collaborative decision making
CREATE TABLE public.sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  session_code TEXT NOT NULL UNIQUE,
  start_address TEXT NOT NULL,
  radius INTEGER NOT NULL DEFAULT 10,
  activities TEXT,
  food_preferences TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create session_participants table
CREATE TABLE public.session_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

-- Create session_swipes table to track user swipes
CREATE TABLE public.session_swipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  place_id TEXT NOT NULL,
  place_data JSONB NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('left', 'right')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id, place_id)
);

-- Create session_matches table for mutual right swipes
CREATE TABLE public.session_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL,
  place_data JSONB NOT NULL,
  is_final_choice BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, place_id)
);

-- Enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sessions
CREATE POLICY "Users can view sessions they're part of"
ON public.sessions FOR SELECT
USING (
  auth.uid() = created_by OR 
  EXISTS (
    SELECT 1 FROM public.session_participants 
    WHERE session_id = sessions.id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own sessions"
ON public.sessions FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Session creators can update their sessions"
ON public.sessions FOR UPDATE
USING (auth.uid() = created_by);

-- RLS Policies for session_participants
CREATE POLICY "Users can view participants in their sessions"
ON public.session_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE id = session_participants.session_id 
    AND (created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM public.session_participants sp 
      WHERE sp.session_id = sessions.id AND sp.user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can join sessions"
ON public.session_participants FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for session_swipes
CREATE POLICY "Users can view swipes in their sessions"
ON public.session_swipes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE id = session_swipes.session_id 
    AND (created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM public.session_participants 
      WHERE session_id = sessions.id AND user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Users can create their own swipes"
ON public.session_swipes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for session_matches
CREATE POLICY "Users can view matches in their sessions"
ON public.session_matches FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE id = session_matches.session_id 
    AND (created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM public.session_participants 
      WHERE session_id = sessions.id AND user_id = auth.uid()
    ))
  )
);

CREATE POLICY "System can create matches"
ON public.session_matches FOR INSERT
WITH CHECK (true);

CREATE POLICY "Session participants can update match final choice"
ON public.session_matches FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.sessions 
    WHERE id = session_matches.session_id 
    AND (created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM public.session_participants 
      WHERE session_id = sessions.id AND user_id = auth.uid()
    ))
  )
);

-- Trigger for sessions updated_at
CREATE TRIGGER update_sessions_updated_at
BEFORE UPDATE ON public.sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check for matches and create them
CREATE OR REPLACE FUNCTION public.check_and_create_match()
RETURNS TRIGGER AS $$
DECLARE
  participant_count INTEGER;
  right_swipe_count INTEGER;
BEGIN
  -- Count total participants in the session
  SELECT COUNT(*) INTO participant_count
  FROM public.session_participants
  WHERE session_id = NEW.session_id;

  -- Only proceed if there are at least 2 participants
  IF participant_count >= 2 THEN
    -- Count right swipes for this place in this session
    SELECT COUNT(*) INTO right_swipe_count
    FROM public.session_swipes
    WHERE session_id = NEW.session_id 
    AND place_id = NEW.place_id 
    AND direction = 'right';

    -- If all participants swiped right, create a match
    IF right_swipe_count = participant_count THEN
      INSERT INTO public.session_matches (session_id, place_id, place_data)
      VALUES (NEW.session_id, NEW.place_id, NEW.place_data)
      ON CONFLICT (session_id, place_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to check for matches after each swipe
CREATE TRIGGER check_match_after_swipe
AFTER INSERT ON public.session_swipes
FOR EACH ROW
EXECUTE FUNCTION public.check_and_create_match();