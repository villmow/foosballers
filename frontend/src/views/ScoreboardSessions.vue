<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Scoreboard Sessions</h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          Create and manage scoreboard sessions for live streaming
        </p>
      </div>
      <Button 
        label="Create Session" 
        icon="pi pi-plus" 
        @click="showCreateDialog = true"
        class="p-button-success"
      />
    </div>

    <!-- Sessions List -->
    <Card>
      <template #title>Active Sessions</template>
      <template #content>
        <div v-if="loading" class="flex justify-center p-4">
          <ProgressSpinner />
        </div>
        <div v-else-if="sessions.length === 0" class="text-center p-8 text-gray-500">
          <i class="pi pi-video text-4xl mb-4"></i>
          <p class="text-lg">No active sessions</p>
          <p class="text-sm">Create a session to start streaming a match scoreboard</p>
        </div>
        <div v-else class="space-y-4">
          <div 
            v-for="session in sessions" 
            :key="session.sessionId"
            class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <h3 class="font-semibold text-lg">{{ getMatchName(session.matchId) }}</h3>
                  <Tag 
                    :value="session.currentView" 
                    :severity="getViewSeverity(session.currentView)"
                    class="text-xs"
                  />
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div>
                    <span class="font-medium">Session ID:</span> 
                    <code class="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs ml-1">
                      {{ session.sessionId }}
                    </code>
                  </div>
                  <div>
                    <span class="font-medium">Created:</span> 
                    {{ formatDate(session.createdAt) }}
                  </div>
                  <div>
                    <span class="font-medium">Expires:</span> 
                    {{ formatDate(session.expiresAt) }}
                  </div>
                </div>

                <div v-if="session.bannerText" class="mt-2">
                  <span class="font-medium text-sm">Banner:</span>
                  <span class="text-sm text-gray-600 dark:text-gray-400 ml-2">{{ session.bannerText }}</span>
                </div>
              </div>

              <div class="flex gap-2 ml-4">
                <Button 
                  icon="pi pi-eye" 
                  class="p-button-text p-button-sm" 
                  v-tooltip="'View Scoreboard'"
                  @click="viewScoreboard(session.sessionId)"
                />
                <Button 
                  icon="pi pi-cog" 
                  class="p-button-text p-button-sm" 
                  v-tooltip="'Session Settings'"
                  @click="openSessionSettings(session)"
                />
                <Button 
                  icon="pi pi-copy" 
                  class="p-button-text p-button-sm" 
                  v-tooltip="'Copy Public URL'"
                  @click="copyPublicUrl(session.sessionId)"
                />
                <Button 
                  icon="pi pi-trash" 
                  class="p-button-text p-button-sm p-button-danger" 
                  v-tooltip="'Remove Session'"
                  @click="confirmRemoveSession(session.sessionId)"
                />
              </div>
            </div>
          </div>
        </div>
      </template>
    </Card>

    <!-- Create Session Dialog -->
    <CreateSessionDialog 
      v-model:visible="showCreateDialog"
      @session-created="onSessionCreated"
    />

    <!-- Session Settings Dialog -->
    <SessionSettingsDialog 
      v-model:visible="showSettingsDialog"
      :session="selectedSession"
      @session-updated="onSessionUpdated"
    />

    <!-- Remove Confirmation Dialog -->
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import CreateSessionDialog from '@/components/scoreboard/CreateSessionDialog.vue';
import SessionSettingsDialog from '@/components/scoreboard/SessionSettingsDialog.vue';
import { MatchService, type Match } from '@/service/MatchService';
import { ScoreboardService, type ScoreboardSession } from '@/service/ScoreboardService';
import Button from 'primevue/button';
import Card from 'primevue/card';
import ConfirmDialog from 'primevue/confirmdialog';
import ProgressSpinner from 'primevue/progressspinner';
import Tag from 'primevue/tag';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';

const confirm = useConfirm();
const toast = useToast();

