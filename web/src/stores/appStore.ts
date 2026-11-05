import { create } from 'zustand'
import { api } from '../services/api'
import type { AuthStatus, Lookups } from '../types'

export type ThemeMode = 'system' | 'light' | 'dark'
export interface Toast { id: number; kind: 'success' | 'error' | 'info'; text: string }
interface ConfirmState { message: string; title: string; confirmText: string; danger: boolean; resolve: (v: boolean) => void }

interface AppState {
  lookups: Lookups | null
  auth: AuthStatus | null
  theme: ThemeMode
  toasts: Toast[]
  confirmState: ConfirmState | null
  refreshLookups: () => Promise<void>
  setAuth: (a: AuthStatus | null) => void
  setTheme: (t: ThemeMode) => void
  toast: (kind: Toast['kind'], text: string) => void
  dismissToast: (id: number) => void
  confirm: (message: string, opts?: { title?: string; confirmText?: string; danger?: boolean }) => Promise<boolean>
  resolveConfirm: (v: boolean) => void
}

let toastId = 1
export const useApp = create<AppState>((set, get) => ({
  lookups: null,
  auth: null,
  theme: 'system',
  toasts: [],
  confirmState: null,
  refreshLookups: async () => set({ lookups: await api.lookups() }),
  setAuth: auth => set({ auth }),
  setTheme: theme => set({ theme }),
  toast: (kind, text) => {
    const id = toastId++
    set(s => ({ toasts: [...s.toasts, { id, kind, text }] }))
    setTimeout(() => get().dismissToast(id), kind === 'error' ? 7000 : 3500)
  },
  dismissToast: id => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
  confirm: (message, opts) => new Promise<boolean>(resolve =>
    set({ confirmState: { message, title: opts?.title ?? 'Xác nhận', confirmText: opts?.confirmText ?? 'Đồng ý', danger: opts?.danger ?? false, resolve } })),
  resolveConfirm: v => { get().confirmState?.resolve(v); set({ confirmState: null }) },
}))

export const errText = (e: unknown) => {
  if (e && typeof e === 'object') {
    const anyE = e as any
    if (anyE.errors && typeof anyE.errors === 'object') {
      const msgs = Object.values(anyE.errors).flat().filter(Boolean)
      if (msgs.length > 0) return msgs.join(' ')
    }
    if (typeof anyE.message === 'string') return anyE.message
  }
  return e instanceof Error ? e.message : 'Đã xảy ra lỗi.'
}
