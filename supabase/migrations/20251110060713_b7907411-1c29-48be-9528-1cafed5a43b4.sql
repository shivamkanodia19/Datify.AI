-- Enforce max 10 participants per session and auto-start when full
-- Create or replace functions and triggers safely

-- Function: prevent inserting more than 10 participants in a session
CREATE OR REPLACE FUNCTION public.prevent_exceed_max_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM public.session_participants
  WHERE session_id = NEW.session_id;

  IF current_count >= 10 THEN
    RAISE EXCEPTION 'Session is full (maximum 10 participants)';
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger if it doesn't exist: BEFORE INSERT on session_participants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_prevent_exceed_max_participants'
  ) THEN
    CREATE TRIGGER trg_prevent_exceed_max_participants
    BEFORE INSERT ON public.session_participants
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_exceed_max_participants();
  END IF;
END $$;

-- Function: auto start session when 10 participants are reached
CREATE OR REPLACE FUNCTION public.autostart_session_on_max_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_count INTEGER;
  started TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM public.session_participants
  WHERE session_id = NEW.session_id;

  SELECT started_at INTO started
  FROM public.sessions
  WHERE id = NEW.session_id;

  IF current_count >= 10 AND started IS NULL THEN
    UPDATE public.sessions
    SET started_at = now(), updated_at = now()
    WHERE id = NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger if it doesn't exist: AFTER INSERT on session_participants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_autostart_session_on_max_participants'
  ) THEN
    CREATE TRIGGER trg_autostart_session_on_max_participants
    AFTER INSERT ON public.session_participants
    FOR EACH ROW
    EXECUTE FUNCTION public.autostart_session_on_max_participants();
  END IF;
END $$;
