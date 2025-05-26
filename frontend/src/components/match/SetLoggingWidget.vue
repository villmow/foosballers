<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';

const props = defineProps({
  matchId: {
    type: String,
    required: true,
  },
  setData: {
    type: Object,
    required: true,
  },
  teams: {
    type: Array,
    required: true,
  },
});

const emit = defineEmits(['set-completed']);

// Set timer state
const setTimer = ref(0);
const timerInterval = ref(null);
const isTimerRunning = ref(false);

// Last goal IDs for undo functionality
const lastGoalIds = ref({
  teamA: null,
  teamB: null,
});

// Timer functions
function startSetTimer() {
  if (timerInterval.value) return;
  
  isTimerRunning.value = true;
  timerInterval.value = setInterval(() => {
    setTimer.value++;
  }, 1000);
}

function pauseSetTimer() {
  if (timerInterval.value) {
    clearInterval(timerInterval.value);
    timerInterval.value = null;
  }
  isTimerRunning.value = false;
}

const formattedSetTime = computed(() => {
  const minutes = Math.floor(setTimer.value / 60);
  const seconds = setTimer.value % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
});

// Score management
async function addGoal(teamIndex) {
  try {
    const response = await fetch('/api/goals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        matchId: props.matchId,
        setId: props.setData.id,
        teamIndex: teamIndex,
        timestamp: new Date().toISOString(),
      }),
    });
    
    if (response.ok) {
      const result = await response.json();
      const goal = result.goal;
      
      // Store the goal ID for potential undo
      if (teamIndex === 0) {
        lastGoalIds.value.teamA = goal._id;
      } else {
        lastGoalIds.value.teamB = goal._id;
      }
      
      // Update local state with progression data
      if (result.set) {
        // Update set data from server response
        Object.assign(props.setData, result.set);
        // Map scores array to teamAScore/teamBScore for UI reactivity
        if (Array.isArray(result.set.scores)) {
          props.setData.teamAScore = result.set.scores[0];
          props.setData.teamBScore = result.set.scores[1];
        }
        // Map timeoutsUsed if needed
        if (Array.isArray(result.set.timeoutsUsed)) {
          props.setData.teamATimeouts = (props.setData.timeoutsPerSet || 2) - result.set.timeoutsUsed[0];
          props.setData.teamBTimeouts = (props.setData.timeoutsPerSet || 2) - result.set.timeoutsUsed[1];
        }
      }
      
      // Check if set is won
      checkSetComplete();
    }
  } catch (error) {
    console.error('Error adding goal:', error);
  }
}

async function undoGoal(teamIndex) {
  const goalId = teamIndex === 0 ? lastGoalIds.value.teamA : lastGoalIds.value.teamB;
  
  if (!goalId) {
    console.warn('No goal to undo for this team');
    return;
  }
  
  try {
    const response = await fetch(`/api/goals/${goalId}/void`, {
      method: 'POST',
      credentials: 'include',
    });
    
    if (response.ok) {
      const result = await response.json();
      
      // Clear the last goal ID
      if (teamIndex === 0) {
        lastGoalIds.value.teamA = null;
      } else {
        lastGoalIds.value.teamB = null;
      }
      
      // Update local state with progression data
      if (result.set) {
        Object.assign(props.setData, result.set);
        // Map scores array to teamAScore/teamBScore for UI reactivity
        if (Array.isArray(result.set.scores)) {
          props.setData.teamAScore = result.set.scores[0];
          props.setData.teamBScore = result.set.scores[1];
        }
        // Map timeoutsUsed if needed
        if (Array.isArray(result.set.timeoutsUsed)) {
          props.setData.teamATimeouts = (props.setData.timeoutsPerSet || 2) - result.set.timeoutsUsed[0];
          props.setData.teamBTimeouts = (props.setData.timeoutsPerSet || 2) - result.set.timeoutsUsed[1];
        }
      }
    }
  } catch (error) {
    console.error('Error undoing goal:', error);
  }
}

// Timeout management
async function callTimeout(teamIndex) {
  const timeoutsRemaining = teamIndex === 0 ? props.setData.teamATimeouts : props.setData.teamBTimeouts;
  
  if (timeoutsRemaining <= 0) {
    console.warn('No timeouts remaining for this team');
    return;
  }
  
  try {
    const response = await fetch('/api/timeouts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        matchId: props.matchId,
        setId: props.setData.id,
        teamIndex: teamIndex,
        timestamp: new Date().toISOString(),
      }),
    });
    
    if (response.ok) {
      const result = await response.json();
      
      // Update local state with progression data
      if (result.set) {
        // Update set data from server response
        Object.assign(props.setData, result.set);
      }
    }
  } catch (error) {
    console.error('Error calling timeout:', error);
  }
}

// Set completion logic
function checkSetComplete() {
  // TODO: Implement proper set completion logic based on match configuration
  // For now, simple logic: first to 5 goals wins (considering two-ahead rule if applicable)
  const scoreA = props.setData.teamAScore;
  const scoreB = props.setData.teamBScore;
  const minGoals = 5; // This should come from match configuration
  
  // Basic winning condition
  if (scoreA >= minGoals && scoreA - scoreB >= 2) {
    showCompleteSetButton.value = true;
  } else if (scoreB >= minGoals && scoreB - scoreA >= 2) {
    showCompleteSetButton.value = true;
  }
}

