import { useMemo, useRef, useState } from 'react'
import hljs from 'highlight.js/lib/core'
import python from 'highlight.js/lib/languages/python'
import cpp from 'highlight.js/lib/languages/cpp'
import delphi from 'highlight.js/lib/languages/delphi'
import csharp from 'highlight.js/lib/languages/csharp'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import sql from 'highlight.js/lib/languages/sql'
import json from 'highlight.js/lib/languages/json'
import { Check, Copy } from 'lucide-react'
import { Button } from './ui'
import { HLJS_LANG } from '../utils/format'

Object.entries({ python, cpp, delphi, csharp, java, javascript, xml, css, sql, json }).forEach(([n, l]) => hljs.registerLanguage(n, l))

const MAX_HIGHLIGHT = 300_000
const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text) }
  catch {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select()
    document.execCommand('copy'); ta.remove()
  }
}

/** `language` nhận tên trong ứng dụng ("C++", "Pascal"...) hoặc tên highlight.js ("cpp"). */
export function CodeBlock({ code, language, maxHeight = '28rem', showCopy = true }: { code: string; language?: string; maxHeight?: string; showCopy?: boolean }) {
  const [copied, setCopied] = useState(false)
  const lang = language ? (HLJS_LANG[language] ?? language) : 'plaintext'
  const html = useMemo(() => {
    if (code.length > MAX_HIGHLIGHT || lang === 'plaintext' || !hljs.getLanguage(lang)) return escapeHtml(code)
    try { return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value } catch { return escapeHtml(code) }
  }, [code, lang])
  const lines = code.split('\n').length
  const doCopy = async () => { await copyText(code); setCopied(true); setTimeout(() => setCopied(false), 1500) }
  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
      {showCopy && <Button size="sm" className="absolute right-2 top-2 z-10" onClick={doCopy}>{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? 'Đã chép' : 'Sao chép'}</Button>}
      <div className="selectable flex overflow-auto" style={{ maxHeight }}>
        <pre aria-hidden className="code-font sticky left-0 select-none border-r border-slate-200 bg-slate-100 px-3 py-3 text-right text-slate-400 dark:border-slate-700 dark:bg-slate-800">{Array.from({ length: lines }, (_, i) => i + 1).join('\n')}</pre>
        <pre className="code-font m-0 flex-1 px-4 py-3 pr-28"><code className="hljs" dangerouslySetInnerHTML={{ __html: html }} /></pre>
      </div>
    </div>
  )
}

/** Trình soạn mã: giữ nguyên thụt lề; Tab chèn 4 dấu cách. */
export function CodeEditor({ value, onChange, rows = 16 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const lines = value.split('\n').length
  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget
    if (e.key === 'Tab') {
      e.preventDefault()
      const s = ta.selectionStart, en = ta.selectionEnd
      onChange(value.slice(0, s) + '    ' + value.slice(en))
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 4 })
    } else if (e.key === 'Enter') { // giữ thụt lề của dòng hiện tại
      const s = ta.selectionStart
      const lineStart = value.lastIndexOf('\n', s - 1) + 1
      const indent = /^[ \t]*/.exec(value.slice(lineStart, s))![0]
      e.preventDefault()
      const ins = '\n' + indent
      onChange(value.slice(0, s) + ins + value.slice(ta.selectionEnd))
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + ins.length })
    }
  }
  return (
    <div className="flex overflow-hidden rounded-md border border-slate-300 bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/30 dark:border-slate-600 dark:bg-slate-800">
      <pre aria-hidden className="code-font select-none border-r border-slate-200 bg-slate-100 px-3 py-2 text-right text-slate-400 dark:border-slate-700 dark:bg-slate-900">{Array.from({ length: Math.max(lines, rows) }, (_, i) => i + 1).join('\n')}</pre>
      <textarea ref={ref} value={value} onChange={e => onChange(e.target.value)} onKeyDown={onKey} rows={rows} spellCheck={false} wrap="off"
        className="code-font flex-1 resize-y whitespace-pre bg-transparent px-3 py-2 outline-none" style={{ overflow: 'auto' }} />
    </div>
  )
}
