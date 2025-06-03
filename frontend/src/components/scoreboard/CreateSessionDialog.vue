<template>
  <Dialog 
    v-model:visible="visible" 
    modal 
    header="Create Scoreboard Session"
    :style="{ width: '40rem' }"
    class="p-fluid"
  >
    <div class="space-y-4">
      <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <div class="flex items-start space-x-3">
          <i class="pi pi-info-circle text-blue-500 mt-1"></i>
          <div>
            <h4 class="font-medium text-blue-800 dark:text-blue-200 mb-1">Quick Setup</h4>
            <p class="text-sm text-blue-700 dark:text-blue-300">
              This creates a new scoreboard session in banner mode. You can assign a match and switch to detailed view later.
            </p>
          </div>
        </div>
      </div>

      <div class="field">
        <label for="bannerText" class="font-medium">Banner Message (Optional)</label>
        <InputText 
          id="bannerText"
          v-model="bannerText"
          placeholder="Enter your message..."
          class="w-full"
        />
        <small class="text-gray-600 dark:text-gray-400">
          This message will be displayed on the scoreboard. You can change it later.
        </small>
      </div>

      <div class="field">
        <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h4 class="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">What happens next?</h4>
          <ul class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li class="flex items-center">
              <i class="pi pi-check text-green-500 mr-2"></i>
              A new scoreboard session will be created
            </li>
            <li class="flex items-center">
              <i class="pi pi-check text-green-500 mr-2"></i>
              You'll get a public URL to share for viewing
            </li>
            <li class="flex items-center">
              <i class="pi pi-check text-green-500 mr-2"></i>
              You can assign a match later in session settings
            </li>
          </ul>
        </div>
      </div>

      <!-- Preview -->
      <div class="field">
        <label class="font-medium">Preview</label>
        <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-900 text-center">
          <div v-if="bannerText" class="text-xl font-semibold">
            {{ bannerText }}
          </div>
          <div v-else class="text-gray-500 italic">
            Banner message will appear here
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
        label="Create Session" 
        icon="pi pi-check" 
        @click="createSession"
        :loading="loading"
        class="p-button-success"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import { ScoreboardService, type ScoreboardSession } from '@/service/ScoreboardService';

interface Props {
  visible: boolean;
}

interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'session-created', session: ScoreboardSession): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const toast = useToast();

const bannerText = ref<string>('');
const loading = ref(false);

const visible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
});

// Reset form when dialog opens
watch(() => props.visible, (isVisible) => {
  if (isVisible) {
    resetForm();
  }
});

const createSession = async () => {
  try {
    loading.value = true;
    
    // Create the session without a match (defaults to banner view)
    const response = await ScoreboardService.createSession();
    
    if (response.success) {
      // If banner text is provided, update the session view
      if (bannerText.value.trim()) {
        await ScoreboardService.updateSessionView(
          response.session.sessionId,
          'banner',
          bannerText.value.trim()
        );
        
        // Update the session object with the banner text
        response.session.bannerText = bannerText.value.trim();
      }
      
      // Ensure the session is set to banner view
      response.session.currentView = 'banner';
      
      emit('session-created', response.session);
      closeDialog();
    }
  } catch (error) {
    console.error('Error creating session:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to create session',
      life: 3000
    });
  } finally {
    loading.value = false;
  }
};

const resetForm = () => {
  bannerText.value = '';
};

const closeDialog = () => {
  visible.value = false;
  resetForm();
};
</script>
