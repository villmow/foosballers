# Foosball Match Logging Application UI Functional Requirements

## Overall Application Structure & Navigation

I envision a Single Page Application (SPA) with a simple navigation structure:

*   **Dashboard / Home:** The landing page. Provides access to:
    *   Setting/Updating Daily `MatchConfiguration`.
    *   Starting a new match (leads to `PlayerConfiguration`).
    *   Viewing the `MatchListWidget`.
*   **Match Logging View:** A dedicated view when a match is active, prominently featuring the `MatchLoggingWidget`.
*   **Match History View:** Primarily the `MatchListWidget`, allowing navigation to individual `MatchDetailsWidget` views.

---

## 1. MatchConfiguration UI

*   **Purpose:** Set up the default rules for matches played on a given day.
*   **Location:** Accessible from the Dashboard. Could be a modal dialog or a dedicated section on the Dashboard.
*   **Layout & Elements:**
    *   **Title:** "Daily Match Settings" or "Match Configuration for Today".
    *   **Form Fields:**
        *   **Mode:** Radio buttons or a segmented control: `( ) Singles` `( ) Doubles`.
            *   *Interaction:* Selecting this will dynamically affect player input fields in `PlayerConfiguration`.
        *   **Sets to Win:** Number input (e.g., `[ 1 ] v ^`) with label "Sets to Win Match".
        *   **Goals to Win Set:** Number input (e.g., `[ 7 ] v ^`) with label "Goals to Win Set".
        *   **Timeouts per Set per Team:** Number input (e.g., `[ 2 ] v ^`) with label "Timeouts per Set".
        *   **Two Ahead Rule:** Checkbox `[ ] Must Win by Two Goals?`
            *   *Interaction:* If checked, reveals the `twoAheadUpUntil` field.
        *   **Two Ahead Up Until:** Number input (e.g., `[ 8 ] v ^`) with label "Win by Two Applies Up To Goal:". Only visible if "Two Ahead Rule" is checked.
    *   **Action Buttons:**
        *   `[ Save Settings as Preset ]`
        *   `[ Load Presets ]` (dropdown)
            *   **Presets:** Common match configurations for quick setup:
                *   **Qualification:** 1 set to win, 7 goals per set, 2 timeouts per set, no draw, no "win by two".
                *   **Best of 3:** 2 sets to win, 5 goals per set, 2 timeouts per set, no draw, "win by two" enabled until 8 goals.
                *   **Best of 5:** 3 sets to win, 5 goals per set, 2 timeouts per set, no draw, "win by two" enabled.
*   **Behavior:**
    *   On load, it should fetch and display the currently saved configuration.
    *   The "Save Settings as Preset" button should save the current configuration to a user profile (this requires a backend endpoint to be implemented).
    *   The "Load Presets" dropdown should allow users to select a preset configuration, which will populate the form fields with the corresponding values.
    *   This configuration will then be passed when creating a new match via `POST /matches`.

---

## 2. PlayerConfiguration UI

*   **Purpose:** Define teams and players for a new match, and initiate the match.
*   **Location:** Always visible on the Dashboard next to the Match Configuration, or as a modal dialog when starting a new match.
*   **Layout & Elements:**
    *   **Title:** "Setup New Match"
    *   **Match Mode Display:** Read-only text: "Mode: [Singles/Doubles]" (pulled from `MatchConfiguration`).
    *   **Team Sections (e.g., "Team 1 / Green" and "Team 2 / Black"):**
        *   **Team 1 (e.g., Green):**
            *   **Color Picker:** A simple swatch selector for team color. Defaults to the last used color or a standard default.
            *   **Player 1 Name:** Text input `[ Enter Player 1 Name ]`.
            *   **Player 2 Name (Doubles Only):** Text input `[ Enter Player 2 Name ]`. This field is only visible if the mode is "Doubles".
        *   **Team 2 (e.g., Red):**
            *   **Color Picker:** Similar to Team 1.
            *   **Player 1 Name:** Text input `[ Enter Player 1 Name ]`.
            *   **Player 2 Name (Doubles Only):** Text input `[ Enter Player 2 Name ]`.
    *   **Action Buttons:**
        *   `[ Start Match ]` (primary action)
        *   `[ Cancel ]` (returns to Dashboard)
