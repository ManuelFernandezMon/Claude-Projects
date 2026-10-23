import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.recipebox.personal',
  appName: 'recipe-box',
  webDir: 'dist',
  backgroundColor: '#0b0b0c',
  android: { allowMixedContent: false },
  plugins: {
    // Light status/navigation bar icons on the always-dark UI.
    SystemBars: { style: 'DARK' },
  },
}

export default config
