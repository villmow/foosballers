// Shared types for WebSocket events and payloads

export interface ChatMessage {
  user: string;
  message: string;
  timestamp: number;
}

// Scoreboard specific types
export interface ScoreboardData {
  matchId: string;
  sessionId: string;
  teams: [
    {
      name: string | null;
      players: Array<{ name: string; playerId: string | null }>;
      color: string;
      score: number;
      setsWon: number;
      timeoutsLeft: number;
    },
    {
      name: string | null;
      players: Array<{ name: string; playerId: string | null }>;
      color: string;
      score: number;
      setsWon: number;
      timeoutsLeft: number;
    }
  ];
  currentSet: {
    setNumber: number;
    status: 'notStarted' | 'inProgress' | 'completed';
    scores: [number, number];
    timeoutsUsed: [number, number];
    startTime?: Date;
    endTime?: Date;
    winner?: number;
  };
  completedSets: Array<{
    setNumber: number;
    scores: [number, number];
    timeoutsUsed: [number, number];
    winner: number | null;
    duration?: number;
  }>;
  matchConfiguration: {
    numGoalsToWin: number;
    numSetsToWin: number;
    twoAhead: boolean;
    twoAheadUpUntil?: number;
    timeoutsPerSet: number;
    playerSetup: '1v1' | '2v2';
  };
  matchStatus: 'notStarted' | 'inProgress' | 'completed' | 'aborted';
  startTime?: Date;
  endTime?: Date;
  winner?: number | null;
  currentView: 'default' | 'detailed' | 'banner';
  bannerText?: string;
}

export interface GoalEvent {
  matchId: string;
  setId: string;
  teamIndex: number;
  goalId: string;
  timestamp: Date;
  scoringRow?: string;
  newScore: [number, number];
}

export interface TimeoutEvent {
  matchId: string;
  setId: string;
  teamIndex: number;
  timeoutId: string;
  timestamp: Date;
  timeoutsRemaining: [number, number];
}

export interface SetEvent {
  matchId: string;
  setId: string;
  setNumber: number;
  status: 'notStarted' | 'inProgress' | 'completed';
  scores: [number, number];
  winner?: number;
  newSetCreated?: boolean;
}

export interface MatchEvent {
  matchId: string;
  status: 'notStarted' | 'inProgress' | 'completed' | 'aborted';
  winner?: number;
  setsWon: [number, number];
}

export interface ViewChangeEvent {
  matchId: string;
  sessionId: string;
  view: 'default' | 'detailed' | 'banner';
  bannerText?: string;
}

export interface ScoreboardJoinData {
  matchId?: string;
  sessionId?: string;
  view?: 'default' | 'detailed' | 'banner';
}

export interface ScoreboardAuthData {
  sessionId: string;
  matchId?: string;
}

export interface ServerToClientEvents {
  message: (msg: ChatMessage) => void;
  // Scoreboard events
  'scoreboard:data': (data: ScoreboardData) => void;
  'scoreboard:authenticated': (data: ScoreboardData) => void;
  'scoreboard:goal': (event: GoalEvent) => void;
  'scoreboard:timeout': (event: TimeoutEvent) => void;
  'scoreboard:set_update': (event: SetEvent) => void;
  'scoreboard:match_update': (event: MatchEvent) => void;
  'scoreboard:view_change': (event: ViewChangeEvent) => void;
  'scoreboard:view_changed': (event: ViewChangeEvent) => void;
  'scoreboard:error': (error: { message: string; code: string }) => void;
  'scoreboard:joined': (data: { matchId?: string; sessionId: string }) => void;
  'scoreboard:left': (data: { matchId: string; sessionId: string }) => void;
  'scoreboard:viewer_joined': (data: { matchId: string; sessionId: string }) => void;
  'scoreboard:viewer_left': (data: { matchId: string; sessionId: string }) => void;
}

export interface ClientToServerEvents {
  message: (msg: ChatMessage) => void;
  // Scoreboard events
  'scoreboard:join': (data: ScoreboardJoinData, callback?: (response: { success: boolean; error?: string; data?: ScoreboardData }) => void) => void;
  'scoreboard:leave': (data: { matchId: string; sessionId: string }) => void;
  'scoreboard:change_view': (data: ViewChangeEvent) => void;
  'scoreboard:authenticate': (data: ScoreboardAuthData, callback?: (response: { success: boolean; error?: string }) => void) => void;
}

export { };

