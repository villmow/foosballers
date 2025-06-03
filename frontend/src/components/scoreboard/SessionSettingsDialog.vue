<template>
  <Dialog 
    v-model:visible="visible" 
    modal 
    header="Session Settings"
    :style="{ width: '40rem' }"
    class="p-fluid"
  >
    <div v-if="session" class="space-y-4">
      <!-- Session Info -->
      <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <h4 class="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Session Information</h4>
        <div class="text-sm space-y-1">
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">Session ID:</span>
            <code class="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-xs">
              {{ session.sessionId }}
            </code>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">Created:</span>
            <span>{{ formatDate(session.createdAt) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600 dark:text-gray-400">Expires:</span>
            <span>{{ formatDate(session.expiresAt) }}</span>
          </div>
        </div>
      </div>

      <!-- Match Assignment -->
      <div class="field">
        <label for="assignedMatch" class="font-medium">Assigned Match</label>
        <div v-if="session.matchId" class="flex items-center justify-between bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-2">
          <div>
            <div class="font-medium text-green-800 dark:text-green-200">
              {{ getMatchName(session.matchId) }}
            </div>
            <div class="text-sm text-green-600 dark:text-green-400">
              Match assigned
            </div>
          </div>
          <Button 
            icon="pi pi-times" 
            class="p-button-text p-button-sm p-button-danger"
            @click="unassignMatch"
            v-tooltip="'Unassign match'"
          />
        </div>
        <div v-else>
          <Dropdown 
            id="assignedMatch"
            v-model="selectedMatchId"
            :options="matchOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Select a match to assign..."
            :filter="true"
            filterPlaceholder="Search matches..."
            class="w-full mb-2"
          />
          <Button 
            v-if="selectedMatchId"
            label="Assign Match" 
            icon="pi pi-check" 
            @click="assignMatch"
            :loading="assigningMatch"
            class="p-button-sm p-button-success"
          />
        </div>
        <small class="text-gray-600 dark:text-gray-400">
          {{ session.matchId 
            ? 'Match is assigned. You can switch to detailed/overview views.' 
            : 'Assign a match to enable detailed scoreboard views.'
          }}
        </small>
      </div>

      <!-- View Settings -->
      <div class="field">
        <label for="view" class="font-medium">Display View</label>
        <div class="flex flex-col space-y-2">
          <div class="flex items-center">
            <RadioButton 
              id="detailed" 
              v-model="currentView" 
              name="view" 
              value="detailed" 
            />
            <label for="detailed" class="ml-2">
              <div class="font-medium">Detailed Scoreboard</div>
              <div class="text-sm text-gray-600 dark:text-gray-400">
                Shows full match details, scores, and game progress
              </div>
            </label>
          </div>
          <div class="flex items-center">
            <RadioButton 
              id="overview" 
              v-model="currentView" 
              name="view" 
              value="overview" 
            />
            <label for="overview" class="ml-2">
              <div class="font-medium">Overview</div>
              <div class="text-sm text-gray-600 dark:text-gray-400">
                Shows simplified match information and current scores
              </div>
            </label>
          </div>
          <div class="flex items-center">
            <RadioButton 
              id="banner" 
              v-model="currentView" 
              name="view" 
              value="banner" 
            />
            <label for="banner" class="ml-2">
              <div class="font-medium">Banner Only</div>
              <div class="text-sm text-gray-600 dark:text-gray-400">
                Shows only a custom message without scoreboard
              </div>
            </label>
          </div>
        </div>
      </div>

      <!-- Banner Text -->
      <div v-if="currentView === 'banner'" class="field">
        <label for="bannerText" class="font-medium">Banner Message</label>
        <InputText 
          id="bannerText"
          v-model="currentBannerText"
          placeholder="Enter your message..."
          class="w-full"
        />
        <small class="text-gray-600 dark:text-gray-400">
          This message will be displayed instead of the scoreboard
        </small>
      </div>

      <!-- Public URL -->
      <div class="field">
        <label class="font-medium">Public Scoreboard URL</label>
        <div class="flex">
          <InputText 
            :value="publicUrl"
            readonly
            class="flex-1"
          />
          <Button 
            icon="pi pi-copy" 
            class="p-button-outlined ml-2"
            @click="copyUrl"
            v-tooltip="'Copy URL'"
          />
        </div>
        <small class="text-gray-600 dark:text-gray-400">
          Share this URL to allow others to view the scoreboard
        </small>
      </div>

      <!-- Preview -->
      <div class="field">
        <label class="font-medium">Preview</label>
        <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900">
          <div v-if="currentView === 'banner'" class="text-center py-8">
            <div v-if="currentBannerText" class="text-xl font-semibold">
              {{ currentBannerText }}
            </div>
            <div v-else class="text-gray-500 italic">
              Banner message will appear here
            </div>
          </div>
          <div v-else class="text-center text-gray-500">
            <i class="pi pi-eye text-2xl mb-2"></i>
            <div class="text-sm">
              {{ currentView === 'detailed' ? 'Detailed scoreboard' : 'Overview scoreboard' }} preview
            </div>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <Button 
        label="Cancel" 
        icon="pi pi-times" 
        @click="closeDialog"
        class="p-button-text"
      />
      <Button 
        label="Save Changes" 
        icon="pi pi-check" 
        @click="saveSettings"
        :loading="loading"
        :disabled="!hasChanges"
        class="p-button-success"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { MatchService, type Match } from '@/service/MatchService';
import { ScoreboardService, type ScoreboardSession } from '@/service/ScoreboardService';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';
import RadioButton from 'primevue/radiobutton';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref, watch } from 'vue';

interface Props {
  visible: boolean;
  session: ScoreboardSession | null;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'session-updated', session: ScoreboardSession): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const toast = useToast();

// State for match management
const availableMatches = ref<Match[]>([]);
const selectedMatchId = ref<string | null>(null);
const assigningMatch = ref(false);

// State for session settings
const currentView = ref<'detailed' | 'overview' | 'banner'>('detailed');
const currentBannerText = ref<string>('');
const loading = ref(false);

const visible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});

