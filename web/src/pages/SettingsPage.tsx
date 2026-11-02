import { useEffect, useState } from 'react'
import { Check, ChevronDown, ChevronUp, Copy, HardDrive, KeyRound, Layers, Lock, Monitor, Moon, Pencil, Plus, ShieldCheck, Sun, Trash2, Unlink } from 'lucide-react'
import { api } from '../services/api'
import { errText, useApp, type ThemeMode } from '../stores/appStore'
import { Badge, Button, Field, Modal, Spinner, inputCls } from '../components/ui'
import type { Settings } from '../types'
import { formatBytes } from '../utils/format'

function Card({
  title,
  icon: Icon,
  description,
  action,
  children,
}: {
  title: string
  icon?: React.ComponentType<{ className?: string }>
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div>
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
            {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Categories() {
  const { lookups, refreshLookups, confirm, toast } = useApp()
  const [expandedGradeId, setExpandedGradeId] = useState<number | 'common' | null>(() => {
    return lookups?.gradeLevels?.[0]?.id ?? 10
  })
  const [dlg, setDlg] = useState<{
    kind: 'topic' | 'lesson'
    id: number | null
    name: string
    grade: number | null
    topicId: number | null
    sort: number
  } | null>(null)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (!dlg) return
    if (!dlg.name.trim()) {
      toast('error', 'Vui lòng nhập tên.')
      return
    }
    setBusy(true)
    try {
      if (dlg.kind === 'topic') {
        await api.saveTopic(dlg.id, { name: dlg.name, gradeLevelId: dlg.grade, sortOrder: dlg.sort })
      } else {
        await api.saveLesson(dlg.id, { name: dlg.name, topicId: dlg.topicId!, sortOrder: dlg.sort })
      }
      await refreshLookups()
      setDlg(null)
      toast('success', `${dlg.id ? 'Cập nhật' : 'Thêm'} thành công.`)
    } catch (e) {
      toast('error', errText(e))
    } finally {
      setBusy(false)
    }
  }

  const del = async (kind: 'topic' | 'lesson', id: number, name: string) => {
    if (
      !(await confirm(`Xóa ${kind === 'topic' ? 'chủ đề (và các bài học bên trong)' : 'bài học'} "${name}"?`, {
        confirmText: 'Xóa',
        danger: true,
      }))
    )
      return
    try {
      kind === 'topic' ? await api.deleteTopic(id) : await api.deleteLesson(id)
      await refreshLookups()
      toast('success', `Đã xóa ${kind === 'topic' ? 'chủ đề' : 'bài học'}.`)
    } catch (e) {
      toast('error', errText(e))
    }
  }

  const topics = lookups?.topics ?? []
  const lessons = lookups?.lessons ?? []
  const gradeLevels = lookups?.gradeLevels ?? []

  const hasCommonTopics = topics.some(t => t.gradeLevelId == null)

  const groups: Array<{
    id: number | 'common'
    name: string
    gradeId: number | null
    topics: typeof topics
    lessonsCount: number
  }> = [
      ...gradeLevels.map(g => {
        const gTopics = topics.filter(t => t.gradeLevelId === g.id)
        const gLessonsCount = gTopics.reduce(
          (sum, t) => sum + lessons.filter(l => l.topicId === t.id).length,
          0
        )
        return {
          id: g.id,
          name: g.name,
          gradeId: g.id,
          topics: gTopics,
          lessonsCount: gLessonsCount,
        }
      }),
      ...(hasCommonTopics
        ? [
          {
            id: 'common' as const,
            name: 'Dùng chung / Mọi khối lớp',
            gradeId: null,
            topics: topics.filter(t => t.gradeLevelId == null),
            lessonsCount: topics
              .filter(t => t.gradeLevelId == null)
              .reduce((sum, t) => sum + lessons.filter(l => l.topicId === t.id).length, 0),
          },
        ]
        : []),
    ]

  const activeGradeIdForNewTopic = typeof expandedGradeId === 'number' ? expandedGradeId : null

  return (
    <Card
      title="Chủ đề và bài học giảng dạy"
      icon={Layers}
      description="Cấu hình hệ thống bài giảng, chủ đề phân theo từng khối lớp hoặc bộ sách"
      action={
        <Button
          variant="primary"
          size="sm"
          onClick={() =>
            setDlg({
              kind: 'topic',
              id: null,
              name: '',
              grade: activeGradeIdForNewTopic,
              topicId: null,
              sort: topics.length + 1,
            })
          }
        >
          <Plus className="h-4 w-4" />
          Thêm chủ đề mới
        </Button>
      }
    >
      <div className="space-y-3">
        {groups.map(group => {
          const isExpanded = expandedGradeId === group.id
          return (
            <div
              key={group.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs transition dark:border-slate-800 dark:bg-slate-900"
            >
              <div
                onClick={() => setExpandedGradeId(prev => (prev === group.id ? null : group.id))}
                className="flex cursor-pointer items-center justify-between gap-3 bg-slate-50/80 px-4 py-3 transition hover:bg-slate-100/70 select-none dark:bg-slate-800/40 dark:hover:bg-slate-800/70"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`text-slate-400 transition-colors ${isExpanded ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{group.name}</span>
                  <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
                    {group.topics.length} chủ đề · {group.lessonsCount} bài học
                  </Badge>
                </div>
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      setDlg({
                        kind: 'topic',
                        id: null,
                        name: '',
                        grade: group.gradeId,
                        topicId: null,
                        sort: group.topics.length + 1,
                      })
                    }
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Thêm chủ đề
                  </Button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-200/70 p-4 dark:border-slate-800">
                  {group.topics.length === 0 ? (
                    <div className="py-6 text-center text-sm text-slate-400">
                      Chưa có chủ đề nào cho {group.name}. Nhấn{' '}
                      <button
                        type="button"
                        className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                        onClick={() =>
                          setDlg({
                            kind: 'topic',
                            id: null,
                            name: '',
                            grade: group.gradeId,
                            topicId: null,
                            sort: 1,
                          })
                        }
                      >
                        "Thêm chủ đề"
                      </button>{' '}
                      để bắt đầu phân loại giáo án.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {group.topics.map(t => {
                        const topicLessons = lessons.filter(l => l.topicId === t.id)
                        return (
                          <div
                            key={t.id}
                            className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 transition dark:border-slate-800 dark:bg-slate-800/40"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5 dark:border-slate-700/60">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-800 dark:text-slate-100">{t.name}</span>
                                <span className="text-xs text-slate-400">({topicLessons.length} bài học)</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    setDlg({
                                      kind: 'lesson',
                                      id: null,
                                      name: '',
                                      grade: null,
                                      topicId: t.id,
                                      sort: topicLessons.length + 1,
                                    })
                                  }
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Thêm bài học
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    setDlg({
                                      kind: 'topic',
                                      id: t.id,
                                      name: t.name,
                                      grade: t.gradeLevelId,
                                      topicId: null,
                                      sort: t.sortOrder,
                                    })
                                  }
                                  title="Sửa chủ đề"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => del('topic', t.id, t.name)}
                                  title="Xóa chủ đề"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                                </Button>
                              </div>
                            </div>

                            {topicLessons.length === 0 ? (
                              <p className="pt-2 text-xs italic text-slate-400">Chưa có bài học nào trong chủ đề này.</p>
                            ) : (
                              <div className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                {topicLessons.map(l => (
                                  <div
                                    key={l.id}
                                    className="group flex items-center justify-between rounded-md border border-slate-200/50 bg-white px-3 py-1.5 text-xs transition hover:border-slate-300 dark:border-slate-700/50 dark:bg-slate-800"
                                  >
                                    <span className="truncate text-slate-700 dark:text-slate-200" title={l.name}>
                                      &bull; {l.name}
                                    </span>
                                    <div className="ml-2 flex shrink-0 items-center gap-1 opacity-80 group-hover:opacity-100">
                                      <button
                                        onClick={() =>
                                          setDlg({
                                            kind: 'lesson',
                                            id: l.id,
                                            name: l.name,
                                            grade: null,
                                            topicId: l.topicId,
                                            sort: l.sortOrder,
                                          })
                                        }
                                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
                                        title="Sửa bài học"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </button>
                                      <button
                                        onClick={() => del('lesson', l.id, l.name)}
                                        className="rounded p-1 text-rose-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50"
                                        title="Xóa bài học"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {dlg && (
        <Modal
          title={`${dlg.id ? 'Chỉnh sửa' : 'Thêm mới'} ${dlg.kind === 'topic' ? 'chủ đề' : 'bài học'}`}
          onRequestClose={() => setDlg(null)}
          footer={
            <>
              <Button onClick={() => setDlg(null)}>Hủy bỏ</Button>
              <Button variant="primary" loading={busy} onClick={save}>
                Lưu lại
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Tên gọi" required>
              <input
                autoFocus
                className={inputCls}
                value={dlg.name}
                placeholder={dlg.kind === 'topic' ? 'Ví dụ: Cấu trúc lặp' : 'Ví dụ: Bài 10 - Vòng lặp For'}
                onChange={e => setDlg({ ...dlg, name: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && save()}
              />
            </Field>
            {dlg.kind === 'topic' && (
              <Field label="Khối lớp áp dụng">
                <select
                  className={inputCls}
                  value={dlg.grade ?? ''}
                  onChange={e => setDlg({ ...dlg, grade: e.target.value ? Number(e.target.value) : null })}
                >
                  <option value="">Áp dụng cho mọi khối</option>
                  {(lookups?.gradeLevels ?? []).map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {dlg.kind === 'lesson' && (
              <Field label="Thuộc chủ đề">
                <select
                  className={inputCls}
                  value={dlg.topicId ?? ''}
                  onChange={e => setDlg({ ...dlg, topicId: Number(e.target.value) })}
                >
                  {topics.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.gradeLevelId ? `(Lớp ${t.gradeLevelId})` : ''}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Thứ tự hiển thị (Số nhỏ đứng trước)">
              <input
                type="number"
                className={inputCls}
                value={dlg.sort}
                onChange={e => setDlg({ ...dlg, sort: Number(e.target.value) })}
              />
            </Field>
          </div>
        </Modal>
      )}
    </Card>
  )
}

function Security({ s, reload }: { s: Settings; reload: () => void }) {
  const { auth, setAuth, toast } = useApp()
  const [setupPw, setSetupPw] = useState('')
  const [setupPw2, setSetupPw2] = useState('')

  // Đổi mật khẩu
  const [changeCur, setChangeCur] = useState('')
  const [changeNew, setChangeNew] = useState('')
  const [changeNew2, setChangeNew2] = useState('')

  // Tự khóa
  const [mins, setMins] = useState(s.autoLockMinutes)

  // Tắt mật khẩu
  const [disablePw, setDisablePw] = useState('')

  const refresh = async () => setAuth(await api.authStatus())

  const handleSetup = async () => {
    if (setupPw.length < 4) {
      toast('error', 'Mật khẩu tối thiểu 4 ký tự.')
      return
    }
    if (setupPw !== setupPw2) {
      toast('error', 'Mật khẩu xác nhận không khớp.')
      return
    }
    try {
      await api.setup(setupPw)
      toast('success', 'Đã bật bảo vệ bằng mật khẩu.')
      setSetupPw('')
      setSetupPw2('')
      await refresh()
      reload()
    } catch (e) {
      toast('error', errText(e))
    }
  }

  const handleChangePassword = async () => {
    if (!changeCur) {
      toast('error', 'Vui lòng nhập mật khẩu hiện tại.')
      return
    }
    if (changeNew.length < 4) {
      toast('error', 'Mật khẩu mới tối thiểu 4 ký tự.')
      return
    }
    if (changeNew !== changeNew2) {
      toast('error', 'Mật khẩu mới xác nhận không khớp.')
      return
    }
    try {
      await api.changePassword(changeCur, changeNew)
      toast('success', 'Đã đổi mật khẩu thành công.')
      setChangeCur('')
      setChangeNew('')
      setChangeNew2('')
      await refresh()
      reload()
    } catch (e) {
      toast('error', errText(e))
    }
  }

  const handleUpdateLock = async () => {
    try {
      await api.updateSettings({ autoLockMinutes: mins })
      toast('success', 'Đã lưu thời gian tự động khóa.')
      await refresh()
      reload()
    } catch (e) {
      toast('error', errText(e))
    }
  }

  const handleDisablePassword = async () => {
    if (!disablePw) {
      toast('error', 'Vui lòng nhập mật khẩu để xác nhận tắt.')
      return
    }
    try {
      await api.disablePassword(disablePw)
      toast('success', 'Đã tắt bảo vệ mật khẩu thành công.')
      setDisablePw('')
      await refresh()
      reload()
    } catch (e) {
      toast('error', errText(e))
    }
  }

  return (
    <Card
      title="Bảo mật & Khóa ứng dụng"
      icon={ShieldCheck}
      description="Quản lý mã khóa bảo vệ cục bộ, ngăn người ngoài truy cập khi dùng chung máy tính"
    >
      {!auth?.passwordEnabled ? (
        <div className="max-w-md space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Chưa đặt mật khẩu</Badge>
            <span className="text-xs text-slate-500">Ứng dụng đang mở trực tiếp khi khởi động</span>
          </div>
          <p className="text-xs text-slate-500">
            Đặt mật khẩu để khóa ứng dụng khi không ngồi cạnh máy tính (dữ liệu được băm PBKDF2 an toàn cục bộ).
          </p>
          <div className="space-y-2">
            <input
              type="password"
              className={inputCls}
              placeholder="Mật khẩu mới (tối thiểu 4 ký tự)"
              value={setupPw}
              onChange={e => setSetupPw(e.target.value)}
            />
            <input
              type="password"
              className={inputCls}
              placeholder="Nhập lại mật khẩu để xác nhận"
              value={setupPw2}
              onChange={e => setSetupPw2(e.target.value)}
            />
          </div>
          <Button
            variant="primary"
            disabled={setupPw.length < 4 || setupPw !== setupPw2}
            onClick={handleSetup}
          >
            <Lock className="h-4 w-4" />
            Bật bảo vệ mật khẩu
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Cột 1: Đổi mật khẩu */}
          <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Đổi mật khẩu</h3>
              </div>
              <p className="mb-3 text-xs text-slate-500">Cập nhật mật khẩu đăng nhập của bạn</p>
              <div className="space-y-2">
                <input
                  type="password"
                  className={inputCls}
                  placeholder="Mật khẩu hiện tại"
                  value={changeCur}
                  onChange={e => setChangeCur(e.target.value)}
                />
                <input
                  type="password"
                  className={inputCls}
                  placeholder="Mật khẩu mới (≥ 4 ký tự)"
                  value={changeNew}
                  onChange={e => setChangeNew(e.target.value)}
                />
                <input
                  type="password"
                  className={inputCls}
                  placeholder="Xác nhận mật khẩu mới"
                  value={changeNew2}
                  onChange={e => setChangeNew2(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
              <Button
                variant="primary"
                size="sm"
                className="w-full"
                disabled={!changeCur || changeNew.length < 4 || changeNew !== changeNew2}
                onClick={handleChangePassword}
              >
                Cập nhật mật khẩu
              </Button>
            </div>
          </div>

          {/* Cột 2: Tự động khóa */}
          <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Lock className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Tự động khóa</h3>
              </div>
              <p className="mb-3 text-xs text-slate-500">Tự khóa ứng dụng sau khoảng thời gian không có thao tác</p>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={720}
                    className={inputCls}
                    value={mins}
                    onChange={e => setMins(Number(e.target.value))}
                  />
                  <span className="shrink-0 text-xs text-slate-600 dark:text-slate-400">phút</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[0, 5, 15, 30, 60].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMins(m)}
                      className={`rounded px-2 py-0.5 text-xs transition ${mins === m
                          ? 'bg-indigo-600 text-white font-medium'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                    >
                      {m === 0 ? 'Không khóa' : `${m}p`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
              <Button size="sm" className="w-full" onClick={handleUpdateLock}>
                Lưu cài đặt tự khóa
              </Button>
            </div>
          </div>

          {/* Cột 3: Tắt mật khẩu */}
          <div className="flex flex-col justify-between rounded-lg border border-rose-100 bg-rose-50/30 p-4 dark:border-rose-900/40 dark:bg-rose-950/20">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Unlink className="h-4 w-4 text-rose-500" />
                <h3 className="text-sm font-semibold text-rose-900 dark:text-rose-200">Tắt bảo vệ mật khẩu</h3>
              </div>
              <p className="mb-3 text-xs text-rose-700/80 dark:text-rose-300/80">
                Khi tắt, ứng dụng sẽ mở thẳng không yêu cầu mật khẩu
              </p>
              <input
                type="password"
                className={inputCls}
                placeholder="Nhập mật khẩu hiện tại"
                value={disablePw}
                onChange={e => setDisablePw(e.target.value)}
              />
            </div>
            <div className="mt-4 pt-3 border-t border-rose-200/60 dark:border-rose-900/60">
              <Button
                variant="danger"
                size="sm"
                className="w-full"
                disabled={!disablePw}
                onClick={handleDisablePassword}
              >
                Tắt bảo vệ mật khẩu
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

export default function SettingsPage() {
  const { theme, setTheme, toast } = useApp()
  const [s, setS] = useState<Settings | null>(null)
  const [extra, setExtra] = useState('')
  const [copied, setCopied] = useState(false)

  const load = () =>
    api
      .settings()
      .then(r => {
        setS(r)
        setExtra(r.extraExtensions)
      })
      .catch(e => toast('error', errText(e)))

  useEffect(() => {
    load()
  }, [])

  if (!s) return <Spinner />

  const changeTheme = async (t: ThemeMode) => {
    setTheme(t)
    try {
      await api.updateSettings({ theme: t })
    } catch (e) {
      toast('error', errText(e))
    }
  }

  const saveExtra = async () => {
    try {
      const r = await api.updateSettings({ extraExtensions: extra })
      setS(r)
      setExtra(r.extraExtensions)
      toast('success', 'Đã lưu các định dạng tệp bổ sung.')
    } catch (e) {
      toast('error', errText(e))
    }
  }

  const clean = async () => {
    try {
      const r = await api.cleanOrphans()
      toast('success', `Đã dọn dẹp ${r.filesDeleted} tệp mồ côi (${formatBytes(r.bytesFreed)}).`)
    } catch (e) {
      toast('error', errText(e))
    }
  }

  const copyPath = () => {
    navigator.clipboard.writeText(s.dataRoot)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast('success', 'Đã sao chép đường dẫn thư mục dữ liệu.')
  }

  return (
    <div className="space-y-6">
      {/* Tiêu đề trang */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Cài đặt hệ thống</h1>
        <p className="text-sm text-slate-500">Tùy chỉnh giao diện, cấu trúc bài học, bảo mật mật khẩu và lưu trữ tệp tin.</p>
      </div>

      {/* Grid 2 cột: Giao diện & Thư mục lưu trữ */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Card: Giao diện */}
        <Card
          title="Chế độ giao diện"
          icon={Sun}
          description="Lựa chọn tông màu sáng, tối hoặc đồng bộ theo Windows"
        >
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { id: 'system', label: 'Theo Windows', icon: Monitor },
              { id: 'light', label: 'Giao diện Sáng', icon: Sun },
              { id: 'dark', label: 'Giao diện Tối', icon: Moon },
            ].map(item => {
              const active = theme === item.id
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => changeTheme(item.id as ThemeMode)}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-3.5 text-center transition ${active
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 shadow-sm dark:border-indigo-500 dark:bg-indigo-950/70 dark:text-indigo-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                >
                  <Icon className={`h-5 w-5 ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                  <span className="text-xs font-medium">{item.label}</span>
                </button>
              )
            })}
          </div>
        </Card>

        {/* Card: Dữ liệu */}
        <Card
          title="Kho lưu trữ dữ liệu"
          icon={HardDrive}
          description="Vị trí cố định lưu trữ cơ sở dữ liệu, giáo án và tệp tin"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Đường dẫn thư mục hiện tại:</span>
              <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                Ổ đĩa cố định
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-800 selectable dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {s.dataRoot}
              </div>
              <Button size="sm" onClick={copyPath} title="Sao chép đường dẫn">
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                <span className="hidden sm:inline">Sao chép</span>
              </Button>
            </div>
            <p className="text-[11px] text-slate-400">
              Mọi dữ liệu (tệp đính kèm, SQLite db, backups, logs, webview2) đều được tự động đồng bộ tại đây.
            </p>
          </div>
        </Card>
      </div>

      {/* Quản lý danh mục, bài học */}
      <Categories />

      {/* Bảo mật */}
      <Security s={s} reload={load} />

      {/* Tệp đính kèm & Bộ nhớ */}
      <Card
        title="Quản lý tệp đính kèm & Bộ nhớ"
        icon={HardDrive}
        description="Quy định dung lượng tối đa và các loại đuôi tệp cho phép tải lên"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-600 dark:text-slate-300">
              Dung lượng tối đa cho mỗi tệp:{' '}
              <strong className="text-indigo-600 dark:text-indigo-400">{s.maxFileSizeMb} MB</strong>
            </span>
            <span className="text-slate-400">Đuôi thực thi (.exe, .bat, .ps1...) luôn bị chặn vì an toàn.</span>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Các định dạng tệp tin đang được hỗ trợ:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {s.allowedExtensions.map(e => (
                <span
                  key={e}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  .{e}
                </span>
              ))}
            </div>
          </div>

          <Field
            label="Thêm định dạng tệp bổ sung"
            hint="Nhập các đuôi tệp cách nhau bằng dấu phẩy (Ví dụ: sb3, ipynb, pas, cpp, java)"
          >
            <div className="flex max-w-md items-center gap-2">
              <input
                className={`${inputCls} min-w-0`}
                placeholder="Ví dụ: sb3, ipynb, odt, cpp"
                value={extra}
                onChange={e => setExtra(e.target.value)}
              />
              <Button
                variant="primary"
                className="shrink-0 whitespace-nowrap"
                onClick={saveExtra}
              >
                Lưu định dạng
              </Button>
            </div>
          </Field>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div>
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200">Dọn dẹp tệp mồ côi (Orphan files)</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Quét và xóa các tệp trong thư mục <code>files/</code> không còn được bất kỳ tài liệu hay bài tập nào tham chiếu.
              </p>
            </div>
            <Button size="sm" onClick={clean}>
              <Trash2 className="h-3.5 w-3.5 text-rose-500" />
              Quét & Dọn tệp mồ côi
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
