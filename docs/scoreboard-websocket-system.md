# Scoreboard WebSocket System Documentation

## Overview

The scoreboard WebSocket system provides real-time scoreboard functionality for foosball matches. It extends the existing Socket.io server with session-based authentication, room management, and real-time event broadcasting.

## Architecture

### Core Components

1. **ScoreboardService** (`/services/scoreboardService.ts`)
   - Session management with expiration
   - Data transformation from Match/Set documents to scoreboard format
   - Session validation and cleanup

2. **ScoreboardMiddleware** (`/middleware/scoreboardMiddleware.ts`)
   - Authentication middleware for WebSocket connections
   - Join validation and room management utilities
   - Automatic disconnect cleanup

3. **ScoreboardBroadcastService** (`/services/scoreboardBroadcastService.ts`)
   - Broadcasting of goal, timeout, set, and match events
   - Room-based targeting using match IDs
   - Integration with existing controllers

4. **Scoreboard Routes** (`/routes/scoreboardRoutes.ts`)
   - REST API endpoints for session management
   - Session creation, retrieval, view updates, deletion

### WebSocket Events

#### Client → Server Events

- `scoreboard:authenticate` - Authenticate with session credentials
- `scoreboard:join` - Join a scoreboard room for a specific match
- `scoreboard:leave` - Leave a scoreboard room
- `scoreboard:change_view` - Change scoreboard view mode

#### Server → Client Events

- `scoreboard:authenticated` - Authentication successful with initial data
- `scoreboard:joined` - Successfully joined room
- `scoreboard:left` - Successfully left room
- `scoreboard:view_changed` - View mode changed
- `scoreboard:goal_event` - Real-time goal updates
- `scoreboard:timeout_event` - Real-time timeout updates
- `scoreboard:set_event` - Real-time set updates
- `scoreboard:match_event` - Real-time match updates
- `scoreboard:error` - Error notifications

## Usage

### 1. Creating a Scoreboard Session

```bash
POST /api/scoreboard/session
Content-Type: application/json

{
  "matchId": "507f1f77bcf86cd799439011"
}
```

Response:
```json
{
  "success": true,
  "session": {
    "sessionId": "abc123...",
    "matchId": "507f1f77bcf86cd799439011",
    "createdAt": "2025-06-01T20:00:00.000Z",
    "expiresAt": "2025-06-02T20:00:00.000Z",
    "currentView": "default"
  }
}
```

### 2. WebSocket Connection Flow

```javascript
const socket = io('http://localhost:8001');

// 1. Connect to WebSocket
socket.on('connect', () => {
  // 2. Authenticate with session
  socket.emit('scoreboard:authenticate', { 
    sessionId: 'abc123...', 
    matchId: '507f1f77bcf86cd799439011' 
  });
});

// 3. Handle authentication response
socket.on('scoreboard:authenticated', (data) => {
  console.log('Initial scoreboard data:', data);
  
  // 4. Join scoreboard room
  socket.emit('scoreboard:join', { 
    sessionId: 'abc123...', 
    matchId: '507f1f77bcf86cd799439011' 
  });
});

// 5. Handle room join confirmation
socket.on('scoreboard:joined', (data) => {
  console.log('Joined room:', data.room);
});

// 6. Listen for real-time events
socket.on('scoreboard:goal_event', (event) => {
  console.log('Goal event:', event);
});
```

### 3. View Modes

The scoreboard supports three view modes:

- **default**: Standard scoreboard view with scores and basic info
- **detailed**: Extended view with detailed statistics and history
- **banner**: Minimal banner view with custom text overlay

```javascript
// Change view mode
socket.emit('scoreboard:change_view', {
  sessionId: 'abc123...',
  matchId: '507f1f77bcf86cd799439011',
  view: 'detailed'
});

// For banner view with custom text
socket.emit('scoreboard:change_view', {
  sessionId: 'abc123...',
  matchId: '507f1f77bcf86cd799439011',
  view: 'banner',
  bannerText: 'Championship Final!'
});
```

