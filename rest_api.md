# Foosball Streaming API Documentation

This API provides endpoints for managing foosball matches, including sets, goals, and timeouts. The API follows REST principles with nested resources for managing the relationships between matches, sets, goals, and timeouts.

## Authentication

Most endpoints require authentication using the `requireAuth` middleware, with the exception of match creation.

## Match Endpoints

### Basic Match CRUD Operations

- `POST /matches` - Create a new match
  - No authentication required
  - Returns the created match object

- `GET /matches/:id` - Get match details
  - Returns match data including teams, status, score, and match configuration

- `PUT /matches/:id` - Update match details
  - Updates allowed fields of a match
  - Returns the updated match

- `DELETE /matches/:id` - Delete a match
  - Removes a match from the database
  - Returns a success message

### Match Lifecycle Management

- `POST /matches/:id/start` - Start a match
  - Changes match status to "inProgress"
  - Creates the first set if none exists
  - Returns the updated match and set information

- `POST /matches/:id/end` - End a match
  - Changes match status to "completed"
  - Returns the updated match

- `POST /matches/:id/abort` - Abort a match
  - Changes match status to "aborted"
  - Returns the updated match

### Match Sets Management

- `GET /matches/:id/sets` - Get all sets for a match
  - Returns an array of sets ordered by set number

- `POST /matches/:id/sets` - Create a new set
  - Creates the next set for an in-progress match
  - Verifies current set is completed before creating a new one
  - Returns the match and new set

- `GET /matches/:id/sets/current` - Get the current active set
  - Returns the currently active set for the match

- `GET /matches/:matchId/sets/:setNumber` - Get a specific set by number
  - Uses the `resolveSetByNumber` middleware to find a set by its number
  - Returns the set with populated data

- `PUT /matches/:matchId/sets/:setNumber` - Update a specific set
  - Updates scores, status, or other allowed fields
  - Returns the updated set

- `DELETE /matches/:matchId/sets/:setNumber` - Delete a specific set
  - Removes the set from the database
  - Returns a success message

- `POST /matches/:matchId/sets/:setNumber/start` - Start a specific set
  - Changes set status to "inProgress" and sets start time
  - Returns the updated set

- `POST /matches/:matchId/sets/:setNumber/complete` - Complete a set
  - Marks a set as completed and assigns a winner
  - May trigger match progression logic
  - Returns the set, match, and progression information

### Match Events

- `GET /matches/:matchId/goals` - Get all goals for a match
  - Optional query param to include/exclude voided goals
  - Returns an array of goals ordered by timestamp

- `GET /matches/:matchId/timeouts` - Get all timeouts for a match
  - Optional query param to include/exclude voided timeouts
  - Returns an array of timeouts ordered by timestamp

- `GET /matches/:matchId/timeouts/stats` - Get timeout statistics
  - Returns timeout usage by team for each set in the match

- `GET /matches/:matchId/sets/:setNumber/goals` - Get goals for a specific set
  - Returns goals for the specified set

- `GET /matches/:matchId/sets/:setNumber/timeouts` - Get timeouts for a specific set
  - Returns timeouts for the specified set

## Set Endpoints

Independent set endpoints (alternative to match-based routes):

- `POST /sets` - Create a new set
  - Creates a set with a specified match ID and set number
  - Returns the created set

- `GET /sets/:setId` - Get a specific set
  - Returns the set with populated match data

- `PUT /sets/:setId` - Update a set
  - Updates scores, status, or other allowed fields
  - Returns the updated set

- `DELETE /sets/:setId` - Delete a set
  - Removes the set from the database
  - Returns a success message

- `POST /sets/:setId/start` - Start a set
  - Changes set status to "inProgress" and sets start time
  - Returns the updated set

- `POST /sets/:setId/complete` - Complete a set
  - Marks a set as completed and assigns a winner
  - May trigger match progression logic
  - Returns the set, match, and progression information

- `GET /sets/:setId/goals` - Get goals for a set
  - Returns an array of goals for the specified set

- `GET /sets/:setId/timeouts` - Get timeouts for a set
  - Returns an array of timeouts for the specified set

## Goal Endpoints

- `POST /goals` - Create a new goal
  - Records a goal for a specific team in a match/set
  - Updates scores and may trigger progression logic
  - Returns the goal, updated set/match, and progression info

- `GET /goals/:goalId` - Get goal details
  - Returns specific goal information

- `PUT /goals/:goalId` - Update a goal
  - Can update limited fields (voided status, timestamp, scoringRow)
  - Returns the updated goal

- `DELETE /goals/:goalId` - Delete a goal
  - Removes the goal from the database
  - Returns a success message

- `POST /goals/:goalId/void` - Void a goal
  - Marks a goal as invalid but keeps it in the database
  - Updates scores and may trigger progression changes
  - Returns the goal, updated set/match, and progression info

- `POST /goals/:goalId/unvoid` - Unvoid a goal
  - Marks a previously voided goal as valid again
  - Updates scores and may trigger progression changes
  - Returns the goal, updated set/match, and progression info

## Timeout Endpoints

- `POST /timeouts` - Create a new timeout
  - Records a timeout for a specific team in a match/set
  - Checks timeout limits based on match configuration
  - Returns the timeout with updated match data

- `GET /timeouts/:timeoutId` - Get timeout details
  - Returns specific timeout information

- `DELETE /timeouts/:timeoutId` - Delete a timeout
  - Removes the timeout from the database
  - Returns a success message

- `POST /timeouts/:timeoutId/void` - Void a timeout
  - Marks a timeout as invalid but keeps it in the database
  - Updates timeout counts
  - Returns the timeout with updated match data

- `POST /timeouts/:timeoutId/unvoid` - Unvoid a timeout
  - Marks a previously voided timeout as valid again
  - Updates timeout counts
  - Returns the timeout with updated match data

The API includes comprehensive game progression logic that automatically handles the state changes when goals and timeouts are registered, ensuring the match flows correctly through its lifecycle.