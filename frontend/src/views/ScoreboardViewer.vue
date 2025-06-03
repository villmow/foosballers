<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <ProgressSpinner />
        <p class="mt-4 text-gray-600 dark:text-gray-400">Loading scoreboard...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center min-h-screen">
      <div class="text-center max-w-md mx-auto p-6">
        <i class="pi pi-exclamation-triangle text-6xl text-red-500 mb-4"></i>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Scoreboard Not Available
        </h2>
        <p class="text-gray-600 dark:text-gray-400 mb-4">{{ error }}</p>
        <Button 
          label="Refresh" 
          icon="pi pi-refresh" 
          @click="loadScoreboardData"
          class="p-button-outlined"
        />
      </div>
    </div>

    <!-- Scoreboard Content -->
    <div v-else-if="scoreboardData">
      <!-- Banner View -->
      <div v-if="scoreboardData.session.currentView === 'banner'" class="flex items-center justify-center min-h-screen">
        <div class="text-center max-w-4xl mx-auto p-8">
          <div v-if="scoreboardData.session.bannerText" class="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white">
            {{ scoreboardData.session.bannerText }}
          </div>
          <div v-else class="text-2xl text-gray-500 dark:text-gray-400 italic">
            Scoreboard will be shown here soon
          </div>
        </div>
      </div>

      <!-- Overview View -->
      <div v-else-if="scoreboardData.session.currentView === 'overview'" class="container mx-auto p-6">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div class="text-center mb-6">
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {{ getMatchName() }}
            </h1>
            <Tag 
              :value="scoreboardData.match.status" 
              :severity="getStatusSeverity(scoreboardData.match.status)"
              class="text-lg"
            />
          </div>

          <div class="grid grid-cols-2 gap-8 mb-6">
            <!-- Team 1 -->
            <div class="text-center">
              <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {{ scoreboardData.match.teams[0]?.name || 'Team 1' }}
              </h2>
              <div class="text-6xl font-bold text-blue-600 dark:text-blue-400">
                {{ scoreboardData.match.teams[0]?.setsWon || 0 }}
              </div>
              <p class="text-gray-600 dark:text-gray-400">Sets Won</p>
            </div>

            <!-- VS -->
            <div class="flex items-center justify-center">
              <span class="text-4xl font-bold text-gray-400">VS</span>
            </div>

            <!-- Team 2 -->
            <div class="text-center">
              <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {{ scoreboardData.match.teams[1]?.name || 'Team 2' }}
              </h2>
              <div class="text-6xl font-bold text-red-600 dark:text-red-400">
                {{ scoreboardData.match.teams[1]?.setsWon || 0 }}
              </div>
              <p class="text-gray-600 dark:text-gray-400">Sets Won</p>
            </div>
          </div>

          <!-- Current Set Score -->
          <div v-if="scoreboardData.currentSet && scoreboardData.match.status === 'inProgress'" class="text-center bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Current Set</h3>
            <div class="flex justify-center items-center space-x-8">
              <div class="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {{ scoreboardData.currentSet.score[0] }}
              </div>
              <span class="text-2xl text-gray-400">-</span>
              <div class="text-3xl font-bold text-red-600 dark:text-red-400">
                {{ scoreboardData.currentSet.score[1] }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Detailed View -->
      <div v-else class="container mx-auto p-6">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <!-- Match Header -->
          <div class="text-center mb-6">
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {{ getMatchName() }}
            </h1>
            <div class="flex justify-center items-center space-x-4">
              <Tag 
                :value="scoreboardData.match.status" 
                :severity="getStatusSeverity(scoreboardData.match.status)"
              />
              <span class="text-gray-600 dark:text-gray-400">
                Best of {{ scoreboardData.match.numSetsToWin }} sets
              </span>
              <span class="text-gray-600 dark:text-gray-400">
                {{ scoreboardData.match.numGoalsToWin }} goals to win
              </span>
            </div>
          </div>

          <!-- Teams and Scores -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <!-- Team 1 -->
            <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div class="text-center">
                <h2 class="text-xl font-bold text-blue-800 dark:text-blue-200 mb-2">
                  {{ scoreboardData.match.teams[0]?.name || 'Team 1' }}
                </h2>
                <div class="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  {{ scoreboardData.match.teams[0]?.setsWon || 0 }}
                </div>
                <p class="text-blue-700 dark:text-blue-300 text-sm">Sets Won</p>
              </div>
              <div v-if="scoreboardData.match.teams[0]?.players?.length" class="mt-4">
                <h4 class="font-medium text-blue-800 dark:text-blue-200 mb-2">Players:</h4>
                <div class="space-y-1">
                  <div 
                    v-for="player in scoreboardData.match.teams[0].players" 
                    :key="player.name"
                    class="text-sm text-blue-700 dark:text-blue-300"
                  >
                    {{ player.name }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Team 2 -->
            <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <div class="text-center">
                <h2 class="text-xl font-bold text-red-800 dark:text-red-200 mb-2">
                  {{ scoreboardData.match.teams[1]?.name || 'Team 2' }}
                </h2>
                <div class="text-4xl font-bold text-red-600 dark:text-red-400 mb-2">
                  {{ scoreboardData.match.teams[1]?.setsWon || 0 }}
                </div>
                <p class="text-red-700 dark:text-red-300 text-sm">Sets Won</p>
              </div>
              <div v-if="scoreboardData.match.teams[1]?.players?.length" class="mt-4">
                <h4 class="font-medium text-red-800 dark:text-red-200 mb-2">Players:</h4>
                <div class="space-y-1">
                  <div 
                    v-for="player in scoreboardData.match.teams[1].players" 
                    :key="player.name"
                    class="text-sm text-red-700 dark:text-red-300"
                  >
                    {{ player.name }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Current Set Details -->
          <div v-if="scoreboardData.currentSet && scoreboardData.match.status === 'inProgress'" class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
              Current Set
            </h3>
            
            <!-- Current Score -->
            <div class="flex justify-center items-center space-x-8 mb-4">
              <div class="text-center">
                <div class="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {{ scoreboardData.currentSet.score[0] }}
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  {{ scoreboardData.match.teams[0]?.name || 'Team 1' }}
                </p>
              </div>
              <span class="text-2xl text-gray-400">-</span>
              <div class="text-center">
                <div class="text-3xl font-bold text-red-600 dark:text-red-400">
                  {{ scoreboardData.currentSet.score[1] }}
                </div>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  {{ scoreboardData.match.teams[1]?.name || 'Team 2' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Match Completed -->
          <div v-if="scoreboardData.match.status === 'completed' && scoreboardData.match.winner !== undefined" class="text-center mt-6">
            <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
              <h3 class="text-2xl font-bold text-green-800 dark:text-green-200 mb-2">
                Match Completed!
              </h3>
              <p class="text-lg text-green-700 dark:text-green-300">
                Winner: {{ scoreboardData.match.teams[scoreboardData.match.winner]?.name || `Team ${scoreboardData.match.winner + 1}` }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Auto-refresh indicator -->
    <div class="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 border border-gray-200 dark:border-gray-700">
      <div class="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
        <i class="pi pi-refresh" :class="{ 'animate-spin': autoRefreshing }"></i>
        <span>Auto-refresh: {{ autoRefresh ? 'ON' : 'OFF' }}</span>
        <Button 
          :icon="autoRefresh ? 'pi pi-pause' : 'pi pi-play'"
          @click="toggleAutoRefresh"
          class="p-button-text p-button-sm"
          v-tooltip="autoRefresh ? 'Pause auto-refresh' : 'Enable auto-refresh'"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ScoreboardService, type ScoreboardData } from '@/service/ScoreboardService';
import Button from 'primevue/button';
import ProgressSpinner from 'primevue/progressspinner';
import Tag from 'primevue/tag';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const scoreboardData = ref<ScoreboardData | null>(null);
const loading = ref(true);
const error = ref<string>('');
const autoRefresh = ref(true);
const autoRefreshing = ref(false);

let refreshInterval: NodeJS.Timeout | null = null;

const sessionId = computed(() => route.params.sessionId as string);

onMounted(() => {
  loadScoreboardData();
  if (autoRefresh.value) {
    startAutoRefresh();
  }
});

onUnmounted(() => {
  stopAutoRefresh();
});

const loadScoreboardData = async () => {
  try {
    if (!sessionId.value) {
      throw new Error('Invalid session ID');
    }

    autoRefreshing.value = true;
    const response = await ScoreboardService.getSession(sessionId.value);
    
    if (response.success) {
      scoreboardData.value = response.data;
      error.value = '';
    } else {
      throw new Error('Session not found or expired');
    }
  } catch (err) {
    console.error('Error loading scoreboard:', err);
    error.value = err instanceof Error ? err.message : 'Failed to load scoreboard';
    scoreboardData.value = null;
  } finally {
    loading.value = false;
    autoRefreshing.value = false;
  }
};

const startAutoRefresh = () => {
  stopAutoRefresh();
  refreshInterval = setInterval(() => {
    if (!loading.value) {
      loadScoreboardData();
    }
  }, 5000); // Refresh every 5 seconds
};

const stopAutoRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
};

const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value;
  if (autoRefresh.value) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
};

const getMatchName = (): string => {
  if (!scoreboardData.value) return '';
  
  const match = scoreboardData.value.match;
  if (match.name) return match.name;
  
  if (match.teams?.length >= 2) {
    return `${match.teams[0].name} vs ${match.teams[1].name}`;
  }
  
  return `Match ${match._id.slice(-6)}`;
};

const getStatusSeverity = (status: string): string => {
  switch (status) {
    case 'inProgress': return 'success';
    case 'notStarted': return 'info';
    case 'completed': return 'secondary';
    case 'aborted': return 'danger';
    default: return 'secondary';
  }
};
</script>

<style scoped>
.animate-spin {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
