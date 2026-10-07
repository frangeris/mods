export type Todo = { queue: string[]; done: string[] }

declare module 'claude-code' {
  interface PluginState {
    todo: { list: Todo | null; sent: number }
  }
}
