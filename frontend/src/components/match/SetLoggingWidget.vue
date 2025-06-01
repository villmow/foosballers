<script setup>
import { GoalService } from '@/service/GoalService';
import { TimeoutService } from '@/service/TimeoutService';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

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
  isLastSet: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['set-completed', 'match-completed']);

// Set timer state
const setTimer = ref(0);
const timerInterval = ref(null);
const isTimerRunning = ref(false);

// Last goal IDs for undo functionality
const lastGoalIds = ref({
  teamA: null,
  teamB: null,
});

// Progression state from API responses
const progression = ref({
  setCompleted: false,
  matchCompleted: false,
  newSetCreated: false
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

function resetSetTimer() {
  pauseSetTimer();
  setTimer.value = 0;
  isTimerRunning.value = false;
}

// Watch for set changes and reset timer
watch(() => props.setData.id, (newSetId, oldSetId) => {
  if (newSetId && newSetId !== oldSetId) {
    resetSetTimer();
    // Clear last goal IDs when starting new set
    lastGoalIds.value = {
      teamA: null,
      teamB: null,
    };
    // Reset progression state for new set
    progression.value = {
      setCompleted: false,
      matchCompleted: false,
      newSetCreated: false
    };
  }
});

const formattedSetTime = computed(() => {
  const minutes = Math.floor(setTimer.value / 60);
  const seconds = setTimer.value % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
});

// Score management
async function addGoal(teamIndex) {
  try {
    const response = await GoalService.createGoal({
      matchId: props.matchId,
      setId: props.setData.id,
      teamIndex: teamIndex,
      timestamp: new Date().toISOString(),
    });
    
    if (response.success && response.data) {
      const result = response.data;
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

      // Update progression state if available
      if (result.progression) {
        progression.value = result.progression;
      }

      // Start timer if this is the first goal and timer is not running
      if (!isTimerRunning.value && setTimer.value === 0) {
        startSetTimer();
      }
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
    const response = await GoalService.voidGoal(goalId);
    
    if (response.success && response.data) {
      const result = response.data;
      
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
      
      // Update progression state if available
      if (result.progression) {
        progression.value = result.progression;
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
    const response = await TimeoutService.createTimeout({
      matchId: props.matchId,
      setId: props.setData.id,
      teamIndex: teamIndex,
      timestamp: new Date().toISOString(),
    });
    
    if (response.success && response.data) {
      const result = response.data;
      
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
      
      // Update progression state if available
      if (result.progression) {
        progression.value = result.progression;
      }
    }
  } catch (error) {
    console.error('Error calling timeout:', error);
  }
}

async function undoTimeout(teamIndex) {
  // Find the last timeout for the team from setData.timeouts (array of timeout IDs)
  const timeouts = Array.isArray(props.setData.timeouts) ? props.setData.timeouts : [];
  if (!timeouts.length) {
    console.warn('No timeout to undo for this team');
    return;
  }
  // Find the last timeout for this team (assuming timeouts are ordered, and we can get the last one for the team)
  // For simplicity, just use the last timeout in the array
  const lastTimeoutId = timeouts[timeouts.length - 1];
  if (!lastTimeoutId) {
    console.warn('No timeout to undo for this team');
    return;
  }
  try {
    const response = await TimeoutService.voidTimeout(lastTimeoutId);
    
    if (response.success && response.data) {
      const result = response.data;
      
      if (result.set) {
        Object.assign(props.setData, result.set);
        if (Array.isArray(result.set.scores)) {
          props.setData.teamAScore = result.set.scores[0];
          props.setData.teamBScore = result.set.scores[1];
        }
        if (Array.isArray(result.set.timeoutsUsed)) {
          props.setData.teamATimeouts = (props.setData.timeoutsPerSet || 2) - result.set.timeoutsUsed[0];
          props.setData.teamBTimeouts = (props.setData.timeoutsPerSet || 2) - result.set.timeoutsUsed[1];
        }
      }
      
      // Update progression state if available
      if (result.progression) {
        progression.value = result.progression;
      }
    }
  } catch (error) {
    console.error('Error undoing timeout:', error);
  }
}

// Show the button if progression indicates set is completed OR if current score meets winning conditions
const showCompleteSetButton = computed(() => {
  // First check if progression state indicates completion (from API responses)
  if (progression.value.setCompleted) {
    return true;
  }
  
  // Also check if current score meets winning conditions for manual completion
  if (!props.setData || props.setData.status !== 'inProgress') {
    return false;
  }
  
  // Get the score and match rules from props
  const teamAScore = props.setData.teamAScore || 0;
  const teamBScore = props.setData.teamBScore || 0;
  const maxScore = Math.max(teamAScore, teamBScore);
  const minScore = Math.min(teamAScore, teamBScore);
  
  // Get the match rules - we need to access these from the parent component's match data
  // For now, use default values if not available
  const numGoalsToWin = props.setData.numGoalsToWin || 5;
  const twoAhead = props.setData.twoAhead || false;
  const twoAheadUpUntil = props.setData.twoAheadUpUntil || 8;
  
  // Check if this is the deciding set (based on isLastSet prop)
  const isDecidingSet = props.isLastSet;
  
  // Only apply twoAhead rule in the deciding set and when score hasn't exceeded twoAheadUpUntil
  const shouldApplyTwoAhead = twoAhead && isDecidingSet && maxScore < twoAheadUpUntil;
  
  // Check if winning condition is met
  return maxScore >= numGoalsToWin && (!shouldApplyTwoAhead || maxScore - minScore >= 2);
});

const completeSetButtonLabel = computed(() => {
  return progression.value.matchCompleted ? 'End Match' : 'Complete Set';
});

const completeSetButtonIcon = computed(() => {
  return progression.value.matchCompleted ? 'pi pi-flag' : 'pi pi-check';
});

async function completeSetOrMatch() {
  try {
    // Stop the timer when set/match is completed
    pauseSetTimer();
    
    // Emit appropriate events based on progression state
    if (progression.value.matchCompleted) {
      emit('match-completed', { 
        match: props.matchId,
        progression: progression.value 
      });
    } else {
      emit('set-completed', { 
        match: props.matchId,
        set: props.setData,
        progression: progression.value 
      });
    }
  } catch (error) {
    console.error('Error completing set/match:', error);
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

const isActionHoveredA = ref(false);
const isActionHoveredB = ref(false);
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
      </div>
    </div>

    <!-- Team Score Areas -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <!-- Team A Area -->
      <button
        type="button"
        class="score-panel border-2 rounded-lg p-6 text-center w-full focus:outline-none transition"
        :class="{ 'score-panel-hover': !isActionHoveredA }"
        :style="{ borderColor: teams[0]?.color }"
        @click="addGoal(0)"
        @mouseleave="isActionHoveredA = false"
      >
        <div class="flex items-center justify-center gap-2 mb-4">
          <div class="w-4 h-4 rounded" :style="{ backgroundColor: teams[0]?.color }"></div>
          <div v-if="teams[0]?.name" class="text-lg font-semibold">
            <span class="text-2xl font-bold text-gray-800">{{ teams[0].name }}</span>
            <span v-if="teams[0]?.players && teams[0].players.length" class="text-md text-gray-500 ml-2">
              {{ teams[0].players.join(' / ') }}
            </span>
          </div>
          <div v-else-if="teams[0]?.players && teams[0].players.length" class="text-2xl font-bold text-gray-800">
            {{ teams[0].players.join(' / ') }}
          </div>
        </div>
        <div class="text-6xl font-bold mb-4">{{ setData.teamAScore }}</div>
        <div
          class="flex gap-2 justify-center z-10 relative mt-4"
          @mouseenter="isActionHoveredA = true"
          @mouseleave="isActionHoveredA = false"
        >
          <div class="flex flex-col w-full gap-2">
            <Button 
              :label="`Timeout (${setData.teamATimeouts})`"
              icon="pi pi-clock" 
              @click.stop="callTimeout(0)"
              severity="info"
              size="large"
              outlined
              :disabled="setData.teamATimeouts <= 0"
              class="w-full"
            />
            <div class="flex gap-2 w-full">
              <Button 
                label="Undo Goal" 
                icon="pi pi-minus" 
                @click.stop="undoGoal(0)"
                severity="warn"
                outlined
                size="small"
                :disabled="!lastGoalIds.teamA"
                class="flex-1"
              />
              <Button 
                label="Undo Timeout" 
                icon="pi pi-undo" 
                @click.stop="undoTimeout(0)"
                severity="warn"
                outlined
                size="small"
                :disabled="(props.setData.timeoutsUsed && props.setData.timeoutsUsed[0] === 0)"
                class="flex-1"
              />
            </div>
          </div>
        </div>
      </button>

      <!-- Team B Area -->
      <button
        type="button"
        class="score-panel border-2 rounded-lg p-6 text-center w-full focus:outline-none transition"
        :class="{ 'score-panel-hover': !isActionHoveredB }"
        :style="{ borderColor: teams[1]?.color }"
        @click="addGoal(1)"
        @mouseleave="isActionHoveredB = false"
      >
        <div class="flex items-center justify-center gap-2 mb-4">
          <div class="w-4 h-4 rounded" :style="{ backgroundColor: teams[1]?.color }"></div>
          <div v-if="teams[1]?.name" class="font-semibold text-2xl text-gray-800">
            <span class="">{{ teams[1].name }}</span>
            <span v-if="teams[1]?.players && teams[1].players.length" class="text-xs text-gray-500 ml-2">
              {{ teams[1].players.join(' / ') }}
            </span>
          </div>
          <div v-else-if="teams[1]?.players && teams[1].players.length" class="text-2xl font-bold text-gray-800">
            {{ teams[1].players.join(' / ') }}
          </div>
        </div>
        <div class="text-6xl font-bold mb-4">{{ setData.teamBScore }}</div>
        <div
          class="flex gap-2 justify-center z-10 relative mt-4"
          @mouseenter="isActionHoveredB = true"
          @mouseleave="isActionHoveredB = false"
        >
          <div class="flex flex-col w-full gap-2">
            <Button 
              :label="`Timeout (${setData.teamBTimeouts})`"
              icon="pi pi-clock" 
              @click.stop="callTimeout(1)"
              severity="info"
              outlined
              size="large"
              :disabled="setData.teamBTimeouts <= 0"
              class="w-full"
            />
            <div class="flex gap-2 w-full">
              <Button 
                label="Undo Goal" 
                icon="pi pi-minus" 
                @click.stop="undoGoal(1)"
                severity="warn"
                outlined
                size="small"
                :disabled="!lastGoalIds.teamB"
                class="flex-1"
              />
              <Button 
                label="Undo Timeout" 
                icon="pi pi-undo" 
                @click.stop="undoTimeout(1)"
                severity="warn"
                outlined
                size="small"
                :disabled="(props.setData.timeoutsUsed && props.setData.timeoutsUsed[1] === 0)"
                class="flex-1"
              />
            </div>
          </div>
        </div>
      </button>
    </div>

    <!-- Set Actions -->
    <div v-if="showCompleteSetButton" class="text-center">
      <Button 
        :label="completeSetButtonLabel" 
        :icon="completeSetButtonIcon" 
        @click="completeSetOrMatch"
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
.score-panel {
  background-color: white;
}
.score-panel-hover:hover,
.score-panel-hover:active {
  background-color: #f0fdf4; /* Tailwind green-50 */
}
</style>
