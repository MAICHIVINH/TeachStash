import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  Packer,
  PageOrientation,
  ShadingType
} from 'docx'
import type { TeachingScheduleItem } from '../types'
import { parsePeriods, formatPeriodsSummary } from './format'

const FONT_FAMILY = 'Times New Roman'

const BORDER_SINGLE = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: '94A3B8'
}

const TABLE_BORDERS = {
  top: BORDER_SINGLE,
  bottom: BORDER_SINGLE,
  left: BORDER_SINGLE,
  right: BORDER_SINGLE,
  insideHorizontal: BORDER_SINGLE,
  insideVertical: BORDER_SINGLE
}

export async function exportTeachingPlanToDocx(
  gradeName: string,
  academicYear: string,
  items: TeachingScheduleItem[]
) {
  // Sort items by week, then period
  const sorted = [...items].sort((a, b) => {
    if (a.weekNumber !== b.weekNumber) return a.weekNumber - b.weekNumber
    return a.periodNumber - b.periodNumber
  })

  const gradeNumber = gradeName.replace(/[^\d]/g, '')
  const gradeLabel = gradeNumber ? `LỚP ${gradeNumber}` : gradeName.toUpperCase()

  let displayYear = academicYear.trim()
  if (displayYear.includes('-') && !displayYear.includes(' - ')) {
    displayYear = displayYear.replace('-', ' - ')
  }
  if (!displayYear) {
    displayYear = '2026 - 2027'
  }

  // Header 2-column table (TRƯỜNG / TỔ / GIÁO VIÊN & QUỐC HIỆU / TIÊU NGỮ)
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE },
      bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE }
    },
    rows: [
      new TableRow({
        children: [
          // Cột trái: TRƯỜNG, TỔ, Họ và tên giáo viên
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE }
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 60, line: 260 },
                children: [
                  new TextRun({ text: 'TRƯỜNG: ', bold: true, size: 24, font: FONT_FAMILY }),
                  new TextRun({ text: '....................................................', size: 24, font: FONT_FAMILY })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 60, line: 260 },
                children: [
                  new TextRun({ text: 'TỔ: ', bold: true, size: 24, font: FONT_FAMILY }),
                  new TextRun({ text: '.............................................................', size: 24, font: FONT_FAMILY })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 60, line: 260 },
                children: [
                  new TextRun({ text: 'Họ và tên giáo viên: ', size: 24, font: FONT_FAMILY }),
                  new TextRun({ text: '.....................................', size: 24, font: FONT_FAMILY })
                ]
              })
            ]
          }),

          // Cột phải: Quốc hiệu, Tiêu ngữ và đường gạch chân
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE }
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 60, line: 260 },
                children: [
                  new TextRun({
                    text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
                    bold: true,
                    size: 24,
                    font: FONT_FAMILY
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 30, line: 260 },
                children: [
                  new TextRun({
                    text: 'Độc lập - Tự do - Hạnh phúc',
                    bold: true,
                    size: 24,
                    font: FONT_FAMILY
                  })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 0 },
                children: [
                  new TextRun({
                    text: '───────────────',
                    bold: true,
                    size: 22,
                    font: FONT_FAMILY
                  })
                ]
              })
            ]
          })
        ]
      })
    ]
  })

  // Table rows
  const tableRows: TableRow[] = []

  // 1. Table Header
  tableRows.push(
    new TableRow({
      tableHeader: true,
      children: [
        headerCell('STT', 6),
        headerCell('PPCT', 10),
        headerCell('Bài học', 28, AlignmentType.LEFT),
        headerCell('Số tiết', 8),
        headerCell('Tuần', 6),
        headerCell('Thiết bị dạy học', 24, AlignmentType.LEFT),
        headerCell('Địa điểm dạy học', 18),
      ]
    })
  )

  let currentSemester: number | null = null
  let currentTopicId: number | null = null
  let sttCounter = 1

  sorted.forEach(item => {
    const sem = item.weekNumber <= 18 ? 1 : 2

    // Check semester change
    if (currentSemester !== sem) {
      currentSemester = sem
      tableRows.push(
        new TableRow({
          children: [
            groupCell(`HỌC KỲ ${sem}`, 7, 'E2E8F0')
          ]
        })
      )
    }

    // Check topic change
    if (currentTopicId !== item.topicId) {
      currentTopicId = item.topicId
      const topicItems = sorted.filter(
        x => (x.weekNumber <= 18 ? 1 : 2) === sem && x.topicId === item.topicId
      )
      let countLT = 0
      let countTH = 0
      topicItems.forEach(x => {
        const p = parsePeriods(x.numberOfPeriods)
        countLT += p.lt
        countTH += p.th
      })
      const summary = formatPeriodsSummary(countLT, countTH)
      const baseName = item.topicName
        ? item.topicName.toUpperCase()
        : 'CHỦ ĐỀ KHÁC / BÀI HỌC BỔ TRỢ'
      const topicText = `${baseName}${summary}`
      tableRows.push(
        new TableRow({
          children: [
            groupCell(topicText, 7, 'F1F5F9')
          ]
        })
      )
    }

    // Lesson row
    const ppct = item.periodName || `${item.periodNumber}`
    const periods = item.numberOfPeriods || '2LT'
    const equipment = item.equipment || 'SGK, SGV, Máy tính nối mạng, tivi, các clip minh họa.'
    const location = item.location || 'Phòng học/Phòng máy'

    tableRows.push(
      new TableRow({
        children: [
          bodyCell(String(sttCounter++), 6, AlignmentType.CENTER),
          bodyCell(ppct, 10, AlignmentType.CENTER),
          bodyCell(item.title, 28, AlignmentType.LEFT, true),
          bodyCell(periods, 8, AlignmentType.CENTER),
          bodyCell(String(item.weekNumber), 6, AlignmentType.CENTER),
          bodyCell(equipment, 24, AlignmentType.LEFT),
          bodyCell(location, 18, AlignmentType.CENTER),
        ]
      })
    )
  })

  const mainTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS,
    rows: tableRows
  })

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE
            },
            margin: {
              top: 1000,
              bottom: 1000,
              left: 1000,
              right: 1000
            }
          }
        },
        children: [
          // 1. Khung đầu trang 2 cột (Trường, Tổ, Giáo viên & Quốc hiệu, Tiêu ngữ)
          headerTable,

          // 2. Tiêu đề dòng 1: KẾ HOẠCH GIÁO DỤC CỦA GIÁO VIÊN
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 260, after: 70 },
            children: [
              new TextRun({
                text: 'KẾ HOẠCH GIÁO DỤC CỦA GIÁO VIÊN',
                bold: true,
                size: 28, // 14pt
                font: FONT_FAMILY
              })
            ]
          }),

          // 3. Tiêu đề dòng 2: MÔN HỌC/HOẠT ĐỘNG GIÁO DỤC TIN HỌC, LỚP 11
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 70 },
            children: [
              new TextRun({
                text: `MÔN HỌC/HOẠT ĐỘNG GIÁO DỤC TIN HỌC, ${gradeLabel}`,
                bold: true,
                size: 26, // 13pt
                font: FONT_FAMILY
              })
            ]
          }),

          // 4. Tiêu đề dòng 3: (Năm học 2026 - 2027)
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 280 },
            children: [
              new TextRun({
                text: `(Năm học ${displayYear})`,
                size: 26, // 13pt
                font: FONT_FAMILY
              })
            ]
          }),

          // 5. Bảng phân phối chương trình chi tiết
          mainTable,

          // Signatures footer
          new Paragraph({
            spacing: { before: 500 },
            children: [new TextRun({ text: '', font: FONT_FAMILY })]
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE }
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'TỔ TRƯỞNG CHUYÊN MÔN', bold: true, size: 24, font: FONT_FAMILY }),
                          new TextRun({ text: '\n(Ký và ghi rõ họ tên)\n\n\n\n', italics: true, size: 22, font: FONT_FAMILY }),
                        ]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    children: [
                      new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [
                          new TextRun({ text: 'GIÁO VIÊN BỘ MÔN', bold: true, size: 24, font: FONT_FAMILY }),
                          new TextRun({ text: '\n(Ký và ghi rõ họ tên)\n\n\n\n', italics: true, size: 22, font: FONT_FAMILY }),
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      }
    ]
  })

  const blob = await Packer.toBlob(doc)
  const cleanGrade = gradeName.replace(/[^a-zA-Z0-9]/g, '_')
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Ke_hoach_day_hoc_TinHoc_${cleanGrade}.docx`
  a.click()
  URL.revokeObjectURL(url)
}

function headerCell(text: string, widthPct: number, align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.CENTER) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
    children: [
      new Paragraph({
        alignment: align,
        children: [
          new TextRun({ text, bold: true, size: 20, font: FONT_FAMILY, color: '0F172A' })
        ]
      })
    ]
  })
}

function groupCell(text: string, colSpan: number, fillHex: string) {
  return new TableCell({
    columnSpan: colSpan,
    shading: { type: ShadingType.CLEAR, fill: fillHex },
    children: [
      new Paragraph({
        children: [
          new TextRun({ text, bold: true, size: 20, font: FONT_FAMILY, color: '0F172A' })
        ]
      })
    ]
  })
}

function bodyCell(
  text: string,
  widthPct: number,
  align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT,
  bold = false
) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        alignment: align,
        children: [
          new TextRun({ text: text || '', bold, size: 20, font: FONT_FAMILY, color: '1E293B' })
        ]
      })
    ]
  })
}
