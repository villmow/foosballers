<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import SetLoggingWidget from './SetLoggingWidget.vue';
import SetResultsSummary from './SetResultsSummary.vue';

const props = defineProps({
  matchId: {
    type: String,
    required: true,
  },
});

// Match state
const match = ref(null);
const currentSet = ref(null);
const matchTimer = ref(0);
const timerInterval = ref(null);

// Team data
const teams = computed(() => {
  if (!match.value) return [];
  return [
    {
      name: match.value.teamAName || null,
      color: match.value.teamAColor || '#65bc7b',
      players: match.value.teamAPlayers || [],
      setsWon: match.value.teamASetsWon || 0,
    },
    {
      name: match.value.teamBName || '', 
      color: match.value.teamBColor || '#000000',
      players: match.value.teamBPlayers || [],
      setsWon: match.value.teamBSetsWon || 0,
    }
  ];
});

// Ref for SetResultsSummary component
const setResultsSummaryRef = ref(null);

// Timer functions
function startMatchTimer() {
  if (timerInterval.value) return;
  
  timerInterval.value = setInterval(() => {
    matchTimer.value++;
  }, 1000);
}

function stopMatchTimer() {
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
    timerInterval.value = null;
  }
}

const formattedMatchTime = computed(() => {
  const hours = Math.floor(matchTimer.value / 3600);
  const minutes = Math.floor((matchTimer.value % 3600) / 60);
  const seconds = matchTimer.value % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
});

// Match actions
async function abortMatch() {
  if (!confirm('Are you sure you want to abort this match? This action cannot be undone.')) {
    return;
  }
  
  try {
    // TODO: Call API to abort match
    console.log('Aborting match...');
    // Navigate back to dashboard
  } catch (error) {
    console.error('Error aborting match:', error);
  }
}

async function startMatch() {
  try {
    // Start the match
    const startResponse = await fetch(`/api/matches/${props.matchId}/start`, {
      method: 'POST',
      credentials: 'include',
    });
    
    if (startResponse.ok) {
      console.log('Match started successfully');
      // Refresh match details and current set
      await fetchMatchDetails();
      await fetchCurrentSet();
      // Start the timer if match is now in progress
      if (match.value?.status === 'inProgress') {
        startMatchTimer();
      }
    } else {
      console.error('Failed to start match:', startResponse.statusText);
    }
  } catch (error) {
    console.error('Error starting match:', error);
  }
}

async function endMatch() {
  try {
    // TODO: Call API to end match
    console.log('Ending match...');
    // Show match summary and navigate to match details
  } catch (error) {
    console.error('Error ending match:', error);
  }
}

