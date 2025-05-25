<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import SetLoggingWidget from './SetLoggingWidget.vue';

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
      name: match.value.teamAName || 'Team A',
      color: match.value.teamAColor || '#65bc7b',
      players: match.value.teamAPlayers || [],
      setsWon: match.value.teamASetsWon || 0,
    },
    {
      name: match.value.teamBName || 'Team B', 
      color: match.value.teamBColor || '#000000',
      players: match.value.teamBPlayers || [],
      setsWon: match.value.teamBSetsWon || 0,
    }
  ];
});

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
    // TODO: Call API to create and start next set
    console.log('Starting next set...');
    await fetchCurrentSet();
  } catch (error) {
    console.error('Error starting next set:', error);
  }
}

// Data fetching
async function fetchMatchDetails() {
  try {
    // TODO: Implement API call to fetch match details
    // For now, using mock data
    match.value = {
      id: props.matchId,
      teamAName: 'Team A',
      teamBName: 'Team B',
      teamAColor: '#65bc7b',
      teamBColor: '#000000',
      teamAPlayers: ['Player 1', 'Player 2'],
      teamBPlayers: ['Player 3', 'Player 4'],
      teamASetsWon: 0,
      teamBSetsWon: 0,
      status: 'inProgress',
      startTime: new Date(),
      currentSetNumber: 1,
    };
  } catch (error) {
    console.error('Error fetching match details:', error);
  }
}

async function fetchCurrentSet() {
  try {
    // TODO: Implement API call to fetch current set details
    // For now, using mock data
    currentSet.value = {
      id: '1',
      setNumber: 1,
      status: 'inProgress',
      teamAScore: 0,
      teamBScore: 0,
      teamATimeouts: 2,
      teamBTimeouts: 2,
    };
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

// Lifecycle
onMounted(async () => {
  await fetchMatchDetails();
  await fetchCurrentSet();
  
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
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <div 
              class="w-4 h-4 rounded"
              :style="{ backgroundColor: teams[0]?.color }"
            ></div>
            <span class="font-semibold">{{ teams[0]?.name }}</span>
          </div>
          <div class="text-3xl font-bold">{{ teams[0]?.setsWon }}</div>
        </div>
        
        <div class="text-xl font-semibold">VS</div>
        
        <div class="flex items-center gap-4">
          <div class="text-3xl font-bold">{{ teams[1]?.setsWon }}</div>
          <div class="flex items-center gap-2">
            <span class="font-semibold">{{ teams[1]?.name }}</span>
            <div 
              class="w-4 h-4 rounded"
              :style="{ backgroundColor: teams[1]?.color }"
            ></div>
          </div>
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
      <SetLoggingWidget 
        :match-id="matchId"
        :set-data="currentSet"
        :teams="teams"
        @set-completed="onSetCompleted"
      />
    </div>

    <!-- Match Actions -->
    <div class="flex gap-4 justify-center border-t pt-6">
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
