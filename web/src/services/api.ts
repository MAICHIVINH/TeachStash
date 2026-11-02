import type * as T from '../types'

export class ApiError extends Error {
  constructor(message: string, public status: number, public errors?: Record<string, string[]>) { super(message) }
}

async function request<R>(method: string, url: string, body?: unknown): Promise<R> {
  const headers: Record<string, string> = { 'X-Requested-With': 'GiaoAnTin' }
  let payload: BodyInit | undefined
  if (body instanceof FormData) payload = body
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body) }
  let res: Response
  try { res = await fetch(url, { method, headers, body: payload, credentials: 'same-origin' }) }
  catch { throw new ApiError('Không kết nối được tới máy chủ nội bộ của ứng dụng.', 0) }
  if (res.status === 204) return undefined as R
  const text = await res.text()
  let data: any = null
  try { data = text ? JSON.parse(text) : null } catch { /* không phải JSON */ }
  if (!res.ok) {
    if (res.status === 401 && data?.code === 'locked') window.dispatchEvent(new Event('gat-locked'))
    throw new ApiError(data?.message ?? `Lỗi ${res.status}`, res.status, data?.errors ?? undefined)
  }
  return data as R
}

const qs = (o: Record<string, unknown>) => {
  const p = new URLSearchParams()
  Object.entries(o).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, String(v)) })
  const s = p.toString()
  return s ? `?${s}` : ''
}

export interface DocFilters {
  q?: string; typeId?: number | null; gradeLevelId?: number | null; topicId?: number | null; lessonId?: number | null
  tag?: string; language?: string; createdFrom?: string; createdTo?: string; favorite?: boolean; sort?: string
  page?: number; pageSize?: number
}

const docForm = (data: T.DocumentSave, file: File | null) => {
  const f = new FormData()
  f.append('data', JSON.stringify(data))
  if (file) f.append('file', file)
  return f
}

