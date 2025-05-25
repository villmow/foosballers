# Foosball Streaming Tool

## Creation

### Functional Requirements

Used this prompt to create the functional requirements:
```markdown
I would like to create concise functional requirements for the following application:

The application is called Foosballer and is a comprehensive system for managing table football (foosball) matches. Using a web-based UI the application handles match creation, scoring, timeout management, and maintains complete statistics throughout match progression.

My Requirements:
- The app should have a unified, responsive interface where logged in commentators can track statistics and manage the match.
  - They should be able to log in 
  - Create a new match
  - Add players (1 vs 1 or 2 vs 2)
    - assign them to teams and colors of the figures
  - Start the match
     - the match can be played in various modes:
        - 1 set to 7 goals
        - 2 winning sets to 5 goals each
        - 5 winning sets to 5 goals each
        - usually in the last set a team needs 2 goals mroe until maximum of 8 goals, but this can be deactivated on a per match basis
      - 1 or 2 timeouts per set (2 default)
  - Start a new set
    - Track each goal scored in the current set
    - Track timeouts within the set
- The current match may be fetched from an external API
  - The app should be able to fetch the current match from an external API, which provides the teams.
- The app should have a dedicated site for viewing a scoreboard, where anyone can see the current score, timeouts, and other relevant statistics.
  - This page should be accessible via a unique URL
  - The scoreboard should update in real-time
  - There should be different views which can be activated by the commentator:
    - Default view: Name of the teams, current score of each time in the current set, timeouts left/used, sets won
    - Detailed view: Shows the results of all sets played so far, including the score of each set, timeouts used, and any other relevant statistics.
    - Banner that can be used to show a custom message between sets
    - Others may be added later
- The games should be stored in a database, and the commentator should be able to view and edit all games played in the past.
  - The commentator should be able to filter games by date, players, and other relevant criteria.
  - The commentator should be able to view detailed statistics for each game, including goals scored, timeouts used, and any other relevant information.
- The app should have a user management system, allowing commentators to create accounts and log in securely.

Here are some additional requirements:

## Core Match Functionality

**Match Management**
- Create new matches with complete configuration (teams, format settings, metadata)
- Retrieve complete match details including all sets, scores, and statistics
- Fetch the currently running match in the system
- End matches, automatically updating status and finalizing any running sets
- Delete matches and all associated data

**Match Format Configuration**
- Support custom match formats with configurable parameters:
  - Number of sets required to win a match
  - Points (goals) required to win a set
  - Timeout allowances and limits per team

## Set Management

**Set Lifecycle Control**
- Track set progression with status states (not_started, running, finished)
- End current sets and automatically create subsequent sets
- Record precise start and end timestamps for each set
- Maintain team color assignments throughout sets

**Team Color Management**
- Assign team colors for each set
- Persist color assignments across sets
- Support color changes between sets

## Scoring System

**Goal Tracking**
- Record goals with precise timestamps
- Associate goals with specific teams
- Optionally record which row scored the goal (goalie, 2-bar, 5-bar, 3-bar)
- Delete incorrectly recorded goals (error correction)

**Score Calculation**
- Calculate team statistics within sets (goals, timeouts used)
- Generate comprehensive match summaries with:
  - Sets won by each team
  - Total goals scored by each team
  - Timeouts used by each team

## Timeout Management

**Timeout Control**
- Record timeouts with timestamps and team attribution
- Enforce timeout limits based on match format configuration
- Provide error correction by allowing deletion of incorrectly recorded timeouts

Output as markdown code.
```

Result of gpt o4-mini (prompted with perplexity AI). I favor this over the results of claude 3.7 sonnet thinking, which is below.
```markdown
## User Management
- Secure commentator login (username/password, session management)
- Account creation with role assignment
- Password recovery and change functionality

## Match Configuration
- Create new match with:
  - Player setup: 1v1 or 2v2, team assignment, figure colors
  - Match format selection:
    | Format               | Sets to Win | Goals per Set | Last‐Set 2-Goal Rule |
    |----------------------|-------------|---------------|----------------------|
    | Single set           | 1           | 7             | Optional             |
    | Best of 3            | 2           | 5             | Optional             |
    | Best of 9            | 5           | 5             | Optional             |
  - Timeout allowance per set (1 or 2; default: 2)
- Import match from external API (fetch teams and metadata)

## Match & Set Lifecycle
- Start match → initialize first set
- Start new set on demand or when previous set ends
- End match when winning condition met
- Record timestamps for match/set start and end
- Delete or abort match and all related data

## Scoring & Timeouts
- Record goal events:
  - Timestamped, team attribution, optional row (goalie/2-bar/5-bar/3-bar)
  - Undo/delete incorrect entries
- Record timeout events:
  - Timestamped, team attribution
  - Enforce per-set limit, allow undo/delete

## Real-Time Scoreboard
- Publicly accessible via unique URL
- Live updates via WebSocket or polling
- Responsive design 
- Switchable views by commentator:
  - **Default view**: team names, current set score, timeouts left, sets won
    - The commentator can position the view on the visible screen
  - **Detailed view**: all sets’ scores, timeouts used, additional stats
  - **Banner mode**: custom messages between sets
  - **Custom views**: to be added later

## Statistics & History
- Persist all matches, sets, goals, timeouts in database
- Filter and search past matches by date, players, teams, outcome
- View and edit historical match details and statistics
- Generate match summary reports (total goals, sets won, timeouts)

## External Integration
- Configure external API endpoints
- Fetch and synchronize current match data (teams, players)
- Handle API errors and retries

## Tech Stack
- Frontend: Vue.js, Vite, Volt (PrimeVue) Components, Tailwind CSS 4
- Backend: Node.js, Express, MongoDB
- Typescript for type safety
```

