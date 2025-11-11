import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Place } from "@/types/place";
import SwipeCard from "./SwipeCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, PartyPopper, ArrowLeft, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { useDebounce } from "@/hooks/useDebounce";

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
  like_count: number;
}

const SwipeView = ({ sessionId, sessionCode, recommendations, onBack }: SwipeViewProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [roundMatches, setRoundMatches] = useState<Match[]>([]);
  const [currentRoundCandidates, setCurrentRoundCandidates] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [round, setRound] = useState(1);
  const [deck, setDeck] = useState<Place[]>(recommendations);
  const [participantCount, setParticipantCount] = useState(0);
  const [isVoteMode, setIsVoteMode] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [swipeCounts, setSwipeCounts] = useState<Record<string, number>>({});
  const [showRoundSummary, setShowRoundSummary] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [participantUserIds, setParticipantUserIds] = useState<string[]>([]);
  const [nextAction, setNextAction] = useState<"nextRound" | "vote" | "end" | null>(null);

  const isCheckingRound = useRef(false);

  const deckIds = useMemo(() => deck.map((p) => p.id).join(","), [deck]);
  const participantIds = useMemo(() => participantUserIds.join(","), [participantUserIds]);
  const debouncedDeckIds = useDebounce(deckIds, 300);
  const debouncedParticipantIds = useDebounce(participantIds, 300);

  // Load current user and host status
  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data: session } = await supabase.from("sessions").select("created_by").eq("id", sessionId).single();

      if (session) setIsHost(session.created_by === user.id);
    };
    init();
    loadParticipants();
  }, [sessionId]);

  const loadParticipants = async () => {
    const { data: session } = await supabase.from("sessions").select("created_by").eq("id", sessionId).single();

    const { data: rows } = await supabase.from("session_participants").select("user_id").eq("session_id", sessionId);

    const ids = new Set<string>();
    if (session?.created_by) ids.add(session.created_by);
    rows?.forEach((r: { user_id: string }) => ids.add(r.user_id));

    const list = Array.from(ids);
    setParticipantUserIds(list);
    setParticipantCount(list.length);
  };

  // Load matches and swipes
  useEffect(() => {
    loadMatches();
    loadSwipeCounts();
  }, [sessionId]);

  const loadMatches = async () => {
    const { data, error } = await supabase.from("session_matches").select("*").eq("session_id", sessionId);

    if (!error && data) {
      setAllMatches(
        data.map((m) => ({
          ...m,
          place_data: m.place_data as Place,
          like_count: m.like_count || 0,
        })),
      );
    }
  };

  const loadSwipeCounts = async () => {
    const { data: swipes } = await supabase
      .from("session_swipes")
      .select("place_id, user_id")
      .eq("session_id", sessionId)
      .eq("direction", "right")
      .in(
        "place_id",
        deck.map((p) => p.id),
      );

    if (!swipes) return;

    const counts: Record<string, Set<string>> = {};
    swipes.forEach((s) => {
      if (!counts[s.place_id]) counts[s.place_id] = new Set();
      counts[s.place_id].add(s.user_id);
    });

    const swipeCountsMap: Record<string, number> = {};
    Object.keys(counts).forEach((pid) => (swipeCountsMap[pid] = counts[pid].size));
    setSwipeCounts(swipeCountsMap);
  };

  // Check if round is complete
  const checkRoundCompletion = async () => {
    if (isCheckingRound.current || showRoundSummary || isVoteMode || gameEnded) return;
    isCheckingRound.current = true;

    try {
      // Count completed swipes per user
      const { data: swipes } = await supabase
        .from("session_swipes")
        .select("user_id, place_id")
        .eq("session_id", sessionId)
        .in(
          "place_id",
          deck.map((p) => p.id),
        )
        .eq("direction", "right");

      const swipesByUser: Record<string, Set<string>> = {};
      swipes?.forEach((s) => {
        if (!swipesByUser[s.user_id]) swipesByUser[s.user_id] = new Set();
        swipesByUser[s.user_id].add(s.place_id);
      });

      // Check if all participants finished this round
      const allCompleted = participantUserIds.every((uid) => deck.every((p) => swipesByUser[uid]?.has(p.id)));

      if (!allCompleted) return;

      // Determine unanimous matches
      const unanimousMatches: Match[] = deck
        .filter((place) => participantUserIds.every((uid) => swipesByUser[uid]?.has(place.id)))
        .map((place) => ({
          id: `match-${place.id}`,
          place_id: place.id,
          place_data: place,
          is_final_choice: false,
          like_count: participantUserIds.length,
        }));

      // Determine advancing candidates (more than 1 like but not unanimous)
      const advancingCandidates: Place[] = deck.filter((place) => {
        const likes = swipesByUser ? swipes.filter((s) => s.place_id === place.id).length : 0;
        return likes < participantUserIds.length && likes > 0;
      });

      // Update state
      setRoundMatches(unanimousMatches);
      setCurrentRoundCandidates(advancingCandidates);
      setShowRoundSummary(true);

      // Set next action
      if (advancingCandidates.length === 0 && unanimousMatches.length === 0) {
        setNextAction("end");
        setGameEnded(true);
      } else if (advancingCandidates.length <= 2 && advancingCandidates.length > 0) {
        setNextAction("vote");
      } else if (advancingCandidates.length > 2) {
        setNextAction("nextRound");
      } else {
        setNextAction("end");
      }

      // Update swipe counts
      const newSwipeCounts: Record<string, number> = {};
      deck.forEach((p) => {
        newSwipeCounts[p.id] = swipes.filter((s) => s.place_id === p.id).length;
      });
      setSwipeCounts(newSwipeCounts);
    } catch (err) {
      console.error("Error in checkRoundCompletion:", err);
    } finally {
      isCheckingRound.current = false;
    }
  };

  useEffect(() => {
    if (!debouncedDeckIds || !debouncedParticipantIds) return;
    checkRoundCompletion();
  }, [debouncedDeckIds, debouncedParticipantIds]);

  // Advance to next round
  const advanceToNextRound = async () => {
    setAllMatches((prev) => [...prev, ...roundMatches]);
    setShowRoundSummary(false);
    setRoundMatches([]);
    setSwipeCounts({});
    setNextAction(null);

    if (nextAction === "nextRound" && currentRoundCandidates.length > 0) {
      setDeck(currentRoundCandidates);
      setCurrentIndex(0);
      setRound((prev) => prev + 1);
      toast.success(`Round ${round + 1}: ${currentRoundCandidates.length} places to swipe!`);
    } else if (nextAction === "vote") {
      setIsVoteMode(true);
      toast.success(`Final vote! Choose between ${currentRoundCandidates.length} options.`);
    } else if (nextAction === "end") {
      setGameEnded(true);
      toast.success("Game ended. Check matches above!");
    }
  };

  const handleSwipe = async (direction: "left" | "right") => {
    if (currentIndex >= deck.length) return;
    const place = deck[currentIndex];
    setIsLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Prevent duplicate swipe
      const { data: existing } = await supabase
        .from("session_swipes")
        .select("id")
        .eq("session_id", sessionId)
        .eq("place_id", place.id)
        .eq("user_id", user.id)
        .single();

      if (!existing) {
        await supabase.from("session_swipes").insert({
          session_id: sessionId,
          user_id: user.id,
          place_id: place.id,
          place_data: place as any,
          direction,
        });
      }

      setCurrentIndex((prev) => prev + 1);
      loadSwipeCounts();
      checkRoundCompletion();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async (place: Place) => {
    setIsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("session_swipes").insert({
        session_id: sessionId,
        user_id: user.id,
        place_id: place.id,
        place_data: place as any,
        direction: "right",
      });

      // Check if all voted
      const { data: voteSwipes } = await supabase
        .from("session_swipes")
        .select("user_id")
        .eq("session_id", sessionId)
        .in(
          "place_id",
          currentRoundCandidates.map((p) => p.id),
        );

      if (voteSwipes) {
        const uniqueVoters = new Set(voteSwipes.map((s) => s.user_id));
        if (uniqueVoters.size >= participantCount) {
          tallyFinalVotes();
        }
      }

      loadSwipeCounts();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const tallyFinalVotes = async () => {
    const votesRes = await supabase
      .from("session_swipes")
      .select("place_id")
      .eq("session_id", sessionId)
      .eq("direction", "right")
      .in(
        "place_id",
        currentRoundCandidates.map((p) => p.id),
      );

    if (!votesRes.data) return;

    const voteCounts: Record<string, number> = {};
    votesRes.data.forEach((v) => (voteCounts[v.place_id] = (voteCounts[v.place_id] || 0) + 1));

    const winner = currentRoundCandidates.reduce((prev, cur) =>
      (voteCounts[cur.id] || 0) > (voteCounts[prev.id] || 0) ? cur : prev,
    );

    const winnerMatch = allMatches.find((m) => m.place_id === winner.id);
    if (winnerMatch) {
      await supabase.from("session_matches").update({ is_final_choice: true }).eq("id", winnerMatch.id);
    }

    toast.success(`🎉 Winner: ${winner.name} with ${voteCounts[winner.id]} votes!`);
    setGameEnded(true);
  };

  const currentPlace = deck[currentIndex];
  const progressPercent = deck.length > 0 ? (currentIndex / deck.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      {/* Header & rounds & swipe cards ... */}
      {/* (Use your existing JSX for the UI rendering, it's unchanged) */}
    </div>
  );
};

export default SwipeView;
