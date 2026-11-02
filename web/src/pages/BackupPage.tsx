import { useEffect, useRef, useState } from 'react'
import {
  Check,
  CheckCircle2,
  Cloud,
  CloudOff,
  CloudUpload,
  Copy,
  DatabaseBackup,
  Download,
  ExternalLink,
  FileArchive,
  FolderOpen,
  HardDrive,
  HelpCircle,
  History,
  Key,
  LogOut,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { api } from '../services/api'
import { errText, useApp } from '../stores/appStore'
import { Badge, Button, ErrorState, Modal, Spinner, inputCls } from '../components/ui'
import { hasNativeBridge, pickFolder, pickZip } from '../utils/bridge'
import { formatBytes, formatDate } from '../utils/format'
import type { BackupInfo, BackupValidation, GoogleDriveFile, GoogleDriveStatus } from '../types'

export default function BackupPage() {
  const { confirm, toast, refreshLookups } = useApp()
  const [history, setHistory] = useState<BackupInfo[] | null>(null)
  const [err, setErr] = useState('')
  const [dest, setDest] = useState('')
  const [busy, setBusy] = useState<'' | 'backup' | 'restore'>('')
  const [check, setCheck] = useState<{ path: string; result: BackupValidation } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  // Google Drive state
  const [driveStatus, setDriveStatus] = useState<GoogleDriveStatus | null>(null)
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[] | null>(null)
  const [driveLoading, setDriveLoading] = useState(false)
  const [driveModalOpen, setDriveModalOpen] = useState(false)
  const [driveClientId, setDriveClientId] = useState('')
  const [driveClientSecret, setDriveClientSecret] = useState('')
  const [driveAuthCode, setDriveAuthCode] = useState('')
  const [driveAuthUrl, setDriveAuthUrl] = useState('')
  const [driveShowHelp, setDriveShowHelp] = useState(false)
  const [uploadingBackupId, setUploadingBackupId] = useState<number | null>(null)
  const [driveRestoreCheck, setDriveRestoreCheck] = useState<{ fileId: string; fileName: string; path: string; result: BackupValidation } | null>(null)

  const load = () => {
    api.backups().then(setHistory).catch(e => setErr(errText(e)))
    loadDrive()
  }

  const loadDrive = async () => {
    try {
      const status = await api.gdrive.status()
      setDriveStatus(status)
      if (status.isConnected) {
        setDriveLoading(true)
        api.gdrive.backups()
          .then(setDriveFiles)
          .catch(e => console.warn('Lỗi tải danh sách backup Drive:', e))
          .finally(() => setDriveLoading(false))
      } else {
        setDriveFiles(null)
      }
    } catch (e) {
      console.warn('Lỗi tải trạng thái Drive:', e)
    }
  }

  useEffect(() => {
    load()

    // Bắt postMessage từ popup callback Google Sign-in
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'gdrive_auth' && event.data.code) {
        setDriveAuthCode(event.data.code)
        toast('info', 'Đã nhận mã xác thực từ Google! Đang hoàn tất kết nối...')
        try {
          const res = await api.gdrive.exchange(event.data.code)
          setDriveStatus(res)
          setDriveModalOpen(false)
          toast('success', `Kết nối Google Drive thành công: ${res.userEmail || ''}`)
          loadDrive()
        } catch (e) {
          toast('error', 'Lỗi xác thực Google: ' + errText(e))
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

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
    setDriveRestoreCheck(null)
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

  // Google Drive Handlers
  const handleOpenDriveModal = async () => {
    setDriveAuthCode('')
    setDriveModalOpen(true)
    if (driveStatus?.isConfigured) {
      try {
        const { authUrl } = await api.gdrive.authUrl()
        setDriveAuthUrl(authUrl)
      } catch (e) {
        console.warn('Lỗi lấy Auth URL:', e)
      }
    }
  }

  const handleSaveDriveConfig = async () => {
    if (!driveClientId.trim() || !driveClientSecret.trim()) {
      toast('error', 'Vui lòng nhập đầy đủ Client ID và Client Secret.')
      return
    }
    try {
      const status = await api.gdrive.config({
        clientId: driveClientId.trim(),
        clientSecret: driveClientSecret.trim()
      })
      setDriveStatus(status)
      const { authUrl } = await api.gdrive.authUrl()
      setDriveAuthUrl(authUrl)
      toast('success', 'Đã lưu cấu hình Google Cloud. Bạn có thể bấm Đăng nhập Google.')
    } catch (e) {
      toast('error', errText(e))
    }
  }

  const handleJsonCredentials = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = evt => {
      try {
        const json = JSON.parse(evt.target?.result as string)
        const creds = json.installed || json.web || json
        if (creds.client_id && creds.client_secret) {
          setDriveClientId(creds.client_id)
          setDriveClientSecret(creds.client_secret)
          toast('success', 'Đã nạp Client ID & Secret từ tệp JSON thành công.')
        } else {
          toast('error', 'Không tìm thấy client_id hoặc client_secret trong tệp JSON.')
        }
      } catch {
        toast('error', 'Tệp JSON không hợp lệ.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleOpenAuthUrl = async () => {
    let url = driveAuthUrl
    if (!url) {
      if (!driveClientId.trim() || !driveClientSecret.trim()) {
        toast('error', 'Vui lòng nhập Client ID và Client Secret ở Bước 1 trước.')
        return
      }
      try {
        await api.gdrive.config({
          clientId: driveClientId.trim(),
          clientSecret: driveClientSecret.trim()
        })
        const res = await api.gdrive.authUrl()
        url = res.authUrl
        setDriveAuthUrl(url)
      } catch (e) {
        toast('error', 'Lỗi khởi tạo đăng nhập: ' + errText(e))
        return
      }
    }

    try {
      await api.gdrive.openBrowser(url)
      toast('info', 'Đã mở trang đăng nhập Google trên trình duyệt mặc định của máy tính.')
    } catch {
      window.open(url, '_blank')
    }
  }

  const handleCopyAuthUrl = () => {
    if (!driveAuthUrl) return
    navigator.clipboard.writeText(driveAuthUrl)
    toast('success', 'Đã sao chép liên kết đăng nhập vào bộ nhớ tạm.')
  }

  const handlePasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        setDriveAuthCode(text.trim())
        toast('info', 'Đã dán mã xác thực từ bộ nhớ tạm.')
      }
    } catch {
      toast('info', 'Vui lòng dán trực tiếp (Ctrl+V) vào ô nhập.')
    }
  }

  const handleExchangeCode = async () => {
    if (!driveAuthCode.trim()) {
      toast('error', 'Vui lòng dán mã xác thực Authorization Code từ Google.')
      return
    }
    try {
      const res = await api.gdrive.exchange(driveAuthCode.trim())
      setDriveStatus(res)
      setDriveModalOpen(false)
      toast('success', `Kết nối Google Drive thành công: ${res.userEmail || ''}`)
      loadDrive()
    } catch (e) {
      toast('error', 'Xác thực thất bại: ' + errText(e))
    }
  }

  const handleDisconnectDrive = async () => {
    if (!(await confirm('Bạn có chắc chắn muốn ngắt kết nối tài khoản Google Drive khỏi ứng dụng TeachStash?', {
      title: 'Xác nhận ngắt kết nối',
      confirmText: 'Ngắt kết nối',
      danger: true
    }))) return

    try {
      const res = await api.gdrive.disconnect()
      setDriveStatus(res)
      setDriveFiles(null)
      toast('success', 'Đã ngắt kết nối Google Drive.')
    } catch (e) {
      toast('error', errText(e))
    }
  }

  const handleToggleAutoUpload = async (autoUpload: boolean) => {
    if (!driveStatus) return
    try {
      const res = await api.gdrive.updateSettings({
        autoUpload,
        maxBackups: driveStatus.maxBackups
      })
      setDriveStatus(res)
      toast('success', autoUpload ? 'Đã bật tự động sao lưu lên Google Drive.' : 'Đã tắt tự động sao lưu lên Google Drive.')
    } catch (e) {
      toast('error', errText(e))
    }
  }

  const handleChangeMaxBackups = async (maxBackups: number) => {
    if (!driveStatus) return
    try {
      const res = await api.gdrive.updateSettings({
        autoUpload: driveStatus.autoUpload,
        maxBackups
      })
      setDriveStatus(res)
      toast('success', `Đã cập nhật: Giữ lại ${maxBackups === 0 ? 'tất cả' : maxBackups} bản sao lưu trên Drive.`)
    } catch (e) {
      toast('error', errText(e))
    }
  }

  const handleUploadLocalToDrive = async (backupId: number) => {
    setUploadingBackupId(backupId)
    try {
      const res = await api.gdrive.upload(backupId)
      toast('success', res.message)
      load()
    } catch (e) {
      toast('error', 'Tải lên Google Drive thất bại: ' + errText(e))
    } finally {
      setUploadingBackupId(null)
    }
  }

  const handleCheckDriveRestore = async (file: GoogleDriveFile) => {
    setBusy('restore')
    try {
      const res = await api.gdrive.restore(file.id)
      setDriveRestoreCheck({
        fileId: file.id,
        fileName: file.name,
        path: res.path,
        result: res.result
      })
    } catch (e) {
      toast('error', 'Kiểm tra bản sao lưu từ Drive thất bại: ' + errText(e))
    } finally {
      setBusy('')
    }
  }

  const handleConfirmDriveRestore = async () => {
    if (!driveRestoreCheck?.result.valid) return
    if (!(await confirm(`Phục hồi dữ liệu từ bản sao lưu trên Google Drive:\n"${driveRestoreCheck.fileName}"?\n\nDữ liệu hiện tại sẽ được thay thế (ứng dụng tự động tạo một bản sao lưu an toàn dự phòng trước khi phục hồi).`, {
      title: 'Xác nhận phục hồi từ Google Drive',
      confirmText: 'Bắt đầu phục hồi',
      danger: true
    }))) return

    setBusy('restore')
    try {
      await api.gdrive.restoreConfirm(driveRestoreCheck.fileId, driveRestoreCheck.path)
      await finishRestore()
    } catch (e) {
      toast('error', 'Phục hồi từ Drive thất bại: ' + errText(e))
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
        <p className="text-sm text-slate-500">Bảo vệ an toàn cho giáo án, học liệu và cơ sở dữ liệu của bạn bằng các bản sao lưu định dạng ZIP và đồng bộ đám mây.</p>
      </div>

      {/* Card Google Drive Sync (Đồng bộ đám mây) */}
      <section className="rounded-xl border border-sky-200/80 bg-gradient-to-br from-sky-50/70 via-white to-blue-50/40 p-5 shadow-sm dark:border-sky-900/60 dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="rounded-xl bg-sky-500 p-2.5 text-white shadow-md shadow-sky-500/20 dark:bg-sky-600">
              <Cloud className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Đồng bộ Đám mây Cá nhân (Google Drive)</h2>
                {driveStatus?.isConnected ? (
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    <Check className="mr-1 h-3 w-3" /> Đã kết nối
                  </Badge>
                ) : (
                  <Badge className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    Chưa kết nối
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {driveStatus?.isConnected
                  ? `Tài khoản: ${driveStatus.userEmail || driveStatus.userName || 'Đã liên kết'}. Bản sao lưu sẽ được lưu tự động vào thư mục "TeachStash_Backups" trên Drive.`
                  : 'Tự động tải file ZIP lên Google Drive của bạn phòng ngừa sự cố máy tính hỏng hoặc đổi máy mới.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {driveStatus?.isConnected ? (
              <>
                <Button size="sm" variant="secondary" onClick={loadDrive} loading={driveLoading}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Làm mới
                </Button>
                <Button size="sm" variant="danger" onClick={handleDisconnectDrive}>
                  <LogOut className="h-3.5 w-3.5" />
                  Ngắt kết nối
                </Button>
              </>
            ) : (
              <Button variant="primary" onClick={handleOpenDriveModal} className="bg-sky-600 hover:bg-sky-700 text-white">
                <Cloud className="h-4 w-4" />
                Kết nối Google Drive
              </Button>
            )}
          </div>
        </div>

        {/* Tùy chọn cấu hình khi đã kết nối */}
        {driveStatus?.isConnected && (
          <div className="mt-4 pt-4 border-t border-sky-100 dark:border-sky-950/60 flex flex-wrap items-center justify-between gap-4 text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={driveStatus.autoUpload}
                onChange={e => handleToggleAutoUpload(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500 dark:border-slate-700"
              />
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Tự động tải lên Google Drive mỗi khi nhấn &quot;Sao lưu&quot;
              </span>
            </label>

            <div className="flex items-center gap-2">
              <span className="text-slate-500">Giữ lại trên Drive:</span>
              <select
                value={driveStatus.maxBackups}
                onChange={e => handleChangeMaxBackups(parseInt(e.target.value, 10))}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value={5}>5 bản mới nhất</option>
                <option value={10}>10 bản mới nhất (Khuyến nghị)</option>
                <option value={20}>20 bản mới nhất</option>
                <option value={0}>Tất cả (Không tự xóa)</option>
              </select>
            </div>
          </div>
        )}
      </section>

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
              {driveStatus?.isConnected && driveStatus.autoUpload ? 'Tự động tải lên Drive sau khi nén' : 'Nén nhanh không làm gián đoạn'}
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

            {/* Hộp kiểm tra file ZIP cục bộ */}
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

      {/* Bảng Bản sao lưu trên Google Drive */}
      {driveStatus?.isConnected && (
        <section className="rounded-xl border border-sky-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-sky-500" />
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">Bản sao lưu trên Google Drive</h2>
              {driveFiles && <Badge className="bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300">{driveFiles.length}</Badge>}
            </div>
            <Button size="sm" variant="ghost" onClick={loadDrive} loading={driveLoading}>
              <RefreshCw className="h-3.5 w-3.5" />
              Làm mới
            </Button>
          </div>

          {driveLoading && !driveFiles ? (
            <Spinner />
          ) : !driveFiles || driveFiles.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">
              Chưa có bản sao lưu nào trong thư mục <code>TeachStash_Backups</code> trên Google Drive.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Tên tệp</th>
                    <th className="px-4 py-2.5 font-medium">Ngày tải lên</th>
                    <th className="px-4 py-2.5 font-medium">Dung lượng</th>
                    <th className="px-4 py-2.5 text-right font-medium">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {driveFiles.map(file => (
                    <tr key={file.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                      <td className="px-4 py-3 text-xs font-medium text-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-2">
                          <Cloud className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                          <span className="selectable break-all">{file.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                        {formatDate(file.createdAt, true)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-slate-500">
                        {formatBytes(file.sizeBytes)}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleCheckDriveRestore(file)}
                            loading={busy === 'restore' && driveRestoreCheck?.fileId === file.id}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Phục hồi
                          </Button>
                          <a href={api.gdrive.downloadUrl(file.id)} download>
                            <Button size="sm" variant="secondary">
                              <Download className="h-3.5 w-3.5" />
                              Tải về
                            </Button>
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Modal xác nhận phục hồi từ Drive */}
          {driveRestoreCheck && (
            <div
              className={`mt-4 rounded-lg border p-4 text-xs transition ${
                driveRestoreCheck.result.valid
                  ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
                  : 'border-rose-200 bg-rose-50/70 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200'
              }`}
            >
              <div className="flex items-start gap-2.5">
                {driveRestoreCheck.result.valid ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                )}
                <div className="flex-1 space-y-1">
                  <div className="font-semibold break-all">Bản sao lưu Google Drive: {driveRestoreCheck.fileName}</div>
                  <div>{driveRestoreCheck.result.message}</div>
                  {driveRestoreCheck.result.valid && (
                    <div className="text-slate-600 dark:text-slate-400 pt-1">
                      • {driveRestoreCheck.result.documentCount} tài liệu &bull; {driveRestoreCheck.result.fileCount} tệp đính kèm &bull; Tạo lúc:{' '}
                      {formatDate(driveRestoreCheck.result.createdAt, true)}
                    </div>
                  )}
                </div>
              </div>

              {driveRestoreCheck.result.valid && (
                <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-900/60 flex items-center justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setDriveRestoreCheck(null)}>
                    Hủy
                  </Button>
                  <Button variant="danger" size="sm" loading={busy === 'restore'} onClick={handleConfirmDriveRestore}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    Bắt đầu phục hồi vào máy
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Lịch sử sao lưu & phục hồi */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-indigo-500" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Lịch sử sao lưu & phục hồi cục bộ</h2>
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
                      <div className="flex items-center justify-end gap-2">
                        {driveStatus?.isConnected && h.success && h.kind === 'Backup' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleUploadLocalToDrive(h.id)}
                            loading={uploadingBackupId === h.id}
                            title="Tải bản sao lưu này lên Google Drive"
                          >
                            <CloudUpload className="h-3.5 w-3.5 text-sky-600" />
                            Đẩy lên Drive
                          </Button>
                        )}
                        {h.success && h.kind === 'Backup' && (
                          <a href={api.backupDownloadUrl(h.id)} download>
                            <Button size="sm">
                              <Download className="h-3.5 w-3.5" />
                              Tải về
                            </Button>
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal Cấu hình & Đăng nhập Google Drive */}
      {driveModalOpen && (
        <Modal
          title="Kết nối Google Drive"
          onRequestClose={() => setDriveModalOpen(false)}
          wide="lg"
        >
          <div className="space-y-4 p-5 text-sm">
            <div className="flex items-start gap-3 rounded-lg bg-sky-50 p-3 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200">
              <Cloud className="h-5 w-5 shrink-0 text-sky-600 mt-0.5" />
              <div className="text-xs leading-relaxed">
                Ứng dụng chỉ sử dụng quyền <code>drive.file</code> (chỉ đọc và ghi các tệp do TeachStash tạo ra trong thư mục riêng của ứng dụng), hoàn toàn bảo mật và không thể xem các tệp cá nhân khác trên Drive của bạn.
              </div>
            </div>

            {/* Bước 1: Client ID & Secret */}
            <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Key className="h-4 w-4 text-amber-500" />
                  Bước 1: Cấu hình Google Cloud OAuth
                </span>
                <label className="text-xs text-sky-600 hover:underline cursor-pointer">
                  Tải lên credentials.json
                  <input type="file" accept=".json" hidden onChange={handleJsonCredentials} />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Client ID
                  </label>
                  <input
                    className={inputCls}
                    placeholder="ví dụ: 123456789-xxx.apps.googleusercontent.com"
                    value={driveClientId}
                    onChange={e => setDriveClientId(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Client Secret
                  </label>
                  <input
                    type="password"
                    className={inputCls}
                    placeholder="ví dụ: GOCSPX-xxxxxxxxx"
                    value={driveClientSecret}
                    onChange={e => setDriveClientSecret(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setDriveShowHelp(!driveShowHelp)}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  {driveShowHelp ? 'Ẩn hướng dẫn' : 'Cách tạo Client ID miễn phí trên Google Cloud'}
                </button>
                <Button size="sm" variant="secondary" onClick={handleSaveDriveConfig}>
                  Lưu cấu hình
                </Button>
              </div>

              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 space-y-1.5 leading-relaxed border border-amber-200 dark:border-amber-900/60">
                <div className="font-semibold flex items-center justify-between">
                  <span>URI chuyển hướng (Redirect URI) trên máy của bạn:</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText('http://127.0.0.1:5080/api/gdrive/callback')
                      toast('success', 'Đã sao chép URI chuyển hướng vào bộ nhớ tạm.')
                    }}
                    className="text-amber-800 hover:underline dark:text-amber-300 font-medium cursor-pointer"
                  >
                    Sao chép URI
                  </button>
                </div>
                <code className="block bg-amber-100/80 px-2 py-1 rounded font-mono text-[11px] selectable dark:bg-amber-900/50">
                  http://127.0.0.1:5080/api/gdrive/callback
                </code>
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  Nếu bạn tạo Client ID dạng <strong>Web application</strong>, hãy thêm URI trên vào mục <em>&quot;Authorized redirect URIs&quot;</em> trong Google Cloud Console để tránh lỗi <code>redirect_uri_mismatch</code>.
                </p>
              </div>

              {driveShowHelp && (
                <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 space-y-1.5 leading-relaxed">
                  <p><strong>1.</strong> Truy cập <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-sky-600 underline">Google Cloud Console</a> và tạo một Dự án (Project) mới.</p>
                  <p><strong>2.</strong> Bật <strong>Google Drive API</strong> trong mục <em>APIs & Services &gt; Library</em>.</p>
                  <p><strong>3.</strong> Vào <em>Credentials &gt; Create Credentials &gt; OAuth client ID</em>: chọn loại <strong>Desktop App</strong> (hoặc nếu chọn Web application thì thêm URI <code>http://127.0.0.1:5080/api/gdrive/callback</code> vào Authorized redirect URIs).</p>
                  <p><strong>4.</strong> Tải tệp JSON hoặc dán Client ID / Client Secret vào đây.</p>
                </div>
              )}
            </div>

            {/* Bước 2: Đăng nhập & Xác thực */}
            <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Cloud className="h-4 w-4 text-sky-500" />
                Bước 2: Cấp quyền tài khoản Google
              </span>

              <p className="text-xs text-slate-500">
                Nhấn nút bên dưới để mở trang đăng nhập Google. Sau khi bạn chọn tài khoản và bấm &quot;Cho phép&quot;, trang web sẽ tự động kết nối hoặc hiển thị mã xác thực.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  onClick={handleOpenAuthUrl}
                  className="bg-sky-600 hover:bg-sky-700 text-white"
                >
                  <ExternalLink className="h-4 w-4" />
                  Mở trang đăng nhập Google
                </Button>

                {driveAuthUrl && (
                  <Button size="sm" variant="secondary" onClick={handleCopyAuthUrl} title="Sao chép liên kết vào bộ nhớ tạm">
                    <Copy className="h-3.5 w-3.5" />
                    Sao chép liên kết
                  </Button>
                )}
              </div>

              <div className="pt-2">
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Hoặc dán Mã xác thực (Authorization Code) vào đây nếu không tự động chuyển hướng:
                </label>
                <div className="flex gap-2">
                  <input
                    className={inputCls}
                    placeholder="Dán mã code từ trang Google sau khi đăng nhập..."
                    value={driveAuthCode}
                    onChange={e => setDriveAuthCode(e.target.value)}
                  />
                  <Button variant="secondary" onClick={handlePasteCode} title="Dán mã từ bộ nhớ tạm">
                    Dán mã
                  </Button>
                  <Button variant="primary" onClick={handleExchangeCode}>
                    Hoàn tất kết nối
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