const publicUrl = computed(() => {
  if (!props.session) return '';
  return ScoreboardService.getPublicScoreboardUrl(props.session.sessionId);
});

const hasChanges = computed(() => {
  if (!props.session) return false;
  
  return currentView.value !== props.session.currentView ||
         (currentView.value === 'banner' && currentBannerText.value !== (props.session.bannerText || ''));
});

const matchOptions = computed(() => {
  return availableMatches.value.map(match => ({
    label: getMatchDisplayName(match),
    value: match._id
  }));
});

// Load available matches on component mount
onMounted(async () => {
  if (props.visible) {
    await loadAvailableMatches();
  }
});

// Update form when session changes
watch(() => props.session, (newSession) => {
  if (newSession) {
    currentView.value = newSession.currentView;
    currentBannerText.value = newSession.bannerText || '';
  }
});

// Reset form when dialog opens
watch(() => props.visible, async (isVisible) => {
  if (isVisible && props.session) {
    currentView.value = props.session.currentView;
    currentBannerText.value = props.session.bannerText || '';
    await loadAvailableMatches();
  }
});

const loadAvailableMatches = async () => {
  try {
    const response = await MatchService.getMatches({ 
      status: 'inProgress' // Only show in-progress matches for assignment
    });
    
    if (response.success && response.data.matches) {
      availableMatches.value = response.data.matches;
    }
  } catch (error) {
    console.error('Error loading matches:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load available matches',
      life: 3000
    });
  }
};

const getMatchDisplayName = (match: Match): string => {
  const teamA = match.teams[0]?.players?.map(p => p.name).join(' / ') || 'Team A';
  const teamB = match.teams[1]?.players?.map(p => p.name).join(' / ') || 'Team B';
  return `${teamA} vs ${teamB}`;
};

const getMatchName = (matchId: string): string => {
  const match = availableMatches.value.find(m => m._id === matchId);
  if (match) {
    return getMatchDisplayName(match);
  }
  return 'Unknown Match';
};

const assignMatch = async () => {
  if (!props.session || !selectedMatchId.value) return;
  
  try {
    assigningMatch.value = true;
    
    const response = await ScoreboardService.assignMatchToSession(
      props.session.sessionId,
      selectedMatchId.value
    );
    
    if (response.success) {
      // Create updated session object
      const updatedSession: ScoreboardSession = {
        ...props.session,
        matchId: selectedMatchId.value
      };
      
      emit('session-updated', updatedSession);
      selectedMatchId.value = null;
      
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Match assigned to session',
        life: 3000
      });
    }
  } catch (error) {
    console.error('Error assigning match:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to assign match to session',
      life: 3000
    });
  } finally {
    assigningMatch.value = false;
  }
};

const unassignMatch = async () => {
  if (!props.session || !props.session.matchId) return;
  
  try {
    const response = await ScoreboardService.assignMatchToSession(
      props.session.sessionId,
      null // Pass null to unassign
    );
    
    if (response.success) {
      // Create updated session object
      const updatedSession: ScoreboardSession = {
        ...props.session,
        matchId: undefined,
        currentView: 'banner' // Reset to banner view when unassigning
      };
      
      currentView.value = 'banner';
      emit('session-updated', updatedSession);
      
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Match unassigned from session',
        life: 3000
      });
    }
  } catch (error) {
    console.error('Error unassigning match:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to unassign match from session',
      life: 3000
    });
  }
};

const formatDate = (date: Date | string): string => {
  return new Date(date).toLocaleString();
};

const copyUrl = async () => {
  try {
    await navigator.clipboard.writeText(publicUrl.value);
    toast.add({
      severity: 'success',
      summary: 'Copied',
      detail: 'URL copied to clipboard',
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

const saveSettings = async () => {
  if (!props.session || !hasChanges.value) return;
  
  try {
    loading.value = true;
    
    const response = await ScoreboardService.updateSessionView(
      props.session.sessionId,
      currentView.value,
      currentView.value === 'banner' ? currentBannerText.value : undefined
    );
    
    if (response.success) {
      // Create updated session object
      const updatedSession: ScoreboardSession = {
        ...props.session,
        currentView: currentView.value,
        bannerText: currentView.value === 'banner' ? currentBannerText.value : undefined
      };
      
      emit('session-updated', updatedSession);
      closeDialog();
    }
  } catch (error) {
    console.error('Error updating session:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to update session settings',
      life: 3000
    });
  } finally {
    loading.value = false;
  }
};

const closeDialog = () => {
  visible.value = false;
};
</script>
