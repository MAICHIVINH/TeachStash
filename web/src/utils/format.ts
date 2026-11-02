export const formatBytes = (n: number) => {
  if (n < 1024) return `${n} B`
  const u = ['KB', 'MB', 'GB']; let v = n / 1024, i = 0
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++ }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${u[i]}`
}
export const formatDate = (s: string | null | undefined, withTime = false) => {
  if (!s) return '—'
  const d = new Date(s)
  return withTime ? d.toLocaleString('vi-VN') : d.toLocaleDateString('vi-VN')
}
export const DIFFICULTIES: Record<number, string> = { 1: 'Nhận biết', 2: 'Thông hiểu', 3: 'Vận dụng', 4: 'Vận dụng cao' }
export const DIFFICULTY_STYLE: Record<number, string> = {
  1: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  2: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  3: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  4: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
}
export const splitTags = (s: string) => s.split(/[,;]/).map(t => t.trim().replace(/\s+/g, ' ')).filter(Boolean)
export const uniqueTags = (tags: string[]) => {
  const seen = new Set<string>(); const out: string[] = []
  for (const t of tags) { const k = t.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(t) } }
  return out
}
// Tên ngôn ngữ trong ứng dụng → tên highlight.js
export const HLJS_LANG: Record<string, string> = {
  'Python': 'python', 'C++': 'cpp', 'Pascal': 'delphi', 'C#': 'csharp', 'Java': 'java',
  'JavaScript': 'javascript', 'HTML/CSS': 'xml', 'SQL': 'sql', 'Scratch': 'plaintext',
}
export const EXT_LANG: Record<string, string> = {
  py: 'python', cpp: 'cpp', c: 'cpp', h: 'cpp', hpp: 'cpp', cs: 'csharp', java: 'java', js: 'javascript',
  html: 'xml', css: 'css', sql: 'sql', pas: 'delphi', json: 'json', md: 'plaintext', txt: 'plaintext', csv: 'plaintext',
}