claude 3.7 sonnet thinking
```markdown
# Foosballer - Functional Requirements

## User Authentication
- Allow commentators to create accounts and log in securely
- Restrict match management features to authenticated users

## Match Setup
- Create new matches through a responsive web interface
- Add players to matches (1vs1 or 2vs2)
- Assign players to teams and configure team colors
- Configure match formats with various modes:
  - 1 set to 7 goals
  - 2 winning sets to 5 goals each
  - 5 winning sets to 5 goals each
  - Optional two-goal advantage in final sets (maximum 8 goals)
- Configure timeout allowances (1 or 2 per set, default 2)
- Start the match and manage its progression

## Core Match Functionality

### Match Management
- Create new matches with complete configuration (teams, format settings, metadata)
- Retrieve complete match details including all sets, scores, and statistics
- Fetch the currently running match in the system
- End matches, automatically updating status and finalizing any running sets
- Delete matches and all associated data

### Match Format Configuration
- Support custom match formats with configurable parameters:
  - Number of sets required to win a match
  - Points (goals) required to win a set
  - Timeout allowances and limits per team

## Set Management

### Set Lifecycle Control
- Track set progression with status states (not_started, running, finished)
- End current sets and automatically create subsequent sets
- Record precise start and end timestamps for each set
- Maintain team color assignments throughout sets

### Team Color Management
- Assign team colors for each set
- Persist color assignments across sets
- Support color changes between sets

## Scoring System

### Goal Tracking
- Record goals with precise timestamps
- Associate goals with specific teams
- Optionally record which row scored the goal (goalie, 2-bar, 5-bar, 3-bar)
- Delete incorrectly recorded goals (error correction)

### Score Calculation
- Calculate team statistics within sets (goals, timeouts used)
- Generate comprehensive match summaries with:
  - Sets won by each team
  - Total goals scored by each team
  - Timeouts used by each team

## Timeout Management

### Timeout Control
- Record timeouts with timestamps and team attribution
- Enforce timeout limits based on match format configuration
- Provide error correction by allowing deletion of incorrectly recorded timeouts

## Scoreboard Features
- Provide scoreboard accessible via a unique URL
- Update the scoreboard in real-time as match data changes
- Support multiple configurable views:
  - Default view: Team names, current score, timeouts remaining, sets won
  - Detailed view: Results of all sets with comprehensive statistics
  - Banner view: Custom message display between sets
- Implement responsive design for various display sizes

## External API Integration
- Fetch match data from an external API when required
- Parse and integrate external match data

## Historical Data Management
- Store complete match data in a database
- Enable viewing and filtering historical matches by date, players, and other criteria
- Provide detailed statistics for historical matches
- Allow editing of historical match data for corrections
```

### PRD

The prompt:
```markdown
You are an expert technical product manager specializing in feature development and creating comprehensive product requirements documents (PRDs). Your task is to generate a detailed and well-structured PRD based on the following instructions:

<prd_instructions>
{{PRD_INSTRUCTIONS}}
</prd_instructions>

Follow these steps to create the PRD:

1. Begin with a brief overview explaining the project and the purpose of the document.

2. Use sentence case for all headings except for the title of the document, which should be in title case.

3. Organize your PRD into the following sections:
   a. Introduction
   b. Product Overview
   c. Goals and Objectives
   d. Target Audience
   e. Features and Requirements
   f. User Stories and Acceptance Criteria
   g. Technical Requirements / Stack
   h. Design and User Interface

4. For each section, provide detailed and relevant information based on the PRD instructions. Ensure that you:
   - Use clear and concise language
   - Provide specific details and metrics where required
   - Maintain consistency throughout the document
   - Address all points mentioned in each section

5. When creating user stories and acceptance criteria:
   - List ALL necessary user stories including primary, alternative, and edge-case scenarios
   - Assign a unique requirement ID (e.g., ST-101) to each user story for direct traceability
   - Include at least one user story specifically for secure access or authentication if the application requires user identification
   - Include at least one user story specifically for Database modelling if the application requires a database
   - Ensure no potential user interaction is omitted
   - Make sure each user story is testable

6. Format your PRD professionally:
   - Use consistent styles
   - Include numbered sections and subsections
   - Use bullet points and tables where appropriate to improve readability
   - Ensure proper spacing and alignment throughout the document

7. Review your PRD to ensure all aspects of the project are covered comprehensively and that there are no contradictions or ambiguities.

Present your final PRD within <PRD> tags. Begin with the title of the document in title case, followed by each section with its corresponding content. Use appropriate subheadings within each section as needed.

Remember to tailor the content to the specific project described in the PRD instructions, providing detailed and relevant information for each section based on the given context.
````
