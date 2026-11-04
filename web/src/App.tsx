import { useCallback, useEffect, useRef, useState } from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import { api } from './services/api'
import { errText, useApp } from './stores/appStore'
import { Button, ConfirmHost, ErrorState, Spinner, ToastHost, inputCls } from './components/ui'
import MainLayout from './layouts/MainLayout'
import DashboardPage from './pages/DashboardPage'
import DocumentsPage from './pages/DocumentsPage'
import ExercisesPage from './pages/ExercisesPage'
import SnippetsPage from './pages/SnippetsPage'
import TrashPage from './pages/TrashPage'
import BackupPage from './pages/BackupPage'
import SettingsPage from './pages/SettingsPage'
import SearchPage from './pages/SearchPage'
import ExamGeneratorPage from './pages/ExamGeneratorPage'
import { ArrowRight, Eye, EyeOff, KeyRound, Lock, ShieldCheck } from 'lucide-react'

function LockScreen({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const setAuth = useApp(s => s.setAuth)

  const submit = async () => {
    if (!pw || busy) return
    setBusy(true)
    setErr('')
    try {
      setAuth(await api.login(pw))
      onDone()
    } catch (e) {
      setErr(errText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative flex h-full min-h-screen w-full items-center justify-center overflow-hidden bg-slate-950 p-6 select-none">
      {/* Hiệu ứng ánh sáng nền mờ cao cấp */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-indigo-600/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-purple-600/20 blur-[120px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* Thẻ khóa bảo vệ */}
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-800/80 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl transition-all">
        {/* Logo và tiêu đề */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="relative mb-3.5">
            <img
              src="/app-icon.png"
              alt="TeachStash"
              className="h-16 w-16 rounded-2xl shadow-xl ring-1 ring-white/15"
            />
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md ring-2 ring-slate-900">
              <Lock className="h-3.5 w-3.5" />
            </div>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">TeachStash</h1>
          <p className="mt-0.5 text-xs text-slate-400">Kho giáo án Tin học · Bản ngoại tuyến</p>

          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
            <span>Ứng dụng đang được khóa</span>
          </div>
        </div>

        {/* Form nhập mật khẩu */}
        <form onSubmit={e => { e.preventDefault(); submit(); }} className="space-y-4">
          <div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <KeyRound className="h-4 w-4" />
              </div>
              <input
                type={showPw ? 'text' : 'password'}
                autoFocus
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-2.5 pl-9 pr-10 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500/25"
                placeholder="Nhập mật khẩu mở khóa..."
                value={pw}
                onChange={e => setPw(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200 transition-colors"
                title={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {err && (
              <p className="mt-2 text-xs font-medium text-rose-400 flex items-center gap-1">
                <span>✕</span> {err}
              </p>
            )}
          </div>

          <Button
            variant="primary"
            className="w-full justify-center py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all hover:shadow-indigo-600/50"
            loading={busy}
            disabled={!pw}
            type="submit"
          >
            <span>Mở khóa</span>
          </Button>
        </form>

        {/* Chân trang bảo mật */}
        <div className="mt-6 border-t border-slate-800/80 pt-4 text-center">
          <p className="text-[11px] text-slate-500">
            Dữ liệu được mã hóa & xác thực cục bộ (PBKDF2)
          </p>
        </div>
      </div>
    </div>
  )
}

function applyTheme(mode: string) {
  const dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

export default function App() {
  const { auth, setAuth, theme, setTheme, refreshLookups, lookups } = useApp()
  const [error, setError] = useState('')
  const [locked, setLocked] = useState(false)

  const boot = useCallback(async () => {
    setError('')
    try {
      const a = await api.authStatus()
      setAuth(a)
      setLocked(!a.isAuthenticated)
      if (a.isAuthenticated) {
        const s = await api.settings(); setTheme(s.theme)
        await refreshLookups()
      }
    } catch (e) { setError(errText(e)) }
  }, [setAuth, setTheme, refreshLookups])

  useEffect(() => { boot() }, [boot])
  useEffect(() => {
    applyTheme(theme)
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const h = () => theme === 'system' && applyTheme('system')
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [theme])
  useEffect(() => {
    const h = () => setLocked(true)
    window.addEventListener('gat-locked', h)
    return () => window.removeEventListener('gat-locked', h)
  }, [])

  // Tự khóa khi không thao tác
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => {
    const mins = auth?.autoLockMinutes ?? 0
    if (!auth?.passwordEnabled || mins <= 0 || locked) return
    const reset = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(async () => { await api.logout().catch(() => { }); setLocked(true) }, mins * 60_000) }
    const evs = ['mousemove', 'keydown', 'mousedown', 'wheel']
    evs.forEach(e => window.addEventListener(e, reset)); reset()
    return () => { evs.forEach(e => window.removeEventListener(e, reset)); window.clearTimeout(timer.current) }
  }, [auth, locked])

  if (error) return <ErrorState message={error} onRetry={boot} />
  if (!auth) return <Spinner label="Đang khởi động..." />
  if (locked) return <><LockScreen onDone={() => { setLocked(false); boot() }} /><ToastHost /></>
  if (!lookups) return <Spinner label="Đang tải dữ liệu..." />

  return (
    <>
      <Routes>
        <Route element={<MainLayout onLock={async () => { await api.logout().catch(() => { }); setLocked(true) }} />}>
          <Route index element={<DashboardPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="exercises" element={<ExercisesPage />} />
          <Route path="exam-generator" element={<ExamGeneratorPage />} />
          <Route path="snippets" element={<SnippetsPage />} />
          <Route path="trash" element={<TrashPage />} />
          <Route path="backup" element={<BackupPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <ConfirmHost />
      <ToastHost />
    </>
  )
}
