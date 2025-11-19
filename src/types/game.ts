// Type definitions for game state and round completion

import { Place } from './place';

export interface Match {
  id: string;
  place_id: string;
  place_data: Place;
  is_final_choice: boolean;
  like_count: number;
}

export interface RoundCompletionResult {
  completed: boolean;
  participant_count: number;
  version?: number;
  version_mismatch?: boolean;
  locked?: boolean;
  error?: string;
  unanimous_matches: string[];
  advancing_places: Array<{
    place_id: string;
    like_count: number;
    place_data: Place;
  }>;
  eliminated_place_ids: string[];
  next_action: 'nextRound' | 'vote' | 'end';
}

export interface FinalVoteResult {
  winner_place_id: string;
  winner_place_data: Place;
  vote_count: number;
  participant_count: number;
  was_tie: boolean;
  tie_breaker_used: boolean;
}

export interface GameState {
  // Round tracking
  round: number;
  currentIndex: number;
  deck: Place[];
  
  // Participants
  participantCount: number;
  participantUserIds: string[];
  currentUserId: string | null;
  isHost: boolean;
  
  // Matches and candidates
  allMatches: Match[];
  roundMatches: Match[];
  advancingCandidates: Place[];
  
  // Like tracking per place (for current round)
  swipeCounts: Record<string, number>;
  
  // Game flow state
  isLoading: boolean;
  isVoteMode: boolean;
  gameEnded: boolean;
  showRoundSummary: boolean;
  nextAction: 'nextRound' | 'vote' | 'end' | null;
  
  // Final winner
  finalWinner: Place | null;
  
  // Session version for optimistic locking
  sessionVersion: number;
  
  // Connection state
  isConnected: boolean;
  isReconnecting: boolean;
}

