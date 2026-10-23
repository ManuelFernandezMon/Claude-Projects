import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.recipebox.personal',
  appName: 'recipe-box',
  webDir: 'dist',
  android: { allowMixedContent: false },
}

export default config
