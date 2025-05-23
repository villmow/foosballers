<script setup>
import { computed, defineEmits, defineProps, onBeforeUnmount, onMounted, ref, watch } from 'vue';

// Form state
const props = defineProps({
  modelValue: {
    type: String,
    default: '2v2',
  },
});
const emit = defineEmits(['update:modelValue']);

const playerSetup = ref(props.modelValue);
const numGoalsToWin = ref(5);
const numSetsToWin = ref(2);
const timeoutsPerSet = ref(2);
const draw = ref(false);
const twoAhead = ref(false);

function qualification() {
    numGoalsToWin.value = 7;
    numSetsToWin.value = 1;
    timeoutsPerSet.value = 2;
    draw.value = false;
    twoAhead.value = false;
}
function bestOf3() {
    numGoalsToWin.value = 5;
    numSetsToWin.value = 2;
    timeoutsPerSet.value = 2;
    draw.value = false;
    twoAhead.value = true;
}
function bestOf5() {
    numGoalsToWin.value = 5;
    numSetsToWin.value = 3;
    timeoutsPerSet.value = 2;
    draw.value = false;
    twoAhead.value = true;
}

const presetOptions = [
  { label: 'Qualification', value: 'qualification' },
  { label: 'Best of 3', value: 'bestof3' },
  { label: 'Best of 5', value: 'bestof5' }
];
const selectedPreset = ref(null);

function onPresetChange(value) {
  if (value === 'qualification') qualification();
  else if (value === 'bestof3') bestOf3();
  else if (value === 'bestof5') bestOf5();
}

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

watch(() => props.modelValue, (val) => {
  if (val !== playerSetup.value) playerSetup.value = val;
});
watch(playerSetup, (val) => {
  emit('update:modelValue', val);
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
      <div class="flex flex-col gap-2">
        <label class="mb-1">Draw Allowed</label>
        <ToggleSwitch v-model="draw" />
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
      <div class="grid grid-cols-12 gap-2 items-center">
        <label class="col-span-12 md:col-span-3 mb-1 md:mb-0">Draw Allowed</label>
        <div class="col-span-12 md:col-span-9">
          <ToggleSwitch v-model="draw" />
        </div>
      </div>
    </div>
  </div>
</template>
