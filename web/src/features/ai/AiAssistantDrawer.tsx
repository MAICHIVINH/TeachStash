import { useState, useEffect, useMemo } from 'react'
import {
  Sparkles,
  X,
  Settings,
  Copy,
  Check,
  CheckCircle2,
  FileText,
  Code2,
  ListChecks,
  KeyRound,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Download,
  AlertCircle,
  HelpCircle,
  Lightbulb,
  Save,
  Eye,
  EyeOff
} from 'lucide-react'
import { api } from '../../services/api'
import { useApp, errText } from '../../stores/appStore'
import { Button, inputCls, cx } from '../../components/ui'
import type {
  AiSettings,
  AiModelOption,
  GeneratedMcqItem,
  GeneratedTestcaseItem
} from '../../types'

interface AiAssistantDrawerProps {
  open: boolean
  onClose: () => void
}

const MODEL_PRESETS = [
  { value: 'gemini-1.5-flash', label: 'gemini-1.5-flash (Khuyến nghị - Ổn định, miễn phí)' },
  { value: 'gemini-2.5-flash', label: 'gemini-2.5-flash (Thế hệ 2.5 cực nhanh)' },
  { value: 'gemini-2.5-pro', label: 'gemini-2.5-pro (Thế hệ 2.5 suy luận sâu)' },
  { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash (Thế hệ 2.0 đa năng)' },
  { value: 'gemini-1.5-pro', label: 'gemini-1.5-pro (Ngữ cảnh lớn 2M tokens)' },
  { value: 'custom', label: 'Tùy chỉnh (Nhập tên model khác)...' }
]

const SAMPLE_SGK_TEXT = `Hệ điều hành là tập hợp các chương trình được tổ chức thành một hệ thống với nhiệm vụ đảm bảo tương tác giữa người dùng với máy tính, cung cấp các phương tiện và dịch vụ để điều phối việc thực hiện các chương trình, quản lý chặt chẽ và sử dụng tối ưu các tài nguyên của hệ thống (như CPU, bộ nhớ trong, các thiết bị ngoại vi). Hệ điều hành đóng vai trò là môi trường trung gian kết nối giữa phần cứng máy tính và phần mềm ứng dụng.`

const SAMPLE_PROGRAMMING_PROBLEM = `Cho hai số nguyên a và b (-10^9 <= a, b <= 10^9). Hãy viết chương trình tính tổng S = a + b.
Nếu S là số chẵn, in ra màn hình "EVEN", ngược lại nếu S là số lẻ thì in ra màn hình "ODD".
Dữ liệu vào: Gồm hai số nguyên a và b cách nhau một dấu cách.
Kết quả: In ra trên một dòng chữ "EVEN" hoặc "ODD".`

// Format loại bỏ các ký tự Markdown như **, ###, #... để copy dán trực tiếp vào file Word giáo án
function formatCleanObjectives(text: string): string {
  if (!text) return ''
  return text
    .split('\n')
    .map(line => {
      let l = line.trim()
      // Bỏ các ký hiệu tiêu đề markdown #, ##, ### ở đầu dòng
      l = l.replace(/^#+\s*/, '')
      // Đổi dấu * hoặc + ở đầu dòng thành dấu gạch ngang -
      l = l.replace(/^[*+]\s+/, '- ')
      // Xóa dấu in đậm ** hoặc __
      l = l.replace(/\*\*/g, '').replace(/__/g, '')
      return l
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function AiAssistantDrawer({ open, onClose }: AiAssistantDrawerProps) {
  const { lookups, toast } = useApp()

  const [tab, setTab] = useState<'mcq' | 'testcase' | 'objectives'>('mcq')
  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  // Quick settings state
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash')
  const [customModelInput, setCustomModelInput] = useState('')
  const [availableModels, setAvailableModels] = useState<AiModelOption[]>([])
  const [testingConnection, setTestingConnection] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  // Tab 1: MCQ Generator
  const [mcqText, setMcqText] = useState('')
  const [mcqGrade, setMcqGrade] = useState<number | ''>(10)
  const [mcqTopicId, setMcqTopicId] = useState<number | ''>('')
  const [mcqCount, setMcqCount] = useState<number>(4)
  const [generatingMcq, setGeneratingMcq] = useState(false)
  const [generatedMcqList, setGeneratedMcqList] = useState<GeneratedMcqItem[]>([])
  const [savingExercises, setSavingExercises] = useState(false)
  const [copiedMcq, setCopiedMcq] = useState(false)

  // Tab 2: Testcase Generator
  const [testStatement, setTestStatement] = useState('')
  const [testLanguage, setTestLanguage] = useState('C++')
  const [testCount, setTestCount] = useState<number>(6)
  const [generatingTests, setGeneratingTests] = useState(false)
  const [generatedTests, setGeneratedTests] = useState<GeneratedTestcaseItem[]>([])
  const [copiedTests, setCopiedTests] = useState(false)

  // Tab 3: Objectives Generator
  const [objLessonName, setObjLessonName] = useState('')
  const [objGrade, setObjGrade] = useState<number | ''>(10)
  const [objRequirements, setObjRequirements] = useState('')
  const [generatingObj, setGeneratingObj] = useState(false)
  const [generatedObjMarkdown, setGeneratedObjMarkdown] = useState('')
  const [copiedObj, setCopiedObj] = useState(false)

  // Load AI Settings & Available Models
  const loadAvailableModels = async (key?: string) => {
    try {
      const list = await api.ai.models(key)
      if (list && list.length > 0) {
        setAvailableModels(list)
      }
    } catch {
      // ignore
    }
  }

  const loadSettings = async () => {
    try {
      const s = await api.ai.settings()
      setAiSettings(s)
      if (s.hasKey) {
        loadAvailableModels()
      }
      if (s.currentModel) {
        const found = MODEL_PRESETS.some(m => m.value === s.currentModel)
        if (found) {
          setSelectedModel(s.currentModel)
        } else {
          setSelectedModel('custom')
          setCustomModelInput(s.currentModel)
        }
      }
    } catch {
      // Bỏ qua lỗi kết nối ban đầu
    }
  }

  useEffect(() => {
    if (open) {
      loadSettings()
    }
  }, [open])

  // Topics filtered by grade
  const filteredTopics = useMemo(() => {
    if (!lookups?.topics) return []
    if (!mcqGrade) return lookups.topics
    return lookups.topics.filter(t => t.gradeLevelId === Number(mcqGrade))
  }, [lookups?.topics, mcqGrade])

  // Test connection
  const handleTestConnection = async () => {
    setTestingConnection(true)
    try {
      const activeModel = selectedModel === 'custom' ? customModelInput.trim() : selectedModel
      await api.ai.testConnection({
        apiKey: apiKeyInput.trim() || undefined,
        model: activeModel || undefined
      })
      await loadAvailableModels(apiKeyInput.trim() || undefined)
      toast('success', 'Kết nối Google Gemini API thành công! Khóa API và Model hoạt động chuẩn xác.')
    } catch (e: any) {
      toast('error', errText(e))
    } finally {
      setTestingConnection(false)
    }
  }

  // Save Settings
  const handleSaveSettings = async () => {
    setSavingSettings(true)
    try {
      const activeModel = selectedModel === 'custom' ? customModelInput.trim() : selectedModel
      const updated = await api.ai.saveSettings({
        apiKey: apiKeyInput.trim() || undefined,
        model: activeModel || undefined
      })
      setAiSettings(updated)
      setApiKeyInput('')
      setShowSettingsModal(false)
      toast('success', 'Đã lưu cấu hình Trợ lý AI (Gemini) thành công.')
    } catch (e: any) {
      toast('error', errText(e))
    } finally {
      setSavingSettings(false)
    }
  }

  // Generate MCQ
  const handleGenerateMcq = async () => {
    if (!mcqText.trim()) {
      toast('error', 'Vui lòng nhập hoặc dán đoạn văn bản kiến thức SGK.')
      return
    }
    setGeneratingMcq(true)
    setGeneratedMcqList([])
    try {
      const res = await api.ai.generateMcq({
        text: mcqText.trim(),
        gradeLevelId: mcqGrade ? Number(mcqGrade) : null,
        topicId: mcqTopicId ? Number(mcqTopicId) : null,
        count: mcqCount
      })
      setGeneratedMcqList(res)
      toast('success', `AI đã sinh thành công ${res.length} câu hỏi trắc nghiệm!`)
    } catch (e: any) {
      toast('error', errText(e))
    } finally {
      setGeneratingMcq(false)
    }
  }

  // Copy MCQ All
  const handleCopyMcqAll = () => {
    if (generatedMcqList.length === 0) return
    const text = generatedMcqList
      .map((q, idx) => {
        return `Câu ${idx + 1} (${q.difficultyName}): ${q.statement}
A. ${q.optionA}
B. ${q.optionB}
C. ${q.optionC}
D. ${q.optionD}
Đáp án đúng: ${q.correctAnswer}
Lời giải: ${q.solution}${q.hint ? `\nGợi ý: ${q.hint}` : ''}`
      })
      .join('\n\n')

    navigator.clipboard.writeText(text)
    setCopiedMcq(true)
    setTimeout(() => setCopiedMcq(false), 2000)
    toast('success', 'Đã sao chép tất cả câu hỏi vào bộ nhớ tạm!')
  }

  // Save MCQ to Exercises Bank
  const handleSaveMcqToBank = async () => {
    if (generatedMcqList.length === 0) return
    setSavingExercises(true)
    try {
      const res = await api.ai.saveGeneratedExercises({
        gradeLevelId: mcqGrade ? Number(mcqGrade) : null,
        topicId: mcqTopicId ? Number(mcqTopicId) : null,
        questions: generatedMcqList
      })
      toast('success', `Đã lưu thành công ${res.count} câu hỏi vào Ngân hàng bài tập!`)
    } catch (e: any) {
      toast('error', errText(e))
    } finally {
      setSavingExercises(false)
    }
  }

  // Generate Testcases
  const handleGenerateTestcases = async () => {
    if (!testStatement.trim()) {
      toast('error', 'Vui lòng nhập đề bài bài toán lập trình.')
      return
    }
    setGeneratingTests(true)
    setGeneratedTests([])
    try {
      const res = await api.ai.generateTestcases({
        statement: testStatement.trim(),
        language: testLanguage,
        count: testCount
      })
      setGeneratedTests(res)
      toast('success', `AI đã sinh thành công ${res.length} bộ testcase!`)
    } catch (e: any) {
      toast('error', errText(e))
    } finally {
      setGeneratingTests(false)
    }
  }

  // Copy Testcases Table
  const handleCopyTests = () => {
    if (generatedTests.length === 0) return
    const md = [
      '| # | Input | Output | Trường hợp kiểm thử |',
      '|---|---|---|---|',
      ...generatedTests.map(
        t => `| Test ${t.index} | \`${t.input.replace(/\n/g, '\\n')}\` | \`${t.output.replace(/\n/g, '\\n')}\` | ${t.explanation}${t.isEdgeCase ? ' *(Biên)*' : ''} |`
      )
    ].join('\n')

    navigator.clipboard.writeText(md)
    setCopiedTests(true)
    setTimeout(() => setCopiedTests(false), 2000)
    toast('success', 'Đã sao chép bảng Testcase (Markdown) vào bộ nhớ tạm!')
  }

  // Download Testcases txt
  const handleDownloadTests = () => {
    if (generatedTests.length === 0) return
    const content = generatedTests
      .map(t => `=== TEST ${t.index} (${t.isEdgeCase ? 'Biên' : 'Thường'}) - ${t.explanation} ===\n[INPUT]\n${t.input}\n[OUTPUT]\n${t.output}\n`)
      .join('\n')

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Testcases_${testLanguage}_${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast('success', 'Đã tải tệp danh sách testcase về máy!')
  }

  // Generate Objectives
  const handleGenerateObjectives = async () => {
    if (!objLessonName.trim()) {
      toast('error', 'Vui lòng nhập tên bài học.')
      return
    }
    setGeneratingObj(true)
    setGeneratedObjMarkdown('')
    try {
      const res = await api.ai.generateLessonObjectives({
        lessonName: objLessonName.trim(),
        gradeLevelId: objGrade ? Number(objGrade) : null,
        extraRequirements: objRequirements.trim() || undefined
      })
      setGeneratedObjMarkdown(formatCleanObjectives(res.objectivesMarkdown))
      toast('success', 'AI đã soạn thảo xong mục tiêu bài dạy theo CV 5512!')
    } catch (e: any) {
      toast('error', errText(e))
    } finally {
      setGeneratingObj(false)
    }
  }

  // Copy Objectives
  const handleCopyObjectives = () => {
    if (!generatedObjMarkdown) return
    navigator.clipboard.writeText(generatedObjMarkdown)
    setCopiedObj(true)
    setTimeout(() => setCopiedObj(false), 2000)
    toast('success', 'Đã sao chép mục tiêu bài dạy vào bộ nhớ tạm!')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-white dark:border-slate-800 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-500/30">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Trợ lý AI Soạn bài
                  </h2>
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                    Gemini
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Model: <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{aiSettings?.currentModel || 'gemini-3.8-flash'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                title="Cài đặt API Key & Model"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Missing API Key Warning Banner */}
          {aiSettings && !aiSettings.hasKey && (
            <div className="bg-amber-50 border-b border-amber-200 p-3.5 dark:bg-amber-950/30 dark:border-amber-900/50 flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                <span className="font-semibold">Chưa có Gemini API Key!</span> Để AI hoạt động, bạn hãy cấu hình API Key miễn phí từ Google AI Studio.
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setShowSettingsModal(true)}
                  >
                    <KeyRound className="h-3.5 w-3.5" /> Nhập API Key ngay
                  </Button>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline font-medium dark:text-indigo-400"
                  >
                    Lấy key miễn phí <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 bg-slate-50/70 px-4 pt-2 dark:border-slate-800 dark:bg-slate-900/50">
            <button
              onClick={() => setTab('mcq')}
              className={cx(
                'flex items-center gap-2 border-b-2 px-3.5 py-2 text-xs font-semibold transition',
                tab === 'mcq'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              <ListChecks className="h-3.5 w-3.5" />
              Trắc nghiệm SGK
            </button>
            <button
              onClick={() => setTab('testcase')}
              className={cx(
                'flex items-center gap-2 border-b-2 px-3.5 py-2 text-xs font-semibold transition',
                tab === 'testcase'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              <Code2 className="h-3.5 w-3.5" />
              Sinh Testcase
            </button>
            <button
              onClick={() => setTab('objectives')}
              className={cx(
                'flex items-center gap-2 border-b-2 px-3.5 py-2 text-xs font-semibold transition',
                tab === 'objectives'
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              <FileText className="h-3.5 w-3.5" />
              Mục tiêu CV 5512
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">

            {/* TAB 1: MCQ GENERATOR */}
            {tab === 'mcq' && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Nội dung văn bản kiến thức SGK:
                    </label>
                    <button
                      type="button"
                      onClick={() => setMcqText(SAMPLE_SGK_TEXT)}
                      className="text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      Dán văn bản mẫu
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={mcqText}
                    onChange={e => setMcqText(e.target.value)}
                    placeholder="Dán một đoạn văn bản kiến thức từ sách giáo khoa Tin học vào đây..."
                    className={cx(inputCls, 'text-xs')}
                  />
                  <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                    <span>AI sẽ tự động phân bổ câu hỏi theo 4 mức độ nhận thức.</span>
                    <span>{mcqText.length} ký tự</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Khối lớp
                    </label>
                    <select
                      value={mcqGrade}
                      onChange={e => setMcqGrade(e.target.value ? Number(e.target.value) : '')}
                      className={cx(inputCls, 'text-xs py-1.5')}
                    >
                      <option value="">Tất cả</option>
                      <option value="10">Khối 10</option>
                      <option value="11">Khối 11</option>
                      <option value="12">Khối 12</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Chủ đề
                    </label>
                    <select
                      value={mcqTopicId}
                      onChange={e => setMcqTopicId(e.target.value ? Number(e.target.value) : '')}
                      className={cx(inputCls, 'text-xs py-1.5')}
                    >
                      <option value="">(Tự động)</option>
                      {filteredTopics.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Số câu hỏi
                    </label>
                    <select
                      value={mcqCount}
                      onChange={e => setMcqCount(Number(e.target.value))}
                      className={cx(inputCls, 'text-xs py-1.5')}
                    >
                      <option value="4">4 câu (Chuẩn 4 mức)</option>
                      <option value="6">6 câu</option>
                      <option value="8">8 câu</option>
                      <option value="10">10 câu</option>
                    </select>
                  </div>
                </div>

                <Button
                  variant="primary"
                  className="w-full shadow-md"
                  loading={generatingMcq}
                  onClick={handleGenerateMcq}
                >
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  AI Tạo câu hỏi trắc nghiệm
                </Button>

                {/* Kết quả câu hỏi trắc nghiệm */}
                {generatedMcqList.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Kết quả: {generatedMcqList.length} câu hỏi
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          onClick={handleCopyMcqAll}
                          title="Sao chép toàn bộ câu hỏi dạng text"
                        >
                          {copiedMcq ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedMcq ? 'Đã chép' : 'Sao chép tất cả'}
                        </Button>
                        <Button
                          size="sm"
                          variant="primary"
                          loading={savingExercises}
                          onClick={handleSaveMcqToBank}
                          title="Lưu tất cả câu hỏi vào cơ sở dữ liệu Ngân hàng bài tập"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Lưu vào kho bài tập
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {generatedMcqList.map((q, idx) => {
                        const diffBadge = {
                          1: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
                          2: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300',
                          3: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
                          4: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                        }[q.difficulty] || 'bg-slate-100 text-slate-700'

                        return (
                          <div
                            key={idx}
                            className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 text-xs space-y-2 dark:border-slate-800 dark:bg-slate-900/40 shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-slate-700 dark:text-slate-200">
                                Câu {idx + 1}:
                              </span>
                              <span className={cx('rounded-full border px-2 py-0.5 text-[10px] font-semibold', diffBadge)}>
                                {q.difficultyName}
                              </span>
                            </div>

                            <p className="font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                              {q.statement}
                            </p>

                            <div className="grid grid-cols-2 gap-1.5 pt-1">
                              {[
                                { key: 'A', text: q.optionA },
                                { key: 'B', text: q.optionB },
                                { key: 'C', text: q.optionC },
                                { key: 'D', text: q.optionD }
                              ].map(opt => {
                                const isCorrect = q.correctAnswer?.toUpperCase() === opt.key
                                return (
                                  <div
                                    key={opt.key}
                                    className={cx(
                                      'flex items-start gap-1.5 rounded-lg border p-1.5 text-[11px] leading-snug',
                                      isCorrect
                                        ? 'border-emerald-500 bg-emerald-50/80 font-medium text-emerald-900 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-200 shadow-xs'
                                        : 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
                                    )}
                                  >
                                    <span
                                      className={cx(
                                        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                                        isCorrect
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                      )}
                                    >
                                      {opt.key}
                                    </span>
                                    <span>{opt.text}</span>
                                  </div>
                                )
                              })}
                            </div>

                            {q.solution && (
                              <div className="rounded bg-indigo-50/70 p-2 text-[11px] text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200 mt-1">
                                <span className="font-semibold">Giải thích: </span>
                                {q.solution}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: TESTCASE GENERATOR */}
            {tab === 'testcase' && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      Đề bài bài toán lập trình:
                    </label>
                    <button
                      type="button"
                      onClick={() => setTestStatement(SAMPLE_PROGRAMMING_PROBLEM)}
                      className="text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      Dán đề bài mẫu
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={testStatement}
                    onChange={e => setTestStatement(e.target.value)}
                    placeholder="Nhập hoặc dán đề bài lập trình (kèm giới hạn dữ liệu n, a[i] nếu có)..."
                    className={cx(inputCls, 'text-xs')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Ngôn ngữ lập trình
                    </label>
                    <select
                      value={testLanguage}
                      onChange={e => setTestLanguage(e.target.value)}
                      className={cx(inputCls, 'text-xs py-1.5')}
                    >
                      <option value="C++">C++ (g++)</option>
                      <option value="Python">Python 3</option>
                      <option value="Pascal">Pascal / FreePascal</option>
                      <option value="Java">Java</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Số lượng testcase
                    </label>
                    <select
                      value={testCount}
                      onChange={e => setTestCount(Number(e.target.value))}
                      className={cx(inputCls, 'text-xs py-1.5')}
                    >
                      <option value="5">5 bộ test</option>
                      <option value="6">6 bộ test (Gợi ý)</option>
                      <option value="8">8 bộ test</option>
                      <option value="10">10 bộ test</option>
                    </select>
                  </div>
                </div>

                <Button
                  variant="primary"
                  className="w-full shadow-md"
                  loading={generatingTests}
                  onClick={handleGenerateTestcases}
                >
                  <Code2 className="h-4 w-4 text-emerald-300" />
                  AI Sinh bộ Testcase biên
                </Button>

                {/* Kết quả Testcase */}
                {generatedTests.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Danh sách {generatedTests.length} bộ test
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          onClick={handleCopyTests}
                          title="Sao chép bảng dạng Markdown"
                        >
                          {copiedTests ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedTests ? 'Đã chép' : 'Sao chép bảng'}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={handleDownloadTests}
                          title="Tải tệp testcase về máy"
                        >
                          <Download className="h-3.5 w-3.5" /> Tải về
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 overflow-hidden dark:border-slate-800 shadow-xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/80 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="py-2 px-2.5 w-12 text-center">#</th>
                            <th className="py-2 px-2.5">Input</th>
                            <th className="py-2 px-2.5">Output</th>
                            <th className="py-2 px-2.5">Kiểm thử / Biên</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 font-mono">
                          {generatedTests.map(t => (
                            <tr key={t.index} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="py-2 px-2.5 text-center font-sans font-semibold text-slate-500">
                                {t.index}
                              </td>
                              <td className="py-2 px-2.5 text-indigo-600 dark:text-indigo-400 whitespace-pre-wrap">
                                {t.input}
                              </td>
                              <td className="py-2 px-2.5 text-emerald-600 dark:text-emerald-400 font-bold whitespace-pre-wrap">
                                {t.output}
                              </td>
                              <td className="py-2 px-2.5 font-sans text-[11px] text-slate-600 dark:text-slate-300">
                                {t.isEdgeCase && (
                                  <span className="inline-block mr-1 rounded bg-amber-100 px-1 py-0.2 text-[9px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                    BIÊN
                                  </span>
                                )}
                                {t.explanation}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: OBJECTIVES CV 5512 */}
            {tab === 'objectives' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Tên bài học: <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={objLessonName}
                    onChange={e => setObjLessonName(e.target.value)}
                    placeholder="Ví dụ: Bài 1. Thông tin và dữ liệu, Bài 12. Kiểu dữ liệu xâu..."
                    className={cx(inputCls, 'text-xs')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Khối lớp
                    </label>
                    <select
                      value={objGrade}
                      onChange={e => setObjGrade(e.target.value ? Number(e.target.value) : '')}
                      className={cx(inputCls, 'text-xs py-1.5')}
                    >
                      <option value="10">Lớp 10</option>
                      <option value="11">Lớp 11</option>
                      <option value="12">Lớp 12</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Định dạng chuẩn
                    </label>
                    <div className="rounded border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600 font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      Công văn 5512/BGDĐT
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Yêu cầu bổ sung của bạn (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={objRequirements}
                    onChange={e => setObjRequirements(e.target.value)}
                    placeholder="Ví dụ: Chú trọng rèn năng lực giải quyết vấn đề với Python..."
                    className={cx(inputCls, 'text-xs')}
                  />
                </div>

                <Button
                  variant="primary"
                  className="w-full shadow-md"
                  loading={generatingObj}
                  onClick={handleGenerateObjectives}
                >
                  <FileText className="h-4 w-4 text-sky-300" />
                  AI Soạn mục tiêu bài dạy (CV 5512)
                </Button>

                {/* Kết quả Mục tiêu CV 5512 */}
                {generatedObjMarkdown && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Bản thảo Mục tiêu bài dạy
                      </div>
                      <Button
                        size="sm"
                        onClick={handleCopyObjectives}
                        title="Sao chép nội dung để dán vào file Word giáo án"
                      >
                        {copiedObj ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedObj ? 'Đã sao chép' : 'Sao chép văn bản'}
                      </Button>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs leading-relaxed text-slate-800 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200 whitespace-pre-wrap select-text">
                      {generatedObjMarkdown}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Quick Settings Modal Popover */}
          {showSettingsModal && (
            <div className="absolute inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 dark:bg-slate-900 dark:border-slate-800 space-y-4 animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Cài đặt Gemini API Key & Model
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowSettingsModal(false)}
                    className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-200">
                        Gemini API Key cá nhân:
                      </label>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:underline dark:text-indigo-400 font-medium"
                      >
                        Lấy key miễn phí tại Google AI Studio <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="relative">
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={apiKeyInput}
                        onChange={e => setApiKeyInput(e.target.value)}
                        placeholder={aiSettings?.hasKey ? `Đã lưu: ${aiSettings.maskedKey}` : 'Dán chuỗi khóa API (AIzaSy...)'}
                        className={cx(inputCls, 'text-xs pr-9')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">
                      Khóa được lưu cục bộ an toàn trên máy tính của bạn và không gửi qua bất kỳ máy chủ bên thứ ba nào.
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Model Gemini:
                    </label>
                    <select
                      value={selectedModel}
                      onChange={e => setSelectedModel(e.target.value)}
                      className={cx(inputCls, 'text-xs')}
                    >
                      {availableModels.length > 0 && (
                        <optgroup label="Model có sẵn trong tài khoản Google của bạn:">
                          {availableModels.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.id} ({m.displayName})
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="Model đề xuất:">
                        {MODEL_PRESETS.map(m => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {selectedModel === 'custom' && (
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                        Tên Model tùy chỉnh:
                      </label>
                      <input
                        type="text"
                        value={customModelInput}
                        onChange={e => setCustomModelInput(e.target.value)}
                        placeholder="Ví dụ: gemini-3.8-flash, gemini-exp-1206..."
                        className={cx(inputCls, 'text-xs')}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={testingConnection}
                    onClick={handleTestConnection}
                    disabled={!apiKeyInput.trim() && !aiSettings?.hasKey}
                  >
                    Kiểm tra kết nối
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowSettingsModal(false)}
                    >
                      Đóng
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      loading={savingSettings}
                      onClick={handleSaveSettings}
                    >
                      Lưu cài đặt
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

