import { useEffect, useRef, useState, type ReactNode, type ButtonHTMLAttributes } from 'react'
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Info, Loader2, X, XCircle } from 'lucide-react'
import { useApp } from '../stores/appStore'
import { splitTags, uniqueTags } from '../utils/format'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; size?: 'sm' | 'md'; loading?: boolean }
export function Button({ variant = 'secondary', size = 'md', loading, className, children, disabled, ...rest }: BtnProps) {
  const v = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  }[variant]
  return (
    <button {...rest} disabled={disabled || loading}
      className={cx('inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition disabled:opacity-50 disabled:cursor-not-allowed', size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-sm', v, className)}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}{children}
    </button>
  )
}

export const inputCls = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100'

export function Field({ label, error, required, children, hint }: { label: string; error?: string; required?: boolean; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">{label}{required && <span className="text-rose-500"> *</span>}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  )
}

export function Spinner({ label = 'Đang tải...' }: { label?: string }) {
  return <div className="flex items-center justify-center gap-2 py-16 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />{label}</div>
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <XCircle className="h-10 w-10 text-rose-500" />
      <p className="max-w-md text-slate-600 dark:text-slate-300">{message}</p>
      {onRetry && <Button onClick={onRetry}>Thử lại</Button>}
    </div>
  )
}

export function EmptyState({ title, text, action, icon }: { title: string; text?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo-50 text-indigo-500 dark:bg-indigo-950/50">
        {icon ?? (
          <svg viewBox="0 0 64 64" className="h-14 w-14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 20a4 4 0 0 1 4-4h14l5 6h21a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4Z" /><path d="M24 38h16M32 30v16" />
          </svg>
        )}
      </div>
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-100">{title}</h3>
      {text && <p className="max-w-md text-slate-500">{text}</p>}
      {action}
    </div>
  )
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', className ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}>{children}</span>
}

export function TagChips({ tags, onClick }: { tags: string[]; onClick?: (t: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map(t => (
        <button key={t} type="button" onClick={onClick ? () => onClick(t) : undefined}
          className={cx('rounded bg-indigo-50 px-1.5 py-0.5 text-xs text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300', onClick ? 'hover:bg-indigo-100' : 'cursor-default')}>#{t}</button>
      ))}
    </div>
  )
}

/** Modal: ESC đóng (qua onRequestClose để form có thể hỏi xác nhận nếu chưa lưu). */
export function Modal({ title, onRequestClose, children, footer, wide }: { title: string; onRequestClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' }) {
  const closeRef = useRef(onRequestClose)
  closeRef.current = onRequestClose
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])
  const widthCls = typeof wide === 'string'
    ? ({ sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-6xl', '2xl': 'max-w-2xl', '3xl': 'max-w-3xl' }[wide] ?? 'max-w-3xl')
    : wide ? 'max-w-3xl' : 'max-w-xl'
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={e => { if (e.target === e.currentTarget) onRequestClose() }}>
      <div role="dialog" aria-modal="true" className={cx('flex max-h-[92vh] w-full flex-col rounded-xl bg-white shadow-2xl dark:bg-slate-900', widthCls)}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-700">
          <h2 className="truncate text-base font-semibold">{title}</h2>
          <button onClick={onRequestClose} className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Đóng"><X className="h-5 w-5" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-700">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmHost() {
  const { confirmState, resolveConfirm } = useApp()
  useEffect(() => {
    if (!confirmState) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); resolveConfirm(false) } }
    window.addEventListener('keydown', h, true) // capture: chặn Modal bên dưới nhận ESC
    return () => window.removeEventListener('keydown', h, true)
  }, [confirmState, resolveConfirm])
  if (!confirmState) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl dark:bg-slate-900">
        <div className="flex gap-3">
          <AlertTriangle className={cx('h-6 w-6 shrink-0', confirmState.danger ? 'text-rose-500' : 'text-amber-500')} />
          <div><h3 className="font-semibold">{confirmState.title}</h3><p className="mt-1 whitespace-pre-line text-slate-600 dark:text-slate-300">{confirmState.message}</p></div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={() => resolveConfirm(false)}>Hủy</Button>
          <Button variant={confirmState.danger ? 'danger' : 'primary'} onClick={() => resolveConfirm(true)} autoFocus>{confirmState.confirmText}</Button>
        </div>
      </div>
    </div>
  )
}

