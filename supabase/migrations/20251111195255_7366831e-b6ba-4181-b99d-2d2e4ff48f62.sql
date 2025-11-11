-- Update trigger function to enforce participant limits based on session type
CREATE OR REPLACE FUNCTION public.prevent_exceed_max_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_count INTEGER;
  max_participants INTEGER;
  s_type TEXT;
BEGIN
  -- Get session type
  SELECT session_type INTO s_type
  FROM public.sessions
  WHERE id = NEW.session_id;

  -- Set max based on type
  IF s_type = 'date' THEN
    max_participants := 2;
  ELSE
    max_participants := 10;
  END IF;

  -- Count current participants
  SELECT COUNT(*) INTO current_count
  FROM public.session_participants
  WHERE session_id = NEW.session_id;

  IF current_count >= max_participants THEN
    RAISE EXCEPTION 'Session is full (maximum % participants for % session)', max_participants, s_type;
  END IF;

  RETURN NEW;
END;
$function$;

-- Update autostart function to respect session type
CREATE OR REPLACE FUNCTION public.autostart_session_on_max_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_count INTEGER;
  started TIMESTAMP WITH TIME ZONE;
  max_participants INTEGER;
  s_type TEXT;
BEGIN
  -- Get session details
  SELECT session_type, started_at INTO s_type, started
  FROM public.sessions
  WHERE id = NEW.session_id;

  -- Set max based on type
  IF s_type = 'date' THEN
    max_participants := 2;
  ELSE
    max_participants := 10;
  END IF;

  -- Count current participants
  SELECT COUNT(*) INTO current_count
  FROM public.session_participants
  WHERE session_id = NEW.session_id;

  -- Auto-start when max reached
  IF current_count >= max_participants AND started IS NULL THEN
    UPDATE public.sessions
    SET started_at = now(), updated_at = now()
    WHERE id = NEW.session_id;
  END IF;
  
  RETURN NEW;
END;
$function$;