*   **Behavior:**
    *   The "Start Match" button:
        1.  Collects player names and selected colors.
        2.  Gathers the current `MatchConfiguration` data.
        3.  Makes a `POST /matches` call with all this data.
        5.  Navigates the user to the `MatchLoggingWidget` for the newly created and started match, this Widget appears below both the `MatchConfiguration` and `PlayerConfiguration` sections on the Dashboard.
    *   "Fetch from API": If there's an endpoint to get recent player names or predefined teams, these could be used to populate suggestions. Leave this for future iterations, but implement a button.

---

## 3. MatchLoggingWidget UI

*   **Purpose:** Actively log goals, timeouts, and set progression for an ongoing match. This needs to be very efficient.
*   **Location:** A dedicated view, entered after starting a match or resuming an in-progress match from the `MatchListWidget`.
*   **Layout & Elements:**
    *   **Header Section (Sticky/Prominent):**
        *   **Overall Match Score:** Large display, e.g., `Team A: - Team B:` (sets won).
        *   **Team Names & Colors:** Clearly displayed.
        *   **Match Timer:** `Time Elapsed: [00:15:32]` (starts when match status becomes "inProgress").
        *   **Current Set Number:** `Set of`.
        *   **Match Status:** `Status: In Progress`.
    *   **Current Set Area:** This will contain the active `SetLoggingWidget`. When a set is completed, this area will be updated/replaced with the `SetLoggingWidget` for the next set.
    *   **Match Actions Bar (Footer or Side):**
        *   `[ Abort Match ]` button (with confirmation dialog: "Are you sure you want to abort this match? This action cannot be undone.")
            *   *Action:* Calls `POST /matches/:id/abort` and navigates to Dashboard/MatchList.
        *   `[ End Match ]` button (appears if winning condition for sets is met, or if "Allow Draw" is true and sets are equal after the required number).
            *   *Action:* Calls `POST /matches/:id/end`, shows a match summary, then navigates to MatchList/MatchDetails.
        *   `[ Start Next Set ]` button (appears only when the current set is completed AND the match is not yet won/ended).
            *   *Action:* Calls `POST /matches/:id/sets` to create the new set, then `POST /matches/:matchId/sets/:setNumber/start` to activate it. The UI then loads the new `SetLoggingWidget` for this set.
*   **Behavior:**
    *   On load, fetches the match details (`GET /matches/:id`) and the current active set (`GET /matches/:id/sets/current`). If no current set, it implies the first set needs to be started (or `POST /matches/:id/start` handles this).
    *   The UI dynamically updates based on game progression (e.g., enabling "End Match" or "Start Next Set").

---

## 4. SetLoggingWidget UI (Embedded in MatchLoggingWidget)

*   **Purpose:** Log events for the *current* set. Designed for speed and minimal clicks.
*   **Layout & Elements (for the active set):**
    *   **Set Information:**
        *   `Current Set:`
        *   `Set Timer: [00:05:12]` (with a `[ Start Set ]` button).
            *   *Note:* API has set start. The timer can run locally. `POST /matches/:matchId/sets/:setNumber/start` is called when the set officially begins.
    *   **Team Score Displays (Side-by-Side or Top/Bottom):**
        *   **Team A Area (e.g., Left Side):**
            *   **Team Name & Color**
            *   **Score:** Very large number display `[ 3 ]`.
            *   **Goal Buttons:**
                *   `[ + Goal ]` (large, easily clickable/tappable)
                    *   *Action:* `POST /goals` with team ID, current match ID, current set ID. On success, update score display.
                *   `[ - Goal (Undo) ]`
                    *   *Action:* Client needs to know the last goal ID for this team in this set. This requires the `POST /goals` response to return the goal ID, which the client stores. Then call `POST /goals/:goalId/void`. Update score.
            *   **Timeout Button:** `[ Call Timeout (/ remaining) ]`
                *   *Action:* `POST /timeouts` with team ID, current match ID, set ID. Update remaining timeouts display. Disable if no timeouts left.
        *   **Team B Area (e.g., Right Side):**
            *   Mirrors Team A's layout and functionality for Team B.
    *   **Set Actions:**
        *   `[ Complete Set ]` button.
            *   *Visibility:* Enabled when a team reaches `numGoalsToWinSet` (considering `twoAhead` rules).
            *   *Action:* Calls `POST /matches/:matchId/sets/:setNumber/complete`. On success, `MatchLoggingWidget` logic takes over to decide if a new set starts or the match ends.
