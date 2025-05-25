You are an expert in UI/UX design and software development. You are tasked with creating a user interface for a foosball match logging application. The application should be intuitive, easy to use, and meet my functional requirements provided. If you have any questions or need implementation details, please ask.

I would like to create concise functional requirements for the following application:

# Functional Requirements Overview

The application consists of several components that work together to provide a complete match logging experience. The main components are:
1. A MatchConfiguration, that remains mostly the same for all matches.
    - it contains the mode (singles or doubles)
    - required amounts of sets needed to win
    - required amount of goals in a set to win a set
    - and others:
    ```javascript
    numGoalsToWin.value = 7;
    numSetsToWin.value = 1;
    timeoutsPerSet.value = 2;
    draw.value = false;
    twoAhead.value = false;
    twoAheadUpUntil.value = 8
    ```
    - this configuration can be set once per day and reused for all matches that day
2. PlayerConfiguration:
    - inputs for player names per team (1 input when singles per team otherwise 2 inputs) (changes each match)
    - color selection (remains mostly the same all day after setting it once)
    - buttons to delete the input and start the match
    - this configuration can be fetched from the API and displayed in a form
3. MatchLoggingWidget:
    - this widget appears when a match is created and allows to log the match.
    - it depends on the MatchConfiguration and PlayerConfiguration.
    - this needs to be implemented simple enough to be not tedious to use.
    - it consists of one or more SetLoggingWidgets, where another one appears when the current set is completed.
    - it should display the current score, the time since the match started, and the current set number.
    - it should also display the match status (in progress, completed, aborted) and allow for actions like starting a new set or ending the match.
    - it should have a button to abort the match, which will set the match status to aborted and return to the Dashboard.
4. SetLoggingWidget:
   - Easy way to increase and decrease goals for each team
   - When decreasing, the last goal should be voided in the API
   - The time passed in the set should be displayed with a button to start/stop the timer.
   - A button to log the set as completed, which will trigger the creation of a new SetLoggingWidget in the MatchLoggingWidget if the match is still in progress.
   - A button to log a timeout for each team, which will update the match state and display the timeout in the SetLoggingWidget.

5. MatchListWidget:
    - A view that lists all matches with their current status.
    - See `foosball-streaming/frontend/src/views/pages/Crud.vue` for a template to start with.
    - Each match should display basic information like team names, current score, and match status.
    - A button to create a new match, which will redirect to the MatchConfiguration and PlayerConfiguration setup in the Dashboard.
    - Options to filter matches by status (in progress, completed, aborted).
    - A search bar to quickly find matches by team names or match ID.
6. MatchDetailsWidget:
    - A detailed view of a specific match.
    - Very similar to the MatchLoggingWidget, but read-only.
    - Displays all sets, goals, and timeouts in a structured format.
    - Allows for viewing the match history without making changes.
    - Should include options to export match data (e.g., as JSON or CSV) for analysis or record-keeping.

# Foosball Streaming API Documentation

The backend API provides endpoints for managing foosball matches, including sets, goals, and timeouts. The API follows REST principles with nested resources for managing the relationships between matches, sets, goals, and timeouts.

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