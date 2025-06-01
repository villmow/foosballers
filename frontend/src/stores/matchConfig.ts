import { defineStore } from 'pinia'

export interface MatchConfiguration {
  numGoalsToWin: number
  numSetsToWin: number
  twoAhead: boolean
  twoAheadUpUntil?: number
  name: string
  draw: boolean
  timeoutsPerSet: number
  playerSetup: '1v1' | '2v2'
}

export interface MatchConfigPreset {
  id: string
  name: string
  config: MatchConfiguration
}

interface MatchConfigState {
  config: MatchConfiguration
  presets: MatchConfigPreset[]
  isInitialized: boolean
}

// Default configuration
const defaultConfig: MatchConfiguration = {
  numGoalsToWin: 5,
  numSetsToWin: 2,
  twoAhead: true,
  twoAheadUpUntil: 8,
  name: 'Default',
  draw: false,
  timeoutsPerSet: 2,
  playerSetup: '2v2'
}

// Built-in presets
const builtInPresets: MatchConfigPreset[] = [
  {
    id: 'qualification',
    name: 'Qualification',
    config: {
      numGoalsToWin: 7,
      numSetsToWin: 1,
      twoAhead: false,
      twoAheadUpUntil: 8,
      name: 'Qualification',
      draw: false,
      timeoutsPerSet: 2,
      playerSetup: '2v2'
    }
  },
  {
    id: 'bestof3',
    name: 'Best of 3',
    config: {
      numGoalsToWin: 5,
      numSetsToWin: 2,
      twoAhead: true,
      twoAheadUpUntil: 8,
      name: 'Best of 3',
      draw: false,
      timeoutsPerSet: 2,
      playerSetup: '2v2'
    }
  },
  {
    id: 'bestof5',
    name: 'Best of 5',
    config: {
      numGoalsToWin: 5,
      numSetsToWin: 3,
      twoAhead: true,
      twoAheadUpUntil: 8,
      name: 'Best of 5',
      draw: false,
      timeoutsPerSet: 2,
      playerSetup: '2v2'
    }
  }
]

export const useMatchConfigStore = defineStore('matchConfig', {
  state: (): MatchConfigState => ({
    config: { ...defaultConfig },
    presets: [...builtInPresets],
    isInitialized: false
  }),

  getters: {
    currentConfig: (state): MatchConfiguration => state.config,
    availablePresets: (state): MatchConfigPreset[] => state.presets,
    getConfigWithUserId: (state) => (): MatchConfiguration & { createdBy: string | null } => {
      let userId = null
      const userString = localStorage.getItem('user')
      if (userString) {
        try {
          const user = JSON.parse(userString)
          userId = user && user.id ? user.id : null
        } catch (error) {
          console.error('Error parsing user from localStorage:', error)
        }
      }
      return {
        ...state.config,
        createdBy: userId
      }
    }
  },

  actions: {
    // Initialize store state from localStorage
    async initialize() {
      try {
        const storedConfig = localStorage.getItem('matchConfig')
        if (storedConfig) {
          const parsedConfig = JSON.parse(storedConfig)
          this.config = { ...defaultConfig, ...parsedConfig }
        }

        const storedPresets = localStorage.getItem('matchConfigPresets')
        if (storedPresets) {
          const parsedPresets = JSON.parse(storedPresets)
          // Merge built-in presets with custom presets
          const customPresets = parsedPresets.filter((preset: MatchConfigPreset) => 
            !builtInPresets.some(builtin => builtin.id === preset.id)
          )
          this.presets = [...builtInPresets, ...customPresets]
        }
      } catch (error) {
        console.error('Error initializing match config state:', error)
        this.resetToDefaults()
      } finally {
        this.isInitialized = true
      }
    },

    // Update configuration and persist to localStorage
    updateConfig(newConfig: Partial<MatchConfiguration>) {
      this.config = { ...this.config, ...newConfig }
      this.persistConfig()
    },

    // Set complete configuration
    setConfig(config: MatchConfiguration) {
      this.config = { ...config }
      this.persistConfig()
    },

    // Apply a preset configuration
    applyPreset(presetId: string) {
      const preset = this.presets.find(p => p.id === presetId)
      if (preset) {
        this.setConfig(preset.config)
        return true
      }
      return false
    },

    // Save current configuration as a custom preset
    saveAsPreset(name: string): string {
      const id = `custom_${Date.now()}`
      const newPreset: MatchConfigPreset = {
        id,
        name,
        config: { ...this.config, name }
      }
      
      // Add to presets (filter out any existing custom preset with same name)
      this.presets = this.presets.filter(p => p.name !== name || builtInPresets.some(b => b.id === p.id))
      this.presets.push(newPreset)
      
      this.persistPresets()
      return id
    },

    // Delete a custom preset
    deletePreset(presetId: string): boolean {
      // Only allow deletion of custom presets
      if (builtInPresets.some(preset => preset.id === presetId)) {
        return false
      }
      
      const initialLength = this.presets.length
      this.presets = this.presets.filter(p => p.id !== presetId)
      
      if (this.presets.length < initialLength) {
        this.persistPresets()
        return true
      }
      return false
    },

    // Reset to default configuration
    resetToDefaults() {
      this.config = { ...defaultConfig }
      this.presets = [...builtInPresets]
      this.persistConfig()
      this.persistPresets()
    },

    // Persist configuration to localStorage
    persistConfig() {
      try {
        localStorage.setItem('matchConfig', JSON.stringify(this.config))
      } catch (error) {
        console.error('Error persisting match config:', error)
      }
    },

    // Persist presets to localStorage
    persistPresets() {
      try {
        // Only save custom presets
        const customPresets = this.presets.filter(preset => 
          !builtInPresets.some(builtin => builtin.id === preset.id)
        )
        localStorage.setItem('matchConfigPresets', JSON.stringify(customPresets))
      } catch (error) {
        console.error('Error persisting match config presets:', error)
      }
    },

    // Quick preset methods for backward compatibility
    setQualification() {
      this.applyPreset('qualification')
    },

    setBestOf3() {
      this.applyPreset('bestof3')
    },

    setBestOf5() {
      this.applyPreset('bestof5')
    }
  }
})

// Listen for storage changes (for multi-tab sync)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    const matchConfigStore = useMatchConfigStore()
    
    if (event.key === 'matchConfig' && event.newValue) {
      try {
        const newConfig = JSON.parse(event.newValue)
        matchConfigStore.config = newConfig
      } catch (error) {
        console.error('Error parsing match config from storage event:', error)
      }
    }
    
    if (event.key === 'matchConfigPresets' && event.newValue) {
      try {
        const customPresets = JSON.parse(event.newValue)
        matchConfigStore.presets = [...builtInPresets, ...customPresets]
      } catch (error) {
        console.error('Error parsing match config presets from storage event:', error)
      }
    }
  })
}