export function ToastHost() {
  const { toasts, dismissToast } = useApp()
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={cx('pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2 text-sm shadow-lg',
          t.kind === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200'
            : t.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'
              : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200')}>
          {t.kind === 'error' ? <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> : t.kind === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <Info className="mt-0.5 h-4 w-4 shrink-0" />}
          <span className="flex-1 whitespace-pre-line selectable">{t.text}</span>
          <button onClick={() => dismissToast(t.id)}><X className="h-4 w-4 opacity-60" /></button>
        </div>
      ))}
    </div>
  )
}

export function Pagination({ page, pageSize, total, onChange }: { page: number; pageSize: number; total: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total <= pageSize) return null
  return (
    <div className="flex items-center justify-between px-1 py-3 text-sm text-slate-500">
      <span>Trang {page}/{pages} · {total} mục</span>
      <div className="flex gap-1">
        <Button size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft className="h-4 w-4" />Trước</Button>
        <Button size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>Sau<ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  )
}

/** Nhập thẻ: gõ rồi Enter hoặc dấu phẩy; dán chuỗi "a, b, c" cũng được. Tự loại trùng (không phân biệt hoa/thường). */
export function TagInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState('')
  const commit = (raw: string) => {
    const add = splitTags(raw)
    if (add.length) onChange(uniqueTags([...value, ...add]).slice(0, 20))
    setText('')
  }
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/30 dark:border-slate-600 dark:bg-slate-800">
      {value.map(t => (
        <span key={t} className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-xs text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
          {t}<button type="button" onClick={() => onChange(value.filter(x => x !== t))}><X className="h-3 w-3" /></button>
        </span>
      ))}
      <input value={text} placeholder={value.length ? '' : 'Python, Vòng lặp, Lớp 10...'}
        onChange={e => { const v = e.target.value; if (/[,;]/.test(v)) commit(v); else setText(v) }}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(text) } else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1)) }}
        onBlur={() => commit(text)}
        className="min-w-[8rem] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none" />
    </div>
  )
}

/** Chọn khối → chủ đề → bài học (lọc theo cấp cha). */
export function CategoryPicker({ grade, topic, lesson, onChange, errors }: {
  grade: number | null; topic: number | null; lesson: number | null
  onChange: (v: { gradeLevelId: number | null; topicId: number | null; lessonId: number | null }) => void
  errors?: Record<string, string>
}) {
  const lookups = useApp(s => s.lookups)
  if (!lookups) return null
  const topics = lookups.topics.filter(t => grade == null || t.gradeLevelId == null || t.gradeLevelId === grade)
  const lessons = lookups.lessons.filter(l => l.topicId === topic)
  const num = (v: string) => (v ? Number(v) : null)
  return (
    <div className="grid grid-cols-3 gap-3">
      <Field label="Khối lớp" error={errors?.gradeLevelId}>
        <select className={inputCls} value={grade ?? ''} onChange={e => onChange({ gradeLevelId: num(e.target.value), topicId: null, lessonId: null })}>
          <option value="">Không xác định</option>{lookups.gradeLevels.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </Field>
      <Field label="Chủ đề" error={errors?.topicId}>
        <select className={inputCls} value={topic ?? ''} onChange={e => onChange({ gradeLevelId: grade, topicId: num(e.target.value), lessonId: null })}>
          <option value="">— Chưa chọn —</option>{topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </Field>
      <Field label="Bài học" error={errors?.lessonId}>
        <select className={inputCls} value={lesson ?? ''} disabled={!topic} onChange={e => onChange({ gradeLevelId: grade, topicId: topic, lessonId: num(e.target.value) })}>
          <option value="">— Chưa chọn —</option>{lessons.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </Field>
    </div>
  )
}

export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t) }, [value, ms])
  return v
}