const showCompleteSetButton = ref(false);

async function completeSet() {
  try {
    const response = await fetch(`/api/sets/${props.setData.id}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        winner: props.setData.teamAScore > props.setData.teamBScore ? 0 : 1,
      }),
    });
    
    if (response.ok) {
      const result = await response.json();
      
      // Update local state with progression data
      if (result.set) {
        Object.assign(props.setData, result.set);
      }
      
      pauseSetTimer();
      emit('set-completed', result);
    }
  } catch (error) {
    console.error('Error completing set:', error);
  }
}

// Lifecycle
onMounted(() => {
  if (props.setData.status === 'inProgress') {
    // Auto-start timer if set is already in progress
    startSetTimer();
  }
});

onUnmounted(() => {
  pauseSetTimer();
});
</script>

<template>
  <div class="border rounded-lg p-6 bg-gray-50">
    <!-- Set Information -->
    <div class="flex justify-between items-center mb-6">
      <h3 class="text-xl font-semibold">Set {{ setData.setNumber }}</h3>
      <div class="flex items-center gap-4">
        <div class="text-2xl font-mono">{{ formattedSetTime }}</div>
        <Button 
          v-if="!isTimerRunning"
          label="Start Set" 
          icon="pi pi-play" 
          @click="startSetTimer"
          size="small"
        />
        <Button 
          v-else
          label="Pause Timer" 
          icon="pi pi-pause" 
          @click="pauseSetTimer"
          size="small"
          severity="secondary"
        />
      </div>
    </div>

    <!-- Team Score Areas -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <!-- Team A Area -->
      <div 
        class="border-2 rounded-lg p-6 text-center"
        :style="{ borderColor: teams[0]?.color }"
      >
        <div class="flex items-center justify-center gap-2 mb-4">
          <div 
            class="w-4 h-4 rounded"
            :style="{ backgroundColor: teams[0]?.color }"
          ></div>
          <h4 class="text-lg font-semibold">{{ teams[0]?.name }}</h4>
        </div>
        
        <!-- Score Display -->
        <div class="text-6xl font-bold mb-4">{{ setData.teamAScore }}</div>
        
        <!-- Goal Buttons -->
        <div class="flex gap-2 justify-center mb-4">
          <Button 
            label="+ Goal" 
            icon="pi pi-plus" 
            @click="addGoal(0)"
            severity="success"
            size="large"
            class="flex-1"
          />
          <Button 
            label="- Goal (Undo)" 
            icon="pi pi-minus" 
            @click="undoGoal(0)"
            severity="warning"
            outlined
            size="large"
            :disabled="!lastGoalIds.teamA"
          />
        </div>
        
        <!-- Timeout Button -->
        <Button 
          :label="`Call Timeout (${setData.teamATimeouts} remaining)`"
          icon="pi pi-clock" 
          @click="callTimeout(0)"
          severity="info"
          outlined
          :disabled="setData.teamATimeouts <= 0"
          class="w-full"
        />
      </div>

      <!-- Team B Area -->
      <div 
        class="border-2 rounded-lg p-6 text-center"
        :style="{ borderColor: teams[1]?.color }"
      >
        <div class="flex items-center justify-center gap-2 mb-4">
          <div 
            class="w-4 h-4 rounded"
            :style="{ backgroundColor: teams[1]?.color }"
          ></div>
          <h4 class="text-lg font-semibold">{{ teams[1]?.name }}</h4>
        </div>
        
        <!-- Score Display -->
        <div class="text-6xl font-bold mb-4">{{ setData.teamBScore }}</div>
        
        <!-- Goal Buttons -->
        <div class="flex gap-2 justify-center mb-4">
          <Button 
            label="+ Goal" 
            icon="pi pi-plus" 
            @click="addGoal(1)"
            severity="success"
            size="large"
            class="flex-1"
          />
          <Button 
            label="- Goal (Undo)" 
            icon="pi pi-minus" 
            @click="undoGoal(1)"
            severity="warning"
            outlined
            size="large"
            :disabled="!lastGoalIds.teamB"
          />
        </div>
        
        <!-- Timeout Button -->
        <Button 
          :label="`Call Timeout (${setData.teamBTimeouts} remaining)`"
          icon="pi pi-clock" 
          @click="callTimeout(1)"
          severity="info"
          outlined
          :disabled="setData.teamBTimeouts <= 0"
          class="w-full"
        />
      </div>
    </div>

    <!-- Set Actions -->
    <div v-if="showCompleteSetButton" class="text-center">
      <Button 
        label="Complete Set" 
        icon="pi pi-check" 
        @click="completeSet"
        severity="primary"
        size="large"
      />
    </div>
  </div>
</template>

<style scoped>
.border-2 {
  border-width: 2px;
}
</style>