## REST API Endpoints

### Session Management

- `POST /api/scoreboard/session` - Create new session
- `GET /api/scoreboard/session/:sessionId` - Get session details
- `PUT /api/scoreboard/session/:sessionId` - Update session view
- `DELETE /api/scoreboard/session/:sessionId` - Delete session
- `POST /api/scoreboard/cleanup` - Cleanup expired sessions

### Example Session Update

```bash
PUT /api/scoreboard/session/abc123...
Content-Type: application/json

{
  "view": "banner",
  "bannerText": "Match Point!"
}
```

## Real-time Broadcasting

The system automatically broadcasts events when:

1. **Goals are created/voided/unvoided** via `goalController`
2. **Timeouts are created/voided/unvoided** via `timeoutController`
3. **Sets are completed** via `setController`
4. **Matches are completed** via `setController`

All connected scoreboard clients for the specific match receive these updates immediately.

## Data Structures

### ScoreboardData
```typescript
interface ScoreboardData {
  matchId: string;
  sessionId: string;
  teams: Array<{
    name: string;
    players: string[];
    color: string;
    score: number;
    setsWon: number;
    timeoutsLeft: number;
  }>;
  currentSet: {
    setNumber: number;
    status: string;
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
    playerSetup: string;
  };
  matchStatus: string;
  startTime?: Date;
  endTime?: Date;
  winner?: number;
  currentView: 'default' | 'detailed' | 'banner';
  bannerText?: string;
}
```

### Event Types
```typescript
interface GoalEvent {
  type: 'goal_created' | 'goal_voided' | 'goal_unvoided';
  matchId: string;
  setId: string;
  goalId: string;
  team: number;
  player: string;
  timestamp: Date;
  currentScores: [number, number];
}

interface TimeoutEvent {
  type: 'timeout_created' | 'timeout_voided' | 'timeout_unvoided';
  matchId: string;
  setId: string;
  timeoutId: string;
  team: number;
  timestamp: Date;
  timeoutsUsed: [number, number];
}

interface SetEvent {
  type: 'set_completed';
  matchId: string;
  setId: string;
  setNumber: number;
  finalScores: [number, number];
  winner: number;
  duration: number;
  timestamp: Date;
}

interface MatchEvent {
  type: 'match_completed';
  matchId: string;
  winner: number;
  finalScore: [number, number];
  totalDuration: number;
  timestamp: Date;
}
```

## Security Features

1. **Session-based Authentication**: Each scoreboard connection requires a valid session
2. **Match-specific Authorization**: Sessions are tied to specific matches
3. **Automatic Expiration**: Sessions expire after 24 hours
4. **Room Isolation**: Clients only receive events for their specific match
5. **Input Validation**: All WebSocket events are validated for required parameters

## Error Handling

The system provides comprehensive error handling:

- Invalid session IDs return appropriate error messages
- Expired sessions are automatically cleaned up
- Malformed WebSocket events trigger error responses
- Database errors are gracefully handled with fallback responses
- All errors are logged for debugging

## Testing

Run the test script to verify the system:

```bash
cd backend
node test-scoreboard-system.js
```

This script demonstrates:
- Session creation via REST API
- WebSocket authentication
- Room joining/leaving
- View changes
- Event broadcasting simulation

## Performance Considerations

1. **Memory Management**: Sessions are stored in memory with automatic cleanup
2. **Room Efficiency**: Only clients in specific match rooms receive relevant events
3. **Minimal Data Transfer**: Only essential data is broadcast to clients
4. **Connection Cleanup**: Automatic cleanup on client disconnect

## Future Enhancements

1. **Persistent Session Storage**: Move sessions to Redis for scalability
2. **Rate Limiting**: Add rate limiting for WebSocket events
3. **Reconnection Logic**: Implement automatic reconnection with state recovery
4. **Analytics**: Add usage analytics and performance monitoring
5. **Mobile Optimizations**: Optimize data structures for mobile clients
