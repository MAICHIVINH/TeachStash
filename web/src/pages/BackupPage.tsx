import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, DatabaseBackup, Download, FileArchive, FolderOpen, HardDrive, History, RotateCcw, ShieldAlert, ShieldCheck } from 'lucide-react'
import { api } from '../services/api'
import { errText, useApp } from '../stores/appStore'
import { Badge, Button, ErrorState, Spinner, inputCls } from '../components/ui'
import { hasNativeBridge, pickFolder, pickZip } from '../utils/bridge'
import { formatBytes, formatDate } from '../utils/format'
import type { BackupInfo, BackupValidation } from '../types'

export default function BackupPage() {
  const { confirm, toast, refreshLookups } = useApp()
  const [history, setHistory] = useState<BackupInfo[] | null>(null)
  const [err, setErr] = useState('')
  const [dest, setDest] = useState('')
  const [busy, setBusy] = useState<'' | 'backup' | 'restore'>('')
  const [check, setCheck] = useState<{ path: string; result: BackupValidation } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const load = () => api.backups().then(setHistory).catch(e => setErr(errText(e)))
  useEffect(() => { load() }, [])

  const backup = async () => {
    setBusy('backup')
    try {
      const r = await api.createBackup(dest || null)
      toast('success', `Sao lưu thành công: ${formatBytes(r.sizeBytes)}`)
      load()
    } catch (e) {
      toast('error', 'Sao lưu thất bại: ' + errText(e))
      load()
    } finally {
      setBusy('')
    }
  }

  const chooseDest = async () => {
    if (hasNativeBridge()) {
      const p = await pickFolder()
      if (p) setDest(p)
    } else {
      toast('info', 'Tính năng duyệt hộp thoại thư mục hoạt động trực tiếp trong ứng dụng Desktop TeachStash. Trên trình duyệt web, bạn có thể nhập trực tiếp đường dẫn (ví dụ: D:\\SaoLuu) hoặc để trống để lưu vào thư mục mặc định.')
    }
  }

  const chooseZip = async () => {
    const p = await pickZip()
    if (!p) return
    try {
      setCheck({ path: p, result: await api.validateBackup(p) })
    } catch (e) {
      toast('error', errText(e))
    }
  }

  const finishRestore = async () => {
    await refreshLookups().catch(() => {})
    toast('success', 'Phục hồi thành công. Toàn bộ dữ liệu đã được nạp lại.')
    setCheck(null)
    load()
  }

  const restorePath = async () => {
    if (!check?.result.valid) return
    if (!(await confirm(`Phục hồi dữ liệu từ bản sao lưu:\n${check.path}\n\nDữ liệu hiện tại sẽ được thay thế (ứng dụng tự động tạo một bản sao lưu an toàn dự phòng trước khi phục hồi). Bạn có chắc chắn muốn tiếp tục?`, {
      title: 'Xác nhận phục hồi dữ liệu',
      confirmText: 'Bắt đầu phục hồi',
      danger: true
    }))) return
    setBusy('restore')
    try {
      await api.restoreBackup(check.path)
      await finishRestore()
    } catch (e) {
      toast('error', 'Phục hồi thất bại: ' + errText(e))
    } finally {
      setBusy('')
    }
  }

  const restoreUpload = async (file: File) => {
    if (!(await confirm(`Phục hồi từ tệp "${file.name}"?\nDữ liệu hiện tại sẽ được thay thế (có bản sao lưu dự phòng tự động).`, {
      title: 'Xác nhận phục hồi dữ liệu',
      confirmText: 'Bắt đầu phục hồi',
      danger: true
    }))) return
    setBusy('restore')
    try {
      await api.restoreUpload(file)
      await finishRestore()
    } catch (e) {
      toast('error', 'Phục hồi thất bại: ' + errText(e))
    } finally {
      setBusy('')
    }
  }

  if (err) return <ErrorState message={err} onRetry={() => { setErr(''); load() }} />

  return (
    <div className="space-y-6">
      {/* Tiêu đề trang */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Sao lưu & Phục hồi dữ liệu</h1>
        <p className="text-sm text-slate-500">Bảo vệ an toàn cho giáo án, học liệu và cơ sở dữ liệu của bạn bằng các bản sao lưu định dạng ZIP.</p>
      </div>

      {/* Grid 2 cột: Tạo sao lưu & Phục hồi */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Card 1: Tạo bản sao lưu */}
        <section className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <DatabaseBackup className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800 dark:text-slate-100">Tạo bản sao lưu mới</h2>
                  <p className="text-xs text-slate-500">Đóng gói toàn bộ cơ sở dữ liệu và file đính kèm</p>
                </div>
              </div>
              <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">ZIP</Badge>
            </div>

            <p className="mb-4 text-xs leading-relaxed text-slate-500">
              Bản sao lưu chứa bản chụp nhất quán của tệp <code>giaoan.db</code> cùng toàn bộ giáo án, bài tập và mã nguồn đã tải lên. Mặc định lưu vào thư mục <code>backups</code> trong kho dữ liệu.
            </p>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Thư mục đích (tùy chọn)
                </label>
                <div className="flex gap-2">
                  <input
                    className={inputCls}
                    placeholder="Để trống = thư mục backups mặc định"
                    value={dest}
                    onChange={e => setDest(e.target.value)}
                  />
                  <Button
                    type="button"
                    onClick={chooseDest}
                    title="Duyệt thư mục trên máy"
                    className="shrink-0 whitespace-nowrap"
                  >
                    <FolderOpen className="h-4 w-4" />
                    <span>Chọn thư mục</span>
                  </Button>
                </div>
                {dest && (
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                    <span className="truncate">Thư mục đã chọn: <code className="text-indigo-600 dark:text-indigo-400">{dest}</code></span>
                    <button type="button" onClick={() => setDest('')} className="ml-2 shrink-0 text-rose-500 hover:underline">
                      Xóa để dùng mặc định
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <HardDrive className="h-3.5 w-3.5" />
              Nén nhanh không làm gián đoạn ứng dụng
            </span>
            <Button variant="primary" loading={busy === 'backup'} onClick={backup}>
              <DatabaseBackup className="h-4 w-4" />
              Sao lưu ngay
            </Button>
          </div>
        </section>

        {/* Card 2: Phục hồi từ bản sao lưu */}
        <section className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800 dark:text-slate-100">Phục hồi dữ liệu</h2>
                  <p className="text-xs text-slate-500">Khôi phục từ tệp ZIP đã sao lưu trước đó</p>
                </div>
              </div>
              <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">Kiểm tra SHA-256</Badge>
            </div>

            <p className="mb-4 text-xs leading-relaxed text-slate-500">
              Hệ thống tự động kiểm tra cấu trúc tệp, mã băm toàn vẹn SHA-256 và tạo sẵn 1 bản sao lưu an toàn dự phòng trước khi thay thế dữ liệu.
            </p>

            <div className="flex flex-wrap gap-2">
              {hasNativeBridge() ? (
                <Button onClick={chooseZip} className="w-full sm:w-auto">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Chọn tệp sao lưu (.zip) và kiểm tra...
                </Button>
              ) : (
                <Button onClick={() => fileInput.current?.click()} className="w-full sm:w-auto">
                  <FileArchive className="h-4 w-4 text-indigo-500" />
                  Chọn tệp sao lưu (.zip)...
                </Button>
              )}
              <input
                ref={fileInput}
                type="file"
                accept=".zip"
                hidden
                onChange={e => {
                  const f = e.target.files?.[0]
                  e.target.value = ''
                  if (f) restoreUpload(f)
                }}
              />
            </div>

            {/* Hộp kiểm tra file ZIP */}
            {check && (
              <div
                className={`mt-4 rounded-lg border p-4 text-xs transition ${
                  check.result.valid
                    ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
                    : 'border-rose-200 bg-rose-50/70 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {check.result.valid ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                  )}
                  <div className="flex-1 space-y-1">
                    <div className="font-semibold break-all selectable">{check.path}</div>
                    <div>{check.result.message}</div>
                    {check.result.valid && (
                      <div className="text-slate-600 dark:text-slate-400 pt-1">
                        • {check.result.documentCount} tài liệu &bull; {check.result.fileCount} tệp đính kèm &bull; Tạo lúc:{' '}
                        {formatDate(check.result.createdAt, true)}
                      </div>
                    )}
                  </div>
                </div>

                {check.result.valid && (
                  <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-900/60 flex justify-end">
                    <Button variant="danger" size="sm" loading={busy === 'restore'} onClick={restorePath}>
                      <RotateCcw className="h-3.5 w-3.5" />
                      Phục hồi ngay từ bản này
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
            <span className="text-xs text-slate-400">
              * Luôn kiểm tra kỹ thời gian bản sao lưu trước khi thực hiện.
            </span>
          </div>
        </section>
      </div>

      {/* Lịch sử sao lưu & phục hồi */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-indigo-500" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Lịch sử sao lưu & phục hồi</h2>
            {history && <Badge>{history.length}</Badge>}
          </div>
          <Button size="sm" variant="ghost" onClick={load}>Làm mới</Button>
        </div>

        {!history ? (
          <Spinner />
        ) : history.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">Chưa có bản ghi sao lưu hoặc phục hồi nào.</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Thời gian</th>
                  <th className="px-4 py-2.5 font-medium">Hành động</th>
                  <th className="px-4 py-2.5 font-medium">Trạng thái & Chi tiết</th>
                  <th className="px-4 py-2.5 font-medium">Dung lượng</th>
                  <th className="px-4 py-2.5 text-right font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {history.map(h => (
                  <tr key={h.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600 dark:text-slate-300">
                      {formatDate(h.createdAt, true)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                          h.kind === 'Backup'
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}
                      >
                        {h.kind === 'Backup' ? <DatabaseBackup className="h-3 w-3" /> : <RotateCcw className="h-3 w-3" />}
                        {h.kind === 'Backup' ? 'Sao lưu' : 'Phục hồi'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block h-2 w-2 rounded-full shrink-0 ${
                            h.success ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        <span className="text-xs selectable text-slate-700 dark:text-slate-200" title={h.filePath}>
                          {h.success ? 'Thành công' : 'Thất bại'} &mdash; {h.message}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-slate-500">
                      {h.sizeBytes ? formatBytes(h.sizeBytes) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {h.success && h.kind === 'Backup' && (
                        <a href={api.backupDownloadUrl(h.id)} download>
                          <Button size="sm">
                            <Download className="h-3.5 w-3.5" />
                            Tải về bản ZIP
                          </Button>
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
