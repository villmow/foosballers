<script setup>
import { MatchService } from '@/service/MatchService';
import { computed, onMounted, ref } from 'vue';

const props = defineProps({
  matchId: {
    type: String,
    required: true,
  },
  teams: {
    type: Array,
    required: true,
  },
});

const completedSets = ref([]);

// Fetch completed sets for this match
async function fetchCompletedSets() {
  try {
    const response = await MatchService.getSets(props.matchId);
    
    if (response.success && response.data) {
      // Filter for completed sets only and map to display format
      completedSets.value = response.data
        .filter(set => set.status === 'completed')
        .map(set => ({
          setNumber: set.setNumber,
          teamAScore: set.scores[0],
          teamBScore: set.scores[1],
          timeoutsUsed: set.timeoutsUsed,
          duration: set.duration || calculateDuration(set.startTime, set.endTime),
          winner: set.winner !== undefined ? set.winner : (set.scores[0] > set.scores[1] ? 0 : 1),
          teamColors: set.teamColors || ['#65bc7b', '#000000'], // Default colors if not available
        }))
        .sort((a, b) => a.setNumber - b.setNumber);
    } else {
      console.error('Failed to fetch sets:', response.error || 'Unknown error');
    }
  } catch (error) {
    console.error('Error fetching completed sets:', error);
  }
}

function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return null;
  const start = new Date(startTime);
  const end = new Date(endTime);
  return Math.floor((end - start) / 1000); // Return duration in seconds
}

const hasCompletedSets = computed(() => {
  return completedSets.value.length > 0;
});

function formatDuration(seconds) {
  if (!seconds) return '--:--';
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

onMounted(() => {
  fetchCompletedSets();
});

// Expose refresh method to parent component
defineExpose({
  refresh: fetchCompletedSets
});
</script>

<template>
  <div v-if="hasCompletedSets" class="mb-6">
    <!-- <h3 class="text-lg font-semibold mb-4">Previous Sets</h3> -->
    <div class="space-y-3">
      <div 
        v-for="set in completedSets" 
        :key="set.setNumber"
        class="bg-white border rounded-lg p-4 shadow-sm"
      >
        <div class="flex flex-col gap-3">
          <!-- Set number and team info header -->
          <div class="flex justify-between items-center">
            <div class="font-medium text-gray-600">
              Set {{ set.setNumber }}
            </div>
            
            <!-- Duration and timeouts -->
            <div class="flex items-center gap-4 text-sm text-gray-500">
              <div class="flex items-center gap-1">
                <i class="pi pi-clock"></i>
                {{ formatDuration(set.duration) }}
              </div>
              <div class="flex items-center gap-1">
                <i class="pi pi-pause"></i>
                {{ set.timeoutsUsed[0] }} / {{ set.timeoutsUsed[1] }}
              </div>
            </div>
          </div>

          <!-- Teams with names, players, and scores -->
          <div class="flex justify-between items-center">
            <!-- Team A -->
            <div class="flex flex-col flex-1 min-w-0">
              <div v-if="teams[0]?.name" class="font-semibold text-gray-800 truncate">
                {{ teams[0].name }}
              </div>
              <div v-if="teams[0]?.players && teams[0].players.length" class="text-sm text-gray-500 truncate">
                {{ teams[0].players.join(' / ') }}
              </div>
            </div>

            <!-- Scores with colored boxes -->
            <div class="flex items-center gap-2 mx-6">
              <div class="w-4 h-4 rounded" :style="{ backgroundColor: set.teamColors[0] }"></div>
              <span class="text-2xl font-bold" :class="{ 'text-green-600': set.winner === 0 }">
                {{ set.teamAScore }}
              </span>
              <span class="text-gray-400 mx-2">-</span>
              <span class="text-2xl font-bold" :class="{ 'text-green-600': set.winner === 1 }">
                {{ set.teamBScore }}
              </span>
              <div class="w-4 h-4 rounded" :style="{ backgroundColor: set.teamColors[1] }"></div>
            </div>

            <!-- Team B -->
            <div class="flex flex-col flex-1 min-w-0 text-right">
              <div v-if="teams[1]?.name" class="font-semibold text-gray-800 truncate">
                {{ teams[1].name }}
              </div>
              <div v-if="teams[1]?.players && teams[1].players.length" class="text-sm text-gray-500 truncate">
                {{ teams[1].players.join(' / ') }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
