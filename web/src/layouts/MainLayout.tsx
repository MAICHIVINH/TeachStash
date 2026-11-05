import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpen, CalendarCheck, ClipboardCheck, Code2, DatabaseBackup, FileText, FolderOpen, GraduationCap, History, LayoutDashboard, Library, ListChecks, Lock, Moon, PanelLeftClose, PanelLeftOpen, Presentation, Search, Settings, Shuffle, Sun, Trash2, X, Sparkles, type LucideIcon } from 'lucide-react'
import { useApp } from '../stores/appStore'
import { api } from '../services/api'
import { cx } from '../components/ui'
import { AiAssistantDrawer } from '../features/ai/AiAssistantDrawer'

const SEARCH_HISTORY_KEY = 'teachstash_search_history'
const MAX_HISTORY = 8

function getStoredHistory(): string[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(x => typeof x === 'string' && x.trim()) : []
  } catch {
    return []
  }
}

function saveStoredHistory(history: string[]) {
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history))
  } catch { /* ignore */ }
}

interface NavItem { to: string; label: string; icon: LucideIcon; exact?: boolean; type?: string }
const groups: { title: string; items: NavItem[] }[] = [
  { title: 'TỔNG QUAN', items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true }] },
  {
    title: 'KẾ HOẠCH & TIẾN ĐỘ', items: [
      { to: '/teaching-plan', label: 'Kế hoạch dạy học (PPCT)', icon: CalendarCheck, exact: true },
    ]
  },
  {
    title: 'QUẢN LÝ TÀI LIỆU', items: [
      { to: '/documents', label: 'Tất cả tài liệu', icon: FolderOpen, exact: true },
      { to: '/documents?type=1', label: 'Giáo án', icon: FileText, type: '1' },
      { to: '/documents?type=2', label: 'Bài giảng', icon: Presentation, type: '2' },
      { to: '/documents?type=7', label: 'Phiếu học tập', icon: ClipboardCheck, type: '7' },
      { to: '/documents?type=6', label: 'Tài liệu tham khảo', icon: BookOpen, type: '6' },
    ]
  },
  {
    title: 'NGÂN HÀNG HỌC LIỆU', items: [
      { to: '/exercises', label: 'Bài tập', icon: ListChecks },
      { to: '/exam-generator', label: 'Trộn đề kiểm tra', icon: Shuffle },
      { to: '/snippets', label: 'Ngân hàng mã nguồn', icon: Code2 },
      { to: '/documents?type=4', label: 'Đề kiểm tra', icon: Library, type: '4' },
    ]
  },
  {
    title: 'HỆ THỐNG', items: [
      { to: '/trash', label: 'Thùng rác', icon: Trash2 },
      { to: '/backup', label: 'Sao lưu & phục hồi', icon: DatabaseBackup },
      { to: '/settings', label: 'Cài đặt', icon: Settings },
    ]
  },
]

