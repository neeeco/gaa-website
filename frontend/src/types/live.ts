export interface LiveScore {
  id?: number;
  match_key: string;
  home_team: string;
  away_team: string;
  home_score?: string;
  away_score?: string;
  minute?: number;
  is_final: boolean;
  updated_at: string;
  created_at?: string;
  last_update?: string;
}

export interface LiveUpdate {
  id?: number;
  match_key: string;
  minute?: number;
  home_team: string;
  away_team: string;
  home_score?: string;
  away_score?: string;
  is_final: boolean;
  timestamp: string;
}

export interface LiveMatchWithUpdates extends LiveScore {
  updates: LiveUpdate[];
}

export interface LiveScoresResponse {
  data: LiveScore[];
  error?: string;
}

export interface LiveUpdatesResponse {
  data: LiveMatchWithUpdates[];
  error?: string;
} 