export interface LookupItem { id: number; name: string }
export interface Topic { id: number; name: string; gradeLevelId: number | null; sortOrder: number }
export interface Lesson { id: number; name: string; topicId: number; sortOrder: number }
export interface Lookups { documentTypes: LookupItem[]; gradeLevels: LookupItem[]; topics: Topic[]; lessons: Lesson[]; languages: string[] }
export interface TagInfo { id: number; name: string; count: number }

export type PreviewKind = 'pdf' | 'image' | 'text' | 'office' | 'archive' | 'none'
export interface FileInfo { id: number; originalName: string; extension: string; mimeType: string; sizeBytes: number; exists: boolean; previewKind: PreviewKind }

export interface DocumentItem {
  id: number; title: string; documentTypeId: number; documentTypeName: string; gradeLevelId: number | null
  topicId: number | null; topicName: string | null; lessonId: number | null; lessonName: string | null
  programmingLanguage: string | null; description: string; contentText: string | null; isFavorite: boolean
  createdAt: string; updatedAt: string; lastAccessedAt: string | null; deletedAt: string | null
  file: FileInfo | null; tags: string[]
}
export interface DocumentSave {
  title: string; documentTypeId: number; gradeLevelId: number | null; topicId: number | null; lessonId: number | null
  programmingLanguage: string | null; description: string; contentText: string; tags: string[]; removeFile: boolean
}
export interface FacetItem { key: string; name: string; count: number }
export interface Facets { types: FacetItem[]; grades: FacetItem[]; topics: FacetItem[]; tags: FacetItem[]; languages: FacetItem[] }
export interface Paged<T> { items: T[]; total: number; page: number; pageSize: number; facets?: Facets | null }

export type ExerciseType = 1 | 2 // 1: MultipleChoice, 2: EssayOrCoding

export interface Exercise {
  id: number; title: string; statement: string; gradeLevelId: number | null; topicId: number | null; topicName: string | null
  lessonId: number | null; lessonName: string | null; difficulty: number; language: string | null
  hint: string; solution: string; sampleCode: string; createdAt: string; updatedAt: string; tags: string[]
  exerciseType?: number; optionA?: string | null; optionB?: string | null; optionC?: string | null; optionD?: string | null
  correctAnswer?: string | null
}
export interface ExerciseSave {
  title: string; statement: string; gradeLevelId: number | null; topicId: number | null; lessonId: number | null
  difficulty: number; language: string | null; hint: string; solution: string; sampleCode: string; tags: string[]
  exerciseType?: number; optionA?: string | null; optionB?: string | null; optionC?: string | null; optionD?: string | null
  correctAnswer?: string | null
}

export interface MatrixTopicRow {
  topicId: number
  topicName: string
  mcq: { recognize: number; understand: number; apply: number; advanced: number }
  essay: { recognize: number; understand: number; apply: number; advanced: number }
}

export interface ExamMatrixTemplate {
  id: number
  name: string
  gradeLevelId: number | null
  gradeLevelName: string | null
  durationMinutes: number
  totalScore: number
  headerSchool: string
  headerExamName: string
  matrixDataJson: string
  createdAt: string
  updatedAt: string
}

export interface ExamMatrixTemplateSave {
  name: string
  gradeLevelId: number | null
  durationMinutes: number
  totalScore: number
  headerSchool?: string
  headerExamName?: string
  matrixDataJson: string
}
export interface Snippet {
  id: number; title: string; language: string; gradeLevelId: number | null; topicId: number | null; topicName: string | null
  lessonId: number | null; lessonName: string | null; description: string; code: string; createdAt: string; updatedAt: string; tags: string[]
}
export interface SnippetSave {
  title: string; language: string; gradeLevelId: number | null; topicId: number | null; lessonId: number | null
  description: string; code: string; tags: string[]
}
export interface Dashboard {
  totalDocuments: number; lessonPlans: number; lectures: number; exercises: number; exams: number; codeSnippets: number
  recentlyAdded: DocumentItem[]; recentlyAccessed: DocumentItem[]; favorites: DocumentItem[]
}
export interface SearchResult {
  query: string; documents: DocumentItem[]; documentTotal: number; exercises: Exercise[]; exerciseTotal: number
  snippets: Snippet[]; snippetTotal: number
}
export interface BackupInfo { id: number; kind: string; filePath: string; sizeBytes: number; success: boolean; message: string; createdAt: string }
export interface BackupValidation { valid: boolean; message: string; createdAt: string | null; documentCount: number; fileCount: number }
export interface AuthStatus { passwordEnabled: boolean; isAuthenticated: boolean; autoLockMinutes: number }
export interface Settings { theme: 'system' | 'light' | 'dark'; autoLockMinutes: number; extraExtensions: string; dataRoot: string; allowedExtensions: string[]; maxFileSizeMb: number }

