<script setup>
import { computed, defineEmits, defineProps, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useMatchConfig } from '@/composables/useMatchConfig';

// Form state
const props = defineProps({
  modelValue: {
    type: String,
    default: '2v2',
  },
});
const emit = defineEmits(['update:modelValue']);

// Use the match config store
const { 
  config, 
  presets, 
  updateConfig, 
  applyPreset, 
  saveAsPreset: savePreset,
  getConfigWithUserId
} = useMatchConfig();

// Local reactive properties that sync with the store
const playerSetup = computed({
  get: () => config.value.playerSetup,
  set: (value) => updateConfig({ playerSetup: value })
});
const numGoalsToWin = computed({
  get: () => config.value.numGoalsToWin,
  set: (value) => updateConfig({ numGoalsToWin: value })
});
const numSetsToWin = computed({
  get: () => config.value.numSetsToWin,
  set: (value) => updateConfig({ numSetsToWin: value })
});
const timeoutsPerSet = computed({
  get: () => config.value.timeoutsPerSet,
  set: (value) => updateConfig({ timeoutsPerSet: value })
});
const draw = computed({
  get: () => config.value.draw,
  set: (value) => updateConfig({ draw: value })
});
const twoAhead = computed({
  get: () => config.value.twoAhead,
  set: (value) => updateConfig({ twoAhead: value })
});
const twoAheadUpUntil = computed({
  get: () => config.value.twoAheadUpUntil || 8,
  set: (value) => updateConfig({ twoAheadUpUntil: value })
});

// Preset methods using the store
function qualification() {
  applyPreset('qualification');
}
function bestOf3() {
  applyPreset('bestof3');
}
function bestOf5() {
  applyPreset('bestof5');
}

// Convert store presets to the format expected by the UI
const presetOptions = computed(() => [
  { label: 'Qualification', value: 'qualification' },
  { label: 'Best of 3', value: 'bestof3' },
  { label: 'Best of 5', value: 'bestof5' },
  ...presets.value
    .filter(preset => !['qualification', 'bestof3', 'bestof5'].includes(preset.id))
    .map(preset => ({ label: preset.name, value: preset.id }))
]);

const selectedPreset = ref(null);

function onPresetChange(value) {
  if (value === 'qualification') qualification();
  else if (value === 'bestof3') bestOf3();
  else if (value === 'bestof5') bestOf5();
  else {
    applyPreset(value);
  }
}

// Save preset functionality
function saveAsPreset() {
  const presetName = prompt('Enter a name for this preset:');
  if (presetName && presetName.trim()) {
    try {
      savePreset(presetName.trim());
      // Reset selection to show the new preset
      selectedPreset.value = null;
    } catch (error) {
      console.error('Failed to save preset:', error);
    }
  }
}

// Load presets (placeholder for future functionality)
function loadPresets() {
  // This could open a modal or show preset management UI
  console.log('Load presets functionality - showing available presets:', presets.value);
}

// Expose configuration data for parent components
const getConfiguration = () => {
  return getConfigWithUserId.value();
};

// Make getConfiguration available to parent
defineExpose({ getConfiguration });

// Responsive layout logic
const containerRef = ref(null);
const containerWidth = ref(0);
const NARROW_WIDTH = 500; // px, adjust as needed

const isNarrow = computed(() => containerWidth.value < NARROW_WIDTH);

let resizeObserver;

onMounted(() => {
  if (containerRef.value) {
    resizeObserver = new window.ResizeObserver(entries => {
      for (const entry of entries) {
        containerWidth.value = entry.contentRect.width;
      }
    });
    resizeObserver.observe(containerRef.value);
    // Set initial width
    containerWidth.value = containerRef.value.offsetWidth;
  }
});

onBeforeUnmount(() => {
  if (resizeObserver && containerRef.value) {
    resizeObserver.unobserve(containerRef.value);
  }
});

// Sync playerSetup with props and emit updates
watch(() => config.value.playerSetup, (newValue) => {
  emit('update:modelValue', newValue);
});

// Sync playerSetup from props to store
watch(() => props.modelValue, (val) => {
  if (val !== config.value.playerSetup) {
    updateConfig({ playerSetup: val });
  }
});

// Sync playerSetup from store
watch(() => config.value.playerSetup, (newValue) => {
  if (newValue !== playerSetup.value) {
    playerSetup.value = newValue;
  }
});
</script>

