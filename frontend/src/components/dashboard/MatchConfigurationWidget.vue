<script setup>
import { ref } from 'vue';

// Form state
const playerSetup = ref('2v2');
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
</script>

<template>
  <div class="card flex flex-col gap-6 w-full max-w-2xl mx-auto">
    <div class="font-semibold text-2xl mb-2">Match Configuration</div>
    <div class="flex flex-col gap-4">
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
  </div>
</template>