export const api = {
  health: () => request<{ status: string }>('GET', '/api/health'),
  authStatus: () => request<T.AuthStatus>('GET', '/api/auth/status'),
  setup: (password: string) => request<T.AuthStatus>('POST', '/api/auth/setup', { password }),
  login: (password: string) => request<T.AuthStatus>('POST', '/api/auth/login', { password }),
  logout: () => request<void>('POST', '/api/auth/logout'),
  changePassword: (currentPassword: string, newPassword: string) => request<void>('POST', '/api/auth/change-password', { currentPassword, newPassword }),
  disablePassword: (password: string) => request<void>('POST', '/api/auth/disable', { password }),

  lookups: () => request<T.Lookups>('GET', '/api/lookups'),
  tags: () => request<T.TagInfo[]>('GET', '/api/tags'),
  saveTopic: (id: number | null, b: { name: string; gradeLevelId: number | null; sortOrder: number }) =>
    id ? request<T.Topic>('PUT', `/api/topics/${id}`, b) : request<T.Topic>('POST', '/api/topics', b),
  deleteTopic: (id: number) => request<void>('DELETE', `/api/topics/${id}`),
  saveLesson: (id: number | null, b: { name: string; topicId: number; sortOrder: number }) =>
    id ? request<T.Lesson>('PUT', `/api/lessons/${id}`, b) : request<T.Lesson>('POST', '/api/lessons', b),
  deleteLesson: (id: number) => request<void>('DELETE', `/api/lessons/${id}`),

  documents: (f: DocFilters) => request<T.Paged<T.DocumentItem>>('GET', '/api/documents' + qs(f as Record<string, unknown>)),
  trash: (q: string, page: number) => request<T.Paged<T.DocumentItem>>('GET', '/api/documents/trash' + qs({ q, page, pageSize: 50 })),
  document: (id: number) => request<T.DocumentItem>('GET', `/api/documents/${id}`),
  createDocument: (d: T.DocumentSave, file: File | null) => request<T.DocumentItem>('POST', '/api/documents', docForm(d, file)),
  updateDocument: (id: number, d: T.DocumentSave, file: File | null) => request<T.DocumentItem>('PUT', `/api/documents/${id}`, docForm(d, file)),
  removeFile: (id: number) => request<T.DocumentItem>('DELETE', `/api/documents/${id}/file`),
  favorite: (id: number, isFavorite: boolean) => request<void>('POST', `/api/documents/${id}/favorite`, { isFavorite }),
  trashDocs: (ids: number[]) => request<void>('POST', '/api/documents/trash', { ids }),
  restoreDocs: (ids: number[]) => request<void>('POST', '/api/documents/restore', { ids }),
  purgeDocs: (ids: number[]) => request<void>('POST', '/api/documents/purge', { ids }),
  fileText: (id: number) => request<{ text: string; truncated: boolean }>('GET', `/api/documents/${id}/file/text`),
  openFile: (id: number) => request<void>('POST', `/api/documents/${id}/file/open`),
  downloadUrl: (id: number) => `/api/documents/${id}/file/download`,
  contentUrl: (id: number) => `/api/documents/${id}/file/content`,
  cleanOrphans: () => request<{ filesDeleted: number; bytesFreed: number }>('POST', '/api/maintenance/clean-orphans'),

  exercises: (f: Record<string, unknown>) => request<T.Paged<T.Exercise>>('GET', '/api/exercises' + qs(f)),
  saveExercise: (id: number | null, b: T.ExerciseSave) =>
    id ? request<T.Exercise>('PUT', `/api/exercises/${id}`, b) : request<T.Exercise>('POST', '/api/exercises', b),
  deleteExercise: (id: number) => request<void>('DELETE', `/api/exercises/${id}`),

  snippets: (f: Record<string, unknown>) => request<T.Paged<T.Snippet>>('GET', '/api/snippets' + qs(f)),
  saveSnippet: (id: number | null, b: T.SnippetSave) =>
    id ? request<T.Snippet>('PUT', `/api/snippets/${id}`, b) : request<T.Snippet>('POST', '/api/snippets', b),
  deleteSnippet: (id: number) => request<void>('DELETE', `/api/snippets/${id}`),

  dashboard: () => request<T.Dashboard>('GET', '/api/dashboard'),
  search: (q: string) => request<T.SearchResult>('GET', '/api/search' + qs({ q, take: 20 })),
  settings: () => request<T.Settings>('GET', '/api/settings'),
  updateSettings: (b: Partial<{ theme: string; autoLockMinutes: number; extraExtensions: string }>) => request<T.Settings>('PUT', '/api/settings', b),

  backups: () => request<T.BackupInfo[]>('GET', '/api/backups'),
  createBackup: (destinationFolder: string | null) => request<T.BackupInfo>('POST', '/api/backups', { destinationFolder }),
  validateBackup: (path: string) => request<T.BackupValidation>('POST', '/api/backups/validate', { path }),
  restoreBackup: (path: string) => request<T.BackupInfo>('POST', '/api/backups/restore', { path, confirm: true }),
  restoreUpload: (file: File) => { const f = new FormData(); f.append('file', file); f.append('confirm', 'true'); return request<T.BackupInfo>('POST', '/api/backups/restore-upload', f) },
  backupDownloadUrl: (id: number) => `/api/backups/${id}/download`,

  gdrive: {
    status: () => request<T.GoogleDriveStatus>('GET', '/api/gdrive/status'),
    config: (body: T.GoogleDriveConfig) => request<T.GoogleDriveStatus>('POST', '/api/gdrive/config', body),
    authUrl: () => request<{ authUrl: string; state: string }>('POST', '/api/gdrive/auth-url'),
    exchange: (code: string, state?: string) => request<T.GoogleDriveStatus>('POST', '/api/gdrive/exchange', { code, state }),
    disconnect: () => request<T.GoogleDriveStatus>('POST', '/api/gdrive/disconnect'),
    updateSettings: (body: T.GoogleDriveSyncSettings) => request<T.GoogleDriveStatus>('PUT', '/api/gdrive/settings', body),
    backups: () => request<T.GoogleDriveFile[]>('GET', '/api/gdrive/backups'),
    upload: (backupId: number) => request<{ driveFileId: string; message: string }>('POST', `/api/gdrive/upload/${backupId}`),
    restore: (fileId: string) => request<{ path: string; result: T.BackupValidation }>('POST', `/api/gdrive/restore/${fileId}`),
    restoreConfirm: (fileId: string, path: string) => request<T.BackupInfo>('POST', `/api/gdrive/restore-confirm/${fileId}`, { path, confirm: true }),
    downloadUrl: (fileId: string) => `/api/gdrive/download/${fileId}`,
    openBrowser: (url: string) => request<{ success: boolean }>('POST', '/api/gdrive/open-browser', { url }),
  },
}
