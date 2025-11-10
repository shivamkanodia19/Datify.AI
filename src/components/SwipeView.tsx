import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Place } from "@/types/place";
import SwipeCard from "./SwipeCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, PartyPopper, ArrowLeft, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface SwipeViewProps {
  sessionId: string;
  sessionCode: string;
  recommendations: Place[];
  onBack: () => void;
}

interface Match {
  id: string;
  place_id: string;
  place_data: Place;
  is_final_choice: boolean;
  like_count?: number;
}

const SwipeView = ({ sessionId, sessionCode, recommendations, onBack }: SwipeViewProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [round, setRound] = useState<1 | 2>(1);
  const [deck, setDeck] = useState<Place[]>(recommendations);

  // Check if Round 1 is complete and should transition to Round 2
  useEffect(() => {
    if (round === 1 && currentIndex >= recommendations.length && matches.length > 1) {
      // Round 1 complete with multiple matches - start Round 2
      const matchPlaces = matches.map(m => m.place_data);
      setDeck(matchPlaces);
      setCurrentIndex(0);
      setRound(2);
      toast.success(`🎉 Round 2: ${matches.length} mutual matches! Swipe to narrow down.`);
    }
  }, [currentIndex, recommendations.length, matches, round]);
  useEffect(() => {
    loadMatches();

    // Subscribe to new matches
    const channel = supabase
      .channel(`session_matches_${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'session_matches',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newMatch = payload.new as Match;
          setMatches((prev) => [...prev, newMatch]);
          toast.success(`🎉 It's a match! ${newMatch.place_data.name}`);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const loadMatches = async () => {
    const { data, error } = await supabase
      .from('session_matches')
      .select('*')
      .eq('session_id', sessionId);

    if (!error && data) {
      const typedMatches = await Promise.all(data.map(async (match) => {
        // Count how many participants liked this place
        const { count } = await supabase
          .from('session_swipes')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', sessionId)
          .eq('place_id', match.place_id)
          .eq('direction', 'right');

        return {
          ...match,
          place_data: match.place_data as unknown as Place,
          like_count: count ?? 0
        };
      }));
      
      // Sort by like_count descending (most liked first)
      const sortedMatches = typedMatches.sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0));
      setMatches(sortedMatches as any);
    }
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (currentIndex >= deck.length) return;

    const place = deck[currentIndex];
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await supabase
        .from('session_swipes')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          place_id: place.id,
          place_data: place as any,
          direction,
        });

      setCurrentIndex((prev) => prev + 1);
    } catch (error) {
      console.error('Error recording swipe:', error);
      toast.error("Failed to record swipe");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestart = () => {
    if (matches.length === 0) {
      toast.error("No mutual matches to replay yet!");
      return;
    }
    const matchPlaces = matches.map(m => m.place_data);
    setDeck(matchPlaces);
    setCurrentIndex(0);
    setRound(2);
    toast.success("Replaying mutual matches!");
  };

  const handleFinalChoice = async (matchId: string) => {
    try {
      await supabase
        .from('session_matches')
        .update({ is_final_choice: true })
        .eq('id', matchId);

      toast.success("Final choice selected! 🎉");
    } catch (error) {
      console.error('Error setting final choice:', error);
      toast.error("Failed to set final choice");
    }
  };

  const currentPlace = deck[currentIndex];
  const progressPercent = deck.length > 0 ? ((currentIndex / deck.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between max-w-md mx-auto">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="text-center">
          <p className="text-sm font-medium">Session Code</p>
          <Badge variant="secondary" className="text-lg">{sessionCode}</Badge>
        </div>
      </div>

      {/* Round Banner */}
      <Card className={`max-w-md mx-auto ${round === 2 ? 'border-primary bg-primary/5' : ''}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              {round === 1 ? (
                <>
                  <Sparkles className="w-5 h-5" />
                  Round 1: Initial Swipes
                </>
              ) : (
                <>
                  <Heart className="w-5 h-5 text-primary" />
                  Round 2: Mutual Matches
                </>
              )}
            </CardTitle>
            {matches.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestart}
                disabled={round === 2 && currentIndex < deck.length}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Replay
              </Button>
            )}
          </div>
          <CardDescription>
            {round === 1 
              ? "Swipe through all places. Matches appear when ALL participants like the same place!"
              : "Narrow down your favorites from the mutual matches (sorted by popularity)!"}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Progress</span>
              <span>{currentIndex} of {deck.length}</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {matches.length > 0 && (
        <Card className="max-w-md mx-auto border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-primary" />
              Mutual Matches ({matches.length})
            </CardTitle>
            <CardDescription>
              Places ALL participants liked (sorted by most to least liked)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {matches.map((match) => (
              <div
                key={match.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-medium">{match.place_data.name}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">{match.place_data.type}</p>
                    {match.like_count && (
                      <Badge variant="secondary" className="text-xs">
                        {match.like_count} {match.like_count === 1 ? 'like' : 'likes'}
                      </Badge>
                    )}
                  </div>
                </div>
                {!match.is_final_choice && (
                  <Button
                    size="sm"
                    onClick={() => handleFinalChoice(match.id)}
                  >
                    Choose This
                  </Button>
                )}
                {match.is_final_choice && (
                  <Badge variant="default">
                    <PartyPopper className="w-3 h-3 mr-1" />
                    Final Choice
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center">
        {currentPlace ? (
          <SwipeCard
            place={currentPlace}
            onSwipeLeft={() => handleSwipe('left')}
            onSwipeRight={() => handleSwipe('right')}
          />
        ) : (
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {round === 1 ? "Round 1 Complete! 🎉" : "Round 2 Complete! 🎊"}
              </CardTitle>
              <CardDescription>
                {round === 1 && matches.length > 1 && (
                  "Great! You found mutual matches. Starting Round 2..."
                )}
                {round === 1 && matches.length === 1 && (
                  "Perfect! Only 1 mutual match - that's your unanimous choice!"
                )}
                {round === 1 && matches.length === 0 && (
                  "No mutual matches where ALL participants agreed. Try adjusting preferences."
                )}
                {round === 2 && (
                  "All done! Check your mutual matches above (sorted by popularity) and choose your final destination."
                )}
              </CardDescription>
            </CardHeader>
            {matches.length > 0 && (
              <CardContent>
                <Button onClick={handleRestart} className="w-full">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Replay Matches
                </Button>
              </CardContent>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default SwipeView;