async function startNextSet() {
  try {
    const response = await fetch(`/api/matches/${props.matchId}/sets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('New set created:', result.set);
      
      // Update the current set data
      if (result.set) {
        const timeoutsPerSet = match.value?.timeoutsPerSet || 2; // Default to 2 if not set
        
        currentSet.value = {
          id: result.set._id,
          setNumber: result.set.setNumber,
          status: result.set.status,
          teamAScore: result.set.scores[0],
          teamBScore: result.set.scores[1],
          teamATimeouts: timeoutsPerSet - result.set.timeoutsUsed[0],
          teamBTimeouts: timeoutsPerSet - result.set.timeoutsUsed[1],
        };
      }
      
      // Refresh match details to get updated set count
      await fetchMatchDetails();
    } else {
      console.error('Failed to start next set:', response.statusText);
    }
  } catch (error) {
    console.error('Error starting next set:', error);
  }
}

// Data fetching
async function fetchMatchDetails() {
  try {
    const response = await fetch(`/api/matches/${props.matchId}`, {
      credentials: 'include',
    });
    
    if (response.ok) {
      const matchData = await response.json();
      
      // Convert backend format to component format
      match.value = {
        id: matchData._id,
        teamAName: matchData.teams?.[0]?.name || null,
        teamBName: matchData.teams?.[1]?.name || null,
        teamAColor: matchData.teams?.[0]?.color || '#65bc7b',
        teamBColor: matchData.teams?.[1]?.color || '#000000',
        teamAPlayers: matchData.teams?.[0]?.players?.map(p => p.name) || [],
        teamBPlayers: matchData.teams?.[1]?.players?.map(p => p.name) || [],
        teamASetsWon: matchData.teams?.[0]?.setsWon || 0,
        teamBSetsWon: matchData.teams?.[1]?.setsWon || 0,
        status: matchData.status,
        startTime: new Date(matchData.startTime || Date.now()),
        currentSetNumber: matchData.currentSetNumber || 1,
        setsToWin: matchData.numSetsToWin || 2,
        drawAllowed: matchData.draw || false,
        timeoutsPerSet: matchData.timeoutsPerSet || 2,
        numGoalsToWin: matchData.numGoalsToWin || 5,
        twoAhead: matchData.twoAhead || false,
      };
    } else {
      console.error('Failed to fetch match details:', response.statusText);
    }
  } catch (error) {
    console.error('Error fetching match details:', error);
  }
}

async function fetchCurrentSet() {
  try {
    const response = await fetch(`/api/matches/${props.matchId}/sets/current`, {
      credentials: 'include',
    });
    console.log('Fetching current set for match:', props.matchId);
    if (response.ok) {
      const set = await response.json();
      
      // Get match details to determine timeouts per set
      const timeoutsPerSet = match.value?.timeoutsPerSet || 2; // Default to 2 if not set
      
      // Convert backend format to component format
      currentSet.value = {
        id: set._id,
        setNumber: set.setNumber,
        status: set.status,
        teamAScore: set.scores[0],
        teamBScore: set.scores[1],
        teamATimeouts: timeoutsPerSet - set.timeoutsUsed[0], // Remaining timeouts
        teamBTimeouts: timeoutsPerSet - set.timeoutsUsed[1], // Remaining timeouts
      };
    } else if (response.status === 404) {
      // No current set found - this might happen for new matches
      console.log('No current set found, match may need to be started');
      currentSet.value = null;
    } else {
      console.error('Failed to fetch current set:', response.statusText);
    }
  } catch (error) {
    console.error('Error fetching current set:', error);
  }
}

// Computed properties for match state
const canEndMatch = computed(() => {
  if (!match.value) return false;
  
  const setsToWin = match.value.setsToWin || 2;
  const teamAWins = teams.value[0]?.setsWon || 0;
  const teamBWins = teams.value[1]?.setsWon || 0;
  
  // Check if either team has won enough sets
  if (teamAWins >= setsToWin || teamBWins >= setsToWin) {
    return true;
  }
  
  // Check if draw is allowed and conditions are met
  if (match.value.drawAllowed && teamAWins === teamBWins && teamAWins + teamBWins >= setsToWin * 2 - 1) {
    return true;
  }
  
  return false;
});

const canStartNextSet = computed(() => {
  return currentSet.value?.status === 'completed' && !canEndMatch.value;
});

const canStartMatch = computed(() => {
  return match.value?.status === 'notStarted' || match.value?.status === 'pending';
});

const isLastSet = computed(() => {
  if (!match.value || !currentSet.value) return false;
  
  const setsToWin = match.value.setsToWin || 2;
  const teamAWins = teams.value[0]?.setsWon || 0;
  const teamBWins = teams.value[1]?.setsWon || 0;
  
  // Check if completing the current set would end the match
  // This happens when one team is one win away from victory
  return (teamAWins >= setsToWin - 1) || (teamBWins >= setsToWin - 1);
});

// Lifecycle
onMounted(async () => {
  await fetchMatchDetails();
  
  if (match.value?.status === 'inProgress') {
    startMatchTimer();
  }
});

onUnmounted(() => {
  stopMatchTimer();
});

// Event handlers
function onSetCompleted() {
  // Refresh match and set data
  fetchMatchDetails();
  fetchCurrentSet();
  // Refresh the previous sets summary
  if (setResultsSummaryRef.value) {
    setResultsSummaryRef.value.refresh();
  }
}
</script>

<template>
  <div v-if="match" class="card flex flex-col gap-6 w-full max-w-4xl mx-auto">
    <!-- Header Section -->
    <div class="bg-gray-50 p-4 rounded-lg">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold">Match Logging</h2>
        <div class="text-lg font-mono">{{ formattedMatchTime }}</div>
      </div>

      <!-- Overall Match Score -->
      <div class="flex justify-between items-center mb-4">
        <!-- Team 1 Info -->
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-4 h-4 rounded" :style="{ backgroundColor: teams[0]?.color }"></div>
          <span v-if="teams[0]?.name" class="font-semibold truncate">
            <span class="text-2xl font-bold text-gray-800">{{ teams[0].name }}</span>
            <span v-if="teams[0]?.players && teams[0].players.length" class="text-xs text-gray-500 ml-2">
              {{ teams[0].players.join(' / ') }}
            </span>
          </span>
          <span v-else-if="teams[0]?.players && teams[0].players.length" class="text-2xl font-bold text-gray-800 truncate">
            {{ teams[0].players.join(' / ') }}
          </span>
        </div>

        <!-- Team 1 Score -->
        <div class="flex flex-row items-center mx-6">
          <div class="text-3xl font-bold">{{ teams[0]?.setsWon }}</div>
          <div class="mx-1 text-sm font-light ">/ {{ match.setsToWin }}</div>
        </div>

        <!-- VS -->
        <div class="text-xl font-semibold mx-2">VS</div>

        <!-- Team 2 Score -->
        <div class="flex flex-row items-center mx-6">
          <div class="text-3xl font-bold">{{ teams[1]?.setsWon }}</div>
          <div class="mx-1 text-sm font-light">/ {{ match.setsToWin }}</div>
        </div>

        <!-- Team 2 Info -->
        <div class="flex items-center gap-2 min-w-0 justify-end">
          <span v-if="teams[1]?.name" class="font-semibold truncate">
            <span class="text-2xl font-bold text-gray-800">{{ teams[1].name }}</span>
            <span v-if="teams[1]?.players && teams[1].players.length" class="text-xs text-gray-500 ml-2">
              {{ teams[1].players.join(' / ') }}
            </span>
          </span>
          <span v-else-if="teams[1]?.players && teams[1].players.length" class="text-2xl font-bold text-gray-800 truncate">
            {{ teams[1].players.join(' / ') }}
          </span>
          <div class="w-4 h-4 rounded" :style="{ backgroundColor: teams[1]?.color }"></div>
        </div>
      </div>
      
      <!-- Match Info -->
      <div class="flex justify-between text-sm text-gray-600">
        <div>Set {{ match.currentSetNumber || 1 }}</div>
        <div>Status: {{ match.status }}</div>
      </div>
    </div>

    <!-- Current Set Area -->
    <div v-if="currentSet" class="border-t pt-6">
      <!-- Previous Sets Summary -->
      <SetResultsSummary 
        ref="setResultsSummaryRef"
        :match-id="matchId"
        :teams="teams"
      />
      
      <!-- Current Set Widget -->
      <SetLoggingWidget 
        :match-id="matchId"
        :set-data="currentSet"
        :teams="teams"
        :is-last-set="isLastSet"
        @set-completed="onSetCompleted"
      />
    </div>

    <!-- Match Actions -->
    <div class="flex gap-4 justify-center border-t pt-6">
      <Button 
        v-if="canStartMatch"
        label="Start Match" 
        icon="pi pi-play" 
        severity="primary" 
        @click="startMatch"
      />
      
      <Button 
        label="Abort Match" 
        icon="pi pi-times" 
        severity="danger" 
        @click="abortMatch"
        outlined
      />
      
  
      <Button 
        v-if="canEndMatch"
        label="End Match" 
        icon="pi pi-flag" 
        severity="success" 
        @click="endMatch"
      />
      
      <Button 
        v-if="canStartNextSet"
        label="Start Next Set" 
        icon="pi pi-play" 
        severity="primary" 
        @click="startNextSet"
      />
    </div>
  </div>
  
  <div v-else class="flex justify-center items-center h-64">
    <ProgressSpinner />
  </div>
</template>

<style scoped>
.card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 2rem;
}
</style>