const sessions = ref<ScoreboardSession[]>([]);
const matches = ref<Match[]>([]);
const loading = ref(false);
const showCreateDialog = ref(false);
const showSettingsDialog = ref(false);
const selectedSession = ref<ScoreboardSession | null>(null);

onMounted(() => {
  loadMatches();
});

const loadMatches = async () => {
  try {
    loading.value = true;
    const response = await MatchService.getMatches({ limit: 100 });
    matches.value = response.data.matches;
    
    // Load sessions for all matches
    await loadAllSessions();
  } catch (error) {
    console.error('Error loading matches:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load matches',
      life: 3000
    });
  } finally {
    loading.value = false;
  }
};

const loadAllSessions = async () => {
  try {
    const allSessions: ScoreboardSession[] = [];
    
    for (const match of matches.value) {
      try {
        const response = await ScoreboardService.getMatchSessions(match._id);
        if (response.success) {
          allSessions.push(...response.data.sessions);
        }
      } catch (error) {
        // Skip matches that error (might not have sessions)
        console.warn(`Failed to load sessions for match ${match._id}:`, error);
      }
    }
    
    sessions.value = allSessions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('Error loading sessions:', error);
  }
};

const getMatchName = (matchId: string | undefined): string => {
  if (!matchId) return 'Banner Session';
  
  const match = matches.value.find(m => m._id === matchId);
  if (match?.name) return match.name;
  
  if (match?.teams && match.teams.length >= 2) {
    const teamA = match.teams[0]?.name || 'Team A';
    const teamB = match.teams[1]?.name || 'Team B';
    return `${teamA} vs ${teamB}`;
  }
  
  return `Match ${matchId.slice(-6)}`;
};

const getViewSeverity = (view: string): string => {
  switch (view) {
    case 'detailed': return 'success';
    case 'overview': return 'info';
    case 'banner': return 'warning';
    default: return 'secondary';
  }
};

const formatDate = (date: Date | string): string => {
  return new Date(date).toLocaleString();
};

const viewScoreboard = (sessionId: string) => {
  // Open scoreboard in new tab
  const url = `/scoreboard/${sessionId}`;
  window.open(url, '_blank');
};

const openSessionSettings = (session: ScoreboardSession) => {
  selectedSession.value = session;
  showSettingsDialog.value = true;
};

const copyPublicUrl = async (sessionId: string) => {
  try {
    const url = ScoreboardService.getPublicScoreboardUrl(sessionId);
    await navigator.clipboard.writeText(url);
    toast.add({
      severity: 'success',
      summary: 'Copied',
      detail: 'Public URL copied to clipboard',
      life: 3000
    });
  } catch (error) {
    console.error('Error copying URL:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to copy URL',
      life: 3000
    });
  }
};

const confirmRemoveSession = (sessionId: string) => {
  confirm.require({
    message: 'Are you sure you want to remove this session? This action cannot be undone.',
    header: 'Remove Session',
    icon: 'pi pi-exclamation-triangle',
    rejectClass: 'p-button-secondary',
    acceptClass: 'p-button-danger',
    accept: () => removeSession(sessionId)
  });
};

const removeSession = async (sessionId: string) => {
  try {
    await ScoreboardService.removeSession(sessionId);
    sessions.value = sessions.value.filter(s => s.sessionId !== sessionId);
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Session removed successfully',
      life: 3000
    });
  } catch (error) {
    console.error('Error removing session:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to remove session',
      life: 3000
    });
  }
};

const onSessionCreated = (newSession: ScoreboardSession) => {
  sessions.value.unshift(newSession);
  showCreateDialog.value = false;
  toast.add({
    severity: 'success',
    summary: 'Success',
    detail: 'Session created successfully',
    life: 3000
  });
};

const onSessionUpdated = (updatedSession: ScoreboardSession) => {
  const index = sessions.value.findIndex(s => s.sessionId === updatedSession.sessionId);
  if (index !== -1) {
    sessions.value[index] = updatedSession;
  }
  showSettingsDialog.value = false;
  toast.add({
    severity: 'success',
    summary: 'Success',
    detail: 'Session updated successfully',
    life: 3000
  });
};
</script>