export default function MainLayout({ onLock }: { onLock: () => void }) {
  const { theme, setTheme, auth } = useApp()
  const nav = useNavigate()
  const loc = useLocation()
  const [params] = useSearchParams()
  const [q, setQ] = useState('')
  const [history, setHistory] = useState<string[]>(getStoredHistory)
  const [showHistory, setShowHistory] = useState(false)
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('teachstash_sidebar_collapsed') === 'true'
    } catch {
      return false
    }
  })

  const toggleSidebar = () => {
    setCollapsed(prev => {
      const next = !prev
      try {
        localStorage.setItem('teachstash_sidebar_collapsed', String(next))
      } catch { /* ignore */ }
      return next
    })
  }

  useEffect(() => { if (!loc.pathname.startsWith('/search')) setQ('') }, [loc.pathname])
  const curType = loc.pathname === '/documents' ? params.get('type') : null

  const addSearch = (term: string) => {
    const clean = term.trim()
    if (!clean) return
    const next = [clean, ...history.filter(h => h.toLowerCase() !== clean.toLowerCase())].slice(0, MAX_HISTORY)
    setHistory(next)
    saveStoredHistory(next)
    setShowHistory(false)
    nav(`/search?q=${encodeURIComponent(clean)}`)
  }

  const removeHistoryItem = (e: React.MouseEvent, item: string) => {
    e.stopPropagation()
    const next = history.filter(h => h !== item)
    setHistory(next)
    saveStoredHistory(next)
  }

  const clearAllHistory = (e: React.MouseEvent) => {
    e.stopPropagation()
    setHistory([])
    saveStoredHistory([])
    setShowHistory(false)
  }

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        setShowHistory(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowHistory(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  const toggleTheme = async () => {
    const dark = document.documentElement.classList.contains('dark')
    const next = dark ? 'light' : 'dark'
    setTheme(next)
    api.updateSettings({ theme: next }).catch(() => { })
  }

  return (
    <div className="flex h-full">
      <aside
        className={cx(
          'flex shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 ease-in-out dark:border-slate-800 dark:bg-slate-900',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        <div className={cx(
          'flex items-center border-b border-slate-100 py-3.5 dark:border-slate-800',
          collapsed ? 'flex-col gap-2 px-2' : 'justify-between px-3.5'
        )}>
          <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
            <img src="/app-icon.png" alt="TeachStash" className="h-7 w-7 shrink-0 rounded-lg shadow-sm" />
            {!collapsed && (
              <div className="leading-tight truncate">
                <span className="text-sm font-extrabold tracking-wide text-indigo-700 dark:text-indigo-300">TEACHSTASH</span>
                <div className="text-[10px] font-medium text-slate-400 truncate">Kho giáo án Tin học</div>
              </div>
            )}
          </div>

        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
          {groups.map((g, gIdx) => (
            <div key={g.title} className="mb-3">
              {collapsed ? (
                gIdx > 0 && <div className="my-2 border-t border-slate-100 dark:border-slate-800" />
              ) : (
                <div className="px-3 pb-1 pt-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase truncate">
                  {g.title}
                </div>
              )}
              {g.items.map(it => {
                const Icon = it.icon
                const isDoc = it.to.startsWith('/documents')
                const active = isDoc ? loc.pathname === '/documents' && (curType ?? '') === (it.type ?? '') : undefined
                return (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={!!it.exact}
                    title={collapsed ? it.label : undefined}
                    className={({ isActive }) =>
                      cx(
                        'mb-0.5 flex items-center rounded-lg text-sm transition',
                        collapsed
                          ? 'justify-center p-2.5'
                          : 'gap-2.5 px-3 py-2',
                        (active ?? isActive)
                          ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                      )
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{it.label}</span>}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-100 px-2 py-3 text-center text-[11px] leading-relaxed text-slate-400 dark:border-slate-800/80 dark:text-slate-500">
          {collapsed ? (
            <span className="font-semibold text-slate-400" title="TeachStash v1.0.0 - Mai Chí Vĩnh">v1.0</span>
          ) : (
            <>
              <div className="font-medium text-slate-500 dark:text-slate-400">Phiên bản 1.0.0</div>
              <div className="truncate">@2026 - Mai Chí Vĩnh</div>
            </>
          )}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-2.5 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={toggleSidebar}
            title={collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition shrink-0"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
          <form
            ref={formRef}
            className="relative max-w-xl flex-1"
            onSubmit={e => {
              e.preventDefault()
              if (q.trim()) addSearch(q)
            }}
          >
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              onFocus={() => {
                if (history.length > 0) setShowHistory(true)
              }}
              placeholder="Tìm nhanh tài liệu, bài tập, mã nguồn... (có dấu hoặc không dấu)"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-slate-800"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                title="Xóa chữ"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {showHistory && history.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-1 flex items-center justify-between px-2.5 py-1 text-xs">
                  <span className="font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Lịch sử tìm kiếm
                  </span>
                  <button
                    type="button"
                    onClick={clearAllHistory}
                    className="text-xs font-medium text-rose-500 hover:text-rose-600 hover:underline"
                  >
                    Xóa tất cả
                  </button>
                </div>
                <div className="space-y-0.5">
                  {history.map(item => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setQ(item)
                        addSearch(item)
                      }}
                      className="group flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition select-none"
                    >
                      <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 pr-2">
                        <History className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                        <span className="truncate">{item}</span>
                      </div>
                      <span
                        role="button"
                        onClick={e => removeHistoryItem(e, item)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-rose-600 dark:hover:bg-slate-700 transition"
                        title="Xóa từ khóa này"
                      >
                        <X className="h-3.5 w-3.5" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setAiDrawerOpen(true)}
              title="Trợ lý AI Soạn bài (Gemini)"
              className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50/80 to-purple-50/80 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 shadow-xs hover:border-indigo-300 hover:from-indigo-100 hover:to-purple-100 dark:border-indigo-800/80 dark:from-indigo-950/60 dark:to-purple-950/40 dark:text-indigo-300 dark:hover:border-indigo-700 transition"
            >
              <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
              <span className="hidden sm:inline">Trợ lý AI</span>
            </button>
            <button onClick={toggleTheme} title="Đổi giao diện sáng/tối" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              <Sun className="hidden h-5 w-5 dark:block" /><Moon className="h-5 w-5 dark:hidden" />
            </button>
            {auth?.passwordEnabled && <button onClick={onLock} title="Khóa ứng dụng" className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><Lock className="h-5 w-5" /></button>}
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto p-5"><Outlet /></main>
      </div>

      <AiAssistantDrawer open={aiDrawerOpen} onClose={() => setAiDrawerOpen(false)} />
    </div>
  )
}