*   **Behavior:**
    *   Focus on large, clear buttons for scoring. Accidental clicks should be easily reversible with the "- Goal (Undo)" button.
    *   The "Start/Pause Timer" for the set is important. `POST .../start` when it truly begins. The displayed timer can pause locally if needed (e.g., ball out of play, disputes).
    *   When a goal is scored that wins the set (respecting `twoAhead` if applicable), the `[ Complete Set ]` button might become more prominent or even auto-trigger a confirmation ("Team A wins the set. Confirm?").

---
?
## 5. MatchListWidget UI

*   **Purpose:** View a list of all matches, filter them, and access individual matches.
*   **Location:** A main navigation item, possibly part of the "Match History" view.
*   **Layout & Elements (inspired by `Crud.vue`):**
    *   **Title:** "Match History" or "All Matches".
    *   **Action Button (Top):** `[ + Create New Match ]`
        *   *Action:* Navigates to the `PlayerConfiguration` UI (which will use the daily `MatchConfiguration`).
    *   **Filtering & Search Bar (Above the list):**
        *   **Search Input:** `[ Search by Team Name or Match ID... ]`
        *   **Status Filter:** Dropdown or segmented buttons: `[ All ] [ In Progress ] [ Completed ] [ Aborted ]`
    *   **Match List (Table or Card List):**
        *   **Columns (for table view):**
            *   Match ID (clickable, leads to `MatchDetailsWidget`)
            *   Team 1 (Players)
            *   Team 2 (Players)
            *   Score (e.g., Sets: 2-1, Current Set Goals: 5-3 if in progress)
            *   Status (In Progress, Completed, Aborted)
            *   Date/Time Started
            *   Actions (e.g., "View Details", "Log Match" if In Progress)
        *   **Card View (Alternative):** Each match is a card with summarized info and action buttons. Better for mobile/tablet.
*   **Behavior:**
    *   On load, fetches matches (`GET /matches`).
    *   Search and filter controls update query parameters for `GET /matches`.
    *   Clicking "Log Match" for an "In Progress" match navigates to `MatchLoggingWidget` for that match.
    *   Clicking "View Details" (or the Match ID) navigates to `MatchDetailsWidget`.

---

## 6. MatchDetailsWidget UI

*   **Purpose:** Provide a comprehensive, read-only view of a completed or in-progress match.
*   **Location:** Accessed by clicking on a match in the `MatchListWidget`.
*   **Layout & Elements (Similar to `MatchLoggingWidget` but read-only and more detailed):**
    *   **Match Summary Header:**
        *   Teams, Final Score (Sets), Winner (if applicable), Total Match Duration, Status.
    *   **Tabs or Accordion for Sets:**
        *   Each tab/section is labeled "Set 1", "Set 2", etc.
        *   **Inside each Set section:**
            *   Set Winner (if applicable)
            *   Set Score (Goals)
            *   Set Duration
            *   **Timeline of Goals:**
                *   List each goal: `[Timestamp] - Player X (Team Y) scored. (Goal 7-5)`
                *   Indicate if a goal was voided.
            *   **Timeline of Timeouts:**
                *   List each timeout: `[Timestamp] - Timeout called by Team X.`
                *   Indicate if a timeout was voided.
    *   **Action Buttons (Top or Bottom):**
        *   `[ Export Match Data (JSON) ]`
        *   `[ Export Match Data (CSV) ]`
        *   `[ < Back to Match List ]`
*   **Behavior:**
    *   On load, fetches all necessary data:
        *   `GET /matches/:id`
        *   `GET /matches/:id/sets`
        *   For each set: `GET /matches/:matchId/sets/:setNumber/goals` and `GET /matches/:matchId/sets/:setNumber/timeouts`.
    *   Export buttons will compile the fetched data into the respective formats and trigger a download.

---

## Key User Flows Visualized

1.  **Setting Daily Config:**
    *   User -> Dashboard -> Open Match Configuration -> Adjust settings -> Save.
2.  **Starting & Logging a New Match:**
    *   User -> Dashboard -> "Create New Match" -> `PlayerConfiguration` UI (enter names, pick colors) -> "Start Match"
    *   System -> `POST /matches`, then `POST /matches/:id/start`
    *   User -> Navigated to `MatchLoggingWidget`
    *   User -> (Inside `SetLoggingWidget`) -> Click "+ Goal Team A"
    *   System -> `POST /goals` -> UI updates score.
    *   User -> ... logs more goals ...
    *   User -> Clicks "Complete Set" (when conditions met)
    *   System -> `POST /matches/:matchId/sets/:setNumber/complete`
    *   User -> (Inside `MatchLoggingWidget`) -> Clicks "Start Next Set" (if match not over)
    *   System -> `POST /matches/:id/sets`, then `POST /matches/:matchId/sets/:newSetNumber/start`
    *   User -> New `SetLoggingWidget` appears.
    *   ... repeat until match ends ...
    *   User -> Clicks "End Match" (when conditions met)
    *   System -> `POST /matches/:id/end`
    *   User -> Navigated to Match Details or Match List.