<template>
  <div ref="containerRef" class="card flex flex-col gap-6 w-full max-w-2xl mx-auto">
    <div class="font-semibold text-2xl mb-2">Match Configuration</div>
    <div v-if="isNarrow" class="flex flex-col gap-4">
      <!-- Vertical layout (original) -->
      <div class="flex flex-col gap-2">
        <label class="font-semibold mb-1">Preset</label>
        <Select v-model="selectedPreset" :options="presetOptions" optionLabel="label" optionValue="value" placeholder="Select Preset" @update:modelValue="onPresetChange" />
      </div>
      <div class="flex flex-col gap-2">
        <label class="font-semibold mb-1">Player Setup</label>
        <div class="flex flex-row gap-6">
          <div class="flex items-center">
            <RadioButton id="setup-1v1" name="playerSetup" value="1v1" v-model="playerSetup" />
            <label for="setup-1v1" class="ml-2">1 vs 1</label>
          </div>
          <div class="flex items-center">
            <RadioButton id="setup-2v2" name="playerSetup" value="2v2" v-model="playerSetup" />
            <label for="setup-2v2" class="ml-2">2 vs 2</label>
          </div>
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <label class="mb-1">Goals to Win a Set</label>
        <InputNumber v-model="numGoalsToWin" :min="1" :max="20" />
      </div>
      <div class="flex flex-col gap-2">
        <label class="mb-1">Sets to Win Match</label>
        <InputNumber v-model="numSetsToWin" :min="1" :max="10" />
      </div>
      <div class="flex flex-col gap-2">
        <label class="mb-1">Timeouts per Set</label>
        <InputNumber v-model="timeoutsPerSet" :min="0" :max="5" />
      </div>
      <div class="flex flex-col gap-2">
        <label class="mb-1">2 Goals Ahead Rule</label>
        <ToggleSwitch v-model="twoAhead" />
      </div>
      <div v-if="twoAhead" class="flex flex-col gap-2">
        <label class="mb-1">Win by Two Applies Up To Goal</label>
        <InputNumber v-model="twoAheadUpUntil" :min="1" :max="20" />
      </div>
      <div class="flex flex-col gap-2">
        <label class="mb-1">Draw Allowed</label>
        <ToggleSwitch v-model="draw" />
      </div>
      
      <!-- Action Buttons -->
      <div class="flex gap-2 mt-4">
        <Button 
          label="Save Settings as Preset" 
          icon="pi pi-save" 
          severity="secondary" 
          outlined
          @click="saveAsPreset"
        />
        <Button 
          label="Load Presets" 
          icon="pi pi-folder-open" 
          severity="secondary" 
          outlined
          @click="loadPresets"
        />
      </div>
    </div>
    <div v-else class="flex flex-col gap-4">
      <!-- Horizontal layout (from FormLayout.vue) -->
      <div class="grid grid-cols-12 gap-2 items-center">
        <label class="font-semibold col-span-12 md:col-span-3 mb-1 md:mb-0">Preset</label>
        <div class="col-span-12 md:col-span-9">
          <Select v-model="selectedPreset" :options="presetOptions" optionLabel="label" optionValue="value" placeholder="Select Preset" @update:modelValue="onPresetChange" />
        </div>
      </div>
      <div class="grid grid-cols-12 gap-2 items-center">
        <label class="font-semibold col-span-12 md:col-span-3 mb-1 md:mb-0">Player Setup</label>
        <div class="col-span-12 md:col-span-9 flex flex-row gap-6">
          <div class="flex items-center">
            <RadioButton id="setup-1v1" name="playerSetup" value="1v1" v-model="playerSetup" />
            <label for="setup-1v1" class="ml-2">1 vs 1</label>
          </div>
          <div class="flex items-center">
            <RadioButton id="setup-2v2" name="playerSetup" value="2v2" v-model="playerSetup" />
            <label for="setup-2v2" class="ml-2">2 vs 2</label>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-12 gap-2 items-center">
        <label class="col-span-12 md:col-span-3 mb-1 md:mb-0">Goals to Win a Set</label>
        <div class="col-span-12 md:col-span-9">
          <InputNumber v-model="numGoalsToWin" :min="1" :max="20" />
        </div>
      </div>
      <div class="grid grid-cols-12 gap-2 items-center">
        <label class="col-span-12 md:col-span-3 mb-1 md:mb-0">Sets to Win Match</label>
        <div class="col-span-12 md:col-span-9">
          <InputNumber v-model="numSetsToWin" :min="1" :max="10" />
        </div>
      </div>
      <div class="grid grid-cols-12 gap-2 items-center">
        <label class="col-span-12 md:col-span-3 mb-1 md:mb-0">Timeouts per Set</label>
        <div class="col-span-12 md:col-span-9">
          <InputNumber v-model="timeoutsPerSet" :min="0" :max="5" />
        </div>
      </div>
      <div class="grid grid-cols-12 gap-2 items-center">
        <label class="col-span-12 md:col-span-3 mb-1 md:mb-0">2 Goals Ahead Rule</label>
        <div class="col-span-12 md:col-span-9">
          <ToggleSwitch v-model="twoAhead" />
        </div>
      </div>
      <div v-if="twoAhead" class="grid grid-cols-12 gap-2 items-center">
        <label class="col-span-12 md:col-span-3 mb-1 md:mb-0">Win by Two Applies Up To Goal</label>
        <div class="col-span-12 md:col-span-9">
          <InputNumber v-model="twoAheadUpUntil" :min="1" :max="20" />
        </div>
      </div>
      <div class="grid grid-cols-12 gap-2 items-center">
        <label class="col-span-12 md:col-span-3 mb-1 md:mb-0">Draw Allowed</label>
        <div class="col-span-12 md:col-span-9">
          <ToggleSwitch v-model="draw" />
        </div>
      </div>
    </div>
  </div>
</template>
