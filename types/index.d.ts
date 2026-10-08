export type Limits = { fiveLeft: number; fiveResetsAt?: string; weekLeft?: number }

declare module 'claude-code' {
  interface PluginState {
    'usage-footer': { limits: Limits | null }
  }
}