3.  **Viewing Past Match:**
    *   User -> Dashboard -> "Match History" / `MatchListWidget` -> Filter/Search (optional) -> Click on a Match ID or "View Details"
    *   User -> Navigated to `MatchDetailsWidget` -> View details -> Export (optional).

This detailed breakdown should provide a solid foundation for the UI/UX. The emphasis is on minimizing friction during logging and providing clear information at each stage. Let me know your thoughts or if you'd like to dive deeper into any specific area!         






Please implement the following two UIs. Add a new Button to the top of the sidebar "Matches" that takes the user to a dedicated page `/matches`that renders the match list. 

Please use the `Crud.vue`file as a template.

## 5. MatchListWidget UI

*   **Purpose:** View a list of all matches, filter them, and access individual matches.
*   **Location:** At the Sidebar
*   **Layout & Elements (inspired by `Crud.vue`):**
    *   **Title:** "All Matches".
    *   **Action Button (Top):** `[ + Create New Match ]`
        *   *Action:* Shows a Model with the current the daily `MatchConfiguration` and the `PlayerConfiguration`. 
    *   **Filtering & Search Bar (Above the list):**
        *   **Search Input:** `[ Search by Team Name or Match ID... ]`
        *   **Status Filter:** Dropdown or segmented buttons: `[ All ] [ In Progress ] [ Completed ] [ Aborted ]`
    *   **Match List (Table or Card List):**
        *   **Columns (for table view):**
            *   Match ID (clickable, leads to `MatchDetailsWidget`)
            *   Team 1 (Players)
            *   Team 2 (Players)
            *   Score (e.g., Sets: 2-1, Current Set Goals: 5-3 if in progress)
            *   Status (In Progress, Completed, Aborted)
            *   Date/Time Started
            *   Actions (e.g., "View Details", "Log Match" if In Progress)
        *   **Card View (Alternative):** Each match is a card with summarized info and action buttons. Better for mobile/tablet.
*   **Behavior:**
    *   On load, fetches matches (`GET /matches`).
    *   Search and filter controls update query parameters for `GET /matches`.
    *   Clicking "Log Match" for an "In Progress" match navigates to `MatchLoggingWidget` for that match.
    *   Clicking "View Details" (or the Match ID) navigates to `MatchDetailsWidget`.

---

## 6. MatchDetailsWidget UI

*   **Purpose:** Provide a comprehensive, read-only view of a completed or in-progress match.
*   **Location:** Accessed by clicking on a match in the `MatchListWidget`.
*   **Layout & Elements (Similar to `MatchLoggingWidget` but read-only and more detailed):**
    *   **Match Summary Header:**
        *   Teams, Final Score (Sets), Winner (if applicable), Total Match Duration, Status.
    *   **Tabs or Accordion for Sets:**
        *   Each tab/section is labeled "Set 1", "Set 2", etc.
        *   **Inside each Set section:**
            *   Set Winner (if applicable)
            *   Set Score (Goals)
            *   Set Duration
            *   **Timeline of Goals:**
                *   List each goal: `[Timestamp] - Player X (Team Y) scored. (Goal 7-5)`
                *   Indicate if a goal was voided.
            *   **Timeline of Timeouts:**
                *   List each timeout: `[Timestamp] - Timeout called by Team X.`
                *   Indicate if a timeout was voided.
    *   **Action Buttons (Top or Bottom):**
        *   `[ Export Match Data (JSON) ]`
        *   `[ Export Match Data (CSV) ]`
        *   `[ < Back to Match List ]`
*   **Behavior:**
    *   On load, fetches all necessary data:
        *   `GET /matches/:id`
        *   `GET /matches/:id/sets`
        *   For each set: `GET /matches/:matchId/sets/:setNumber/goals` and `GET /matches/:matchId/sets/:setNumber/timeouts`.
    *   Export buttons will compile the fetched data into the respective formats and trigger a download.


