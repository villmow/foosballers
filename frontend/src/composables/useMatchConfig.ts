import { useMatchConfigStore } from '@/stores/matchConfig'
import { computed } from 'vue'

export function useMatchConfig() {
  const matchConfigStore = useMatchConfigStore()

  return {
    // State
    config: computed(() => matchConfigStore.currentConfig),
    presets: computed(() => matchConfigStore.availablePresets),
    isInitialized: computed(() => matchConfigStore.isInitialized),
    
    // Getters - simplified to directly call the function
    getConfigWithUserId: () => matchConfigStore.getConfigWithUserId(),
    
    // Actions
    initialize: matchConfigStore.initialize,
    updateConfig: matchConfigStore.updateConfig,
    setConfig: matchConfigStore.setConfig,
    applyPreset: matchConfigStore.applyPreset,
    saveAsPreset: matchConfigStore.saveAsPreset,
    deletePreset: matchConfigStore.deletePreset,
    resetToDefaults: matchConfigStore.resetToDefaults,
    
    // Quick preset methods
    setQualification: matchConfigStore.setQualification,
    setBestOf3: matchConfigStore.setBestOf3,
    setBestOf5: matchConfigStore.setBestOf5
  }
}
