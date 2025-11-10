-- Add started_at field to sessions to track when host starts the round
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS started_at timestamp with time zone;

-- Update the check_and_create_match function to properly handle multiple participants
CREATE OR REPLACE FUNCTION public.check_and_create_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

    -- If ALL participants swiped right, create a match
    IF right_swipe_count = participant_count THEN
      INSERT INTO public.session_matches (session_id, place_id, place_data)
      VALUES (NEW.session_id, NEW.place_id, NEW.place_data)
      ON CONFLICT (session_id, place_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_swipe_check_match ON public.session_swipes;
CREATE TRIGGER on_swipe_check_match
  AFTER INSERT ON public.session_swipes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_create_match();