export interface GoogleDriveStatus {
  isConfigured: boolean
  isConnected: boolean
  userEmail: string | null
  userName: string | null
  autoUpload: boolean
  maxBackups: number
}

export interface GoogleDriveFile {
  id: string
  name: string
  sizeBytes: number
  createdAt: string
}

export interface GoogleDriveConfig {
  clientId: string
  clientSecret: string
}

export interface GoogleDriveSyncSettings {
  autoUpload: boolean
  maxBackups: number
}

// ---------- Kế hoạch dạy học (PPCT) ----------
export type TeachingStatus = 0 | 1 | 2 | 3 // 0: Chưa dạy, 1: Đã dạy, 2: Cần điều chỉnh/Nghỉ, 3: Dạy bù

export interface DocumentBrief {
  id: number
  title: string
  documentTypeId: number
  documentTypeName: string
  file: FileInfo | null
}

export interface TeachingPlanItem {
  id: number
  gradeLevelId: number
  gradeLevelName?: string
  weekNumber: number
  periodNumber: number
  periodName?: string
  title: string
  numberOfPeriods?: string
  equipment?: string
  location?: string
  topicId: number | null
  topicName: string | null
  lessonId: number | null
  lessonName: string | null
  note: string | null
  sortOrder: number
}

export interface TeachingPlanItemSave {
  gradeLevelId: number
  weekNumber: number
  periodNumber: number
  periodName?: string
  title: string
  numberOfPeriods?: string
  equipment?: string
  location?: string
  topicId?: number | null
  lessonId?: number | null
  note?: string | null
  notes?: string | null
  sortOrder?: number
}

export interface TeachingClass {
  id: number
  name: string
  gradeLevelId: number
  gradeLevelName?: string
  schoolYear: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface TeachingClassSave {
  name: string
  gradeLevelId: number
  schoolYear: string
  sortOrder?: number
}

export interface TeachingScheduleItem {
  planItemId: number
  gradeLevelId?: number
  weekNumber: number
  periodNumber: number
  periodName?: string
  title: string
  numberOfPeriods?: string
  equipment?: string
  location?: string
  planNote?: string | null
  topicId: number | null
  topicName: string | null
  lessonId: number | null
  lessonName: string | null
  status: TeachingStatus
  actualDate: string | null
  teacherNotes?: string | null
  progressNote?: string | null
  teachingClassId?: number
  linkedDocuments: DocumentBrief[]
  customDocIds?: number[]
}

export interface UpdateProgressRequest {
  status: number
  actualDate?: string | null
  teacherNotes?: string | null
  customDocIds?: number[]
}

export interface AiSettings {
  hasKey: boolean
  maskedKey: string | null
  currentModel: string
}

export interface AiModelOption {
  id: string
  displayName: string
  description: string
}

export interface AiSettingsUpdate {
  apiKey?: string | null
  model?: string | null
}

export interface GeneratedMcqItem {
  statement: string
  difficulty: number
  difficultyName: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctAnswer: string
  solution: string
  hint: string
}

export interface GeneratedTestcaseItem {
  index: number
  input: string
  output: string
  explanation: string
  isEdgeCase: boolean
}

export interface GenerateMcqParams {
  text: string
  gradeLevelId?: number | null
  topicId?: number | null
  count?: number
}

export interface GenerateTestcasesParams {
  statement: string
  language?: string
  count?: number
}

export interface GenerateObjectivesParams {
  lessonName: string
  gradeLevelId?: number | null
  extraRequirements?: string
}

export interface GenerateObjectivesResponse {
  objectivesMarkdown: string
}

export interface SaveGeneratedExercisesParams {
  gradeLevelId?: number | null
  topicId?: number | null
  questions: GeneratedMcqItem[]
}
