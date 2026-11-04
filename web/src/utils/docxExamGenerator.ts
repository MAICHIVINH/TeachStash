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
  HeadingLevel,
} from 'docx'
import JSZip from 'jszip'
import type { Exercise } from '../types'

export interface ShuffledQuestion {
  originalId: number
  questionNumber: number
  statement: string
  exerciseType: number
  difficulty: number
  options?: { key: 'A' | 'B' | 'C' | 'D'; text: string; isCorrect: boolean }[]
  correctKey?: 'A' | 'B' | 'C' | 'D'
  solution?: string
  hint?: string
  sampleCode?: string
  score?: number
}

export interface GeneratedExamCode {
  code: string
  mcqQuestions: ShuffledQuestion[]
  essayQuestions: ShuffledQuestion[]
}

export interface ExamGenerationConfig {
  headerSchool: string
  headerExamName: string
  gradeName: string
  durationMinutes: number
  totalScore: number
  codes: GeneratedExamCode[]
  matrixSummary: {
    topicName: string
    recognize: number
    understand: number
    apply: number
    advanced: number
    total: number
  }[]
}

const FONT_FAMILY = 'Times New Roman'
const BORDER_NONE = {
  style: BorderStyle.NONE,
  size: 0,
  color: 'auto',
}

const TABLE_NO_BORDERS = {
  top: BORDER_NONE,
  bottom: BORDER_NONE,
  left: BORDER_NONE,
  right: BORDER_NONE,
  insideHorizontal: BORDER_NONE,
  insideVertical: BORDER_NONE,
}

const CELL_NO_BORDERS = {
  top: BORDER_NONE,
  bottom: BORDER_NONE,
  left: BORDER_NONE,
  right: BORDER_NONE,
}

const TABLE_CELL_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 4, color: '888888' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: '888888' },
  left: { style: BorderStyle.SINGLE, size: 4, color: '888888' },
  right: { style: BorderStyle.SINGLE, size: 4, color: '888888' },
}

/**
 * Tạo tài liệu Word (.docx) cho một mã đề thi cụ thể
 */
export async function createExamDocx(
  cfg: ExamGenerationConfig,
  exam: GeneratedExamCode
): Promise<Blob> {
  const children: (Paragraph | Table)[] = []

  // 1. Header 2 cột: Cột trái (Trường / Họ tên), Cột phải (Tên kỳ thi / Môn / Mã đề)
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_NO_BORDERS,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: CELL_NO_BORDERS,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: cfg.headerSchool ? cfg.headerSchool.toUpperCase() : 'TRƯỜNG THPT .................................', font: FONT_FAMILY, size: 22, bold: true }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Họ và tên: .................................................', font: FONT_FAMILY, size: 22 }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'Lớp: ................. SBD: ................................', font: FONT_FAMILY, size: 22 }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            borders: CELL_NO_BORDERS,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: (cfg.headerExamName || 'ĐỀ KIỂM TRA ĐỊNH KỲ').toUpperCase(), font: FONT_FAMILY, size: 22, bold: true }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `MÔN: TIN HỌC - ${cfg.gradeName.toUpperCase()}`, font: FONT_FAMILY, size: 22, bold: true }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `Thời gian làm bài: ${cfg.durationMinutes} phút`, font: FONT_FAMILY, size: 20, italics: true }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: `MÃ ĐỀ THI: ${exam.code}`, font: FONT_FAMILY, size: 24, bold: true }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  })
  children.push(headerTable)

  children.push(new Paragraph({ spacing: { after: 200 } }))

  // 2. PHẦN I. TRẮC NGHIỆM KHÁCH QUAN
  if (exam.mcqQuestions.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 150, after: 120 },
        children: [
          new TextRun({
            text: `PHẦN I. TRẮC NGHIỆM KHÁCH QUAN (${exam.mcqQuestions.length} câu)`,
            font: FONT_FAMILY,
            size: 24,
            bold: true,
          }),
        ],
      })
    )

    exam.mcqQuestions.forEach((q, idx) => {
      // Nội dung câu hỏi
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 60 },
          children: [
            new TextRun({ text: `Câu ${idx + 1}: `, font: FONT_FAMILY, size: 22, bold: true }),
            new TextRun({ text: q.statement, font: FONT_FAMILY, size: 22 }),
          ],
        })
      )

      // 4 phương án A, B, C, D
      if (q.options && q.options.length > 0) {
        const optionTable = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: TABLE_NO_BORDERS,
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: CELL_NO_BORDERS,
                  children: [
                    new Paragraph({
                      spacing: { before: 40, after: 40 },
                      children: [
                        new TextRun({ text: `A. `, font: FONT_FAMILY, size: 22, bold: true }),
                        new TextRun({ text: q.options[0]?.text || '', font: FONT_FAMILY, size: 22 }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: CELL_NO_BORDERS,
                  children: [
                    new Paragraph({
                      spacing: { before: 40, after: 40 },
                      children: [
                        new TextRun({ text: `B. `, font: FONT_FAMILY, size: 22, bold: true }),
                        new TextRun({ text: q.options[1]?.text || '', font: FONT_FAMILY, size: 22 }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: CELL_NO_BORDERS,
                  children: [
                    new Paragraph({
                      spacing: { before: 40, after: 40 },
                      children: [
                        new TextRun({ text: `C. `, font: FONT_FAMILY, size: 22, bold: true }),
                        new TextRun({ text: q.options[2]?.text || '', font: FONT_FAMILY, size: 22 }),
                      ],
                    }),
                  ],
                }),
                new TableCell({
                  width: { size: 50, type: WidthType.PERCENTAGE },
                  borders: CELL_NO_BORDERS,
                  children: [
                    new Paragraph({
                      spacing: { before: 40, after: 40 },
                      children: [
                        new TextRun({ text: `D. `, font: FONT_FAMILY, size: 22, bold: true }),
                        new TextRun({ text: q.options[3]?.text || '', font: FONT_FAMILY, size: 22 }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        })
        children.push(optionTable)
      }
    })
  }

  // 3. PHẦN II. TỰ LUẬN / VIẾT MÃ NGUỒN
  if (exam.essayQuestions.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: `PHẦN II. TỰ LUẬN / VIẾT MÃ NGUỒN (${exam.essayQuestions.length} câu)`,
            font: FONT_FAMILY,
            size: 24,
            bold: true,
          }),
        ],
      })
    )

    exam.essayQuestions.forEach((q, idx) => {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 80 },
          children: [
            new TextRun({ text: `Câu ${idx + 1} (${q.score || 1.0} điểm): `, font: FONT_FAMILY, size: 22, bold: true }),
            new TextRun({ text: q.statement, font: FONT_FAMILY, size: 22 }),
          ],
        })
      )

      // Khoảng kẻ dòng trống để học sinh viết bài
      for (let i = 0; i < 4; i++) {
        children.push(
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({
                text: '........................................................................................................................................................................',
                font: FONT_FAMILY,
                size: 20,
                color: '999999',
              }),
            ],
          })
        )
      }
    })
  }

  // Footer
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 300, after: 100 },
      children: [
        new TextRun({
          text: '---------- HẾT ----------',
          font: FONT_FAMILY,
          size: 22,
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: '(Cán bộ coi thi không giải thích gì thêm - Thí sinh không được sử dụng tài liệu)',
          font: FONT_FAMILY,
          size: 20,
          italics: true,
        }),
      ],
    })
  )

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134, // 2 cm
              bottom: 1134,
              left: 1417, // 2.5 cm
              right: 1134, // 2 cm
            },
          },
        },
        children,
      },
    ],
  })

  return await Packer.toBlob(doc)
}

/**
 * Tạo tài liệu Word (.docx) chứa Bảng Ma trận và Bảng Đáp án soi chéo các mã đề
 */
export async function createAnswerAndMatrixDocx(cfg: ExamGenerationConfig): Promise<Blob> {
  const children: (Paragraph | Table)[] = []

  // Tiêu đề chính
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'HƯỚNG DẪN CHẤM, ĐÁP ÁN & MA TRẬN ĐẶC TẢ ĐỀ THI',
          font: FONT_FAMILY,
          size: 26,
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `MÔN: TIN HỌC - ${cfg.gradeName.toUpperCase()} - THỜI GIAN: ${cfg.durationMinutes} PHÚT`,
          font: FONT_FAMILY,
          size: 22,
          italics: true,
        }),
      ],
    })
  )

  // 1. BẢNG SOI ĐÁP ÁN TRẮC NGHIỆM CHÉO
  const totalMcq = cfg.codes[0]?.mcqQuestions.length || 0
  if (totalMcq > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 180, after: 100 },
        children: [
          new TextRun({
            text: 'I. BẢNG ĐÁP ÁN TRẮC NGHIỆM THEO TỪNG MÃ ĐỀ',
            font: FONT_FAMILY,
            size: 24,
            bold: true,
          }),
        ],
      })
    )

    // Bảng: Cột 1 là Câu số, các cột tiếp theo là từng mã đề
    const headerRow = new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          borders: TABLE_CELL_BORDERS,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Câu', font: FONT_FAMILY, size: 20, bold: true })] })],
        }),
        ...cfg.codes.map(c => new TableCell({
          borders: TABLE_CELL_BORDERS,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Mã ${c.code}`, font: FONT_FAMILY, size: 20, bold: true })] })],
        })),
      ],
    })

    const rows: TableRow[] = [headerRow]
    for (let i = 0; i < totalMcq; i++) {
      rows.push(
        new TableRow({
          children: [
            new TableCell({
              borders: TABLE_CELL_BORDERS,
              children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${i + 1}`, font: FONT_FAMILY, size: 20, bold: true })] })],
            }),
            ...cfg.codes.map(c => {
              const q = c.mcqQuestions[i]
              const ans = q?.correctKey || '-'
              return new TableCell({
                borders: TABLE_CELL_BORDERS,
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: ans, font: FONT_FAMILY, size: 20, bold: true, color: '006600' })] })],
              })
            }),
          ],
        })
      )
    }

    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }))
  }

  // 2. HƯỚNG DẪN CHẤM TỰ LUẬN
  const essayQuestions = cfg.codes[0]?.essayQuestions || []
  if (essayQuestions.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 100 },
        children: [
          new TextRun({
            text: 'II. HƯỚNG DẪN CHẤM & LỜI GIẢI PHẦN TỰ LUẬN',
            font: FONT_FAMILY,
            size: 24,
            bold: true,
          }),
        ],
      })
    )

    essayQuestions.forEach((q, idx) => {
      children.push(
        new Paragraph({
          spacing: { before: 100, after: 60 },
          children: [
            new TextRun({ text: `Câu ${idx + 1} (${q.score || 1.0} điểm): `, font: FONT_FAMILY, size: 22, bold: true }),
            new TextRun({ text: q.statement, font: FONT_FAMILY, size: 22 }),
          ],
        }),
        new Paragraph({
          spacing: { before: 40, after: 60 },
          children: [
            new TextRun({ text: `* Lời giải / Đáp án: `, font: FONT_FAMILY, size: 22, bold: true, color: '006600' }),
            new TextRun({ text: q.solution || q.hint || 'Theo barem chấm của tổ chuyên môn.', font: FONT_FAMILY, size: 22 }),
          ],
        })
      )
      if (q.sampleCode) {
        children.push(
          new Paragraph({
            spacing: { before: 40, after: 80 },
            children: [
              new TextRun({ text: `* Mã nguồn mẫu:\n${q.sampleCode}`, font: 'Consolas', size: 18 }),
            ],
          })
        )
      }
    })
  }

  // 3. BẢNG MA TRẬN ĐỀ THI GDPT 2018
  if (cfg.matrixSummary.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 100 },
        children: [
          new TextRun({
            text: 'III. BẢNG MA TRẬN ĐỀ THI THEO MỨC ĐỘ NHẬN THỨC GDPT 2018',
            font: FONT_FAMILY,
            size: 24,
            bold: true,
          }),
        ],
      })
    )

    const matrixHeader = new TableRow({
      tableHeader: true,
      children: [
        new TableCell({ borders: TABLE_CELL_BORDERS, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'TT', font: FONT_FAMILY, size: 20, bold: true })] })] }),
        new TableCell({ borders: TABLE_CELL_BORDERS, children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: 'Chủ đề / Đơn vị kiến thức', font: FONT_FAMILY, size: 20, bold: true })] })] }),
        new TableCell({ borders: TABLE_CELL_BORDERS, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Nhận biết', font: FONT_FAMILY, size: 20, bold: true })] })] }),
        new TableCell({ borders: TABLE_CELL_BORDERS, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Thông hiểu', font: FONT_FAMILY, size: 20, bold: true })] })] }),
        new TableCell({ borders: TABLE_CELL_BORDERS, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Vận dụng', font: FONT_FAMILY, size: 20, bold: true })] })] }),
        new TableCell({ borders: TABLE_CELL_BORDERS, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Vận dụng cao', font: FONT_FAMILY, size: 20, bold: true })] })] }),
        new TableCell({ borders: TABLE_CELL_BORDERS, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Tổng', font: FONT_FAMILY, size: 20, bold: true })] })] }),
      ],
    })

    const matrixRows: TableRow[] = [matrixHeader]
    cfg.matrixSummary.forEach((row, idx) => {
      matrixRows.push(
        new TableRow({
          children: [
            new TableCell({ borders: TABLE_CELL_BORDERS, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${idx + 1}`, font: FONT_FAMILY, size: 20 })] })] }),
            new TableCell({ borders: TABLE_CELL_BORDERS, children: [new Paragraph({ children: [new TextRun({ text: row.topicName, font: FONT_FAMILY, size: 20 })] })] }),
            new TableCell({ borders: TABLE_CELL_BORDERS, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${row.recognize || 0}`, font: FONT_FAMILY, size: 20 })] })] }),
            new TableCell({ borders: TABLE_CELL_BORDERS, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${row.understand || 0}`, font: FONT_FAMILY, size: 20 })] })] }),
            new TableCell({ borders: TABLE_CELL_BORDERS, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${row.apply || 0}`, font: FONT_FAMILY, size: 20 })] })] }),
            new TableCell({ borders: TABLE_CELL_BORDERS, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${row.advanced || 0}`, font: FONT_FAMILY, size: 20 })] })] }),
            new TableCell({ borders: TABLE_CELL_BORDERS, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${row.total || 0}`, font: FONT_FAMILY, size: 20, bold: true })] })] }),
          ],
        })
      )
    })

    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: matrixRows }))
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134,
              bottom: 1134,
              left: 1417,
              right: 1134,
            },
          },
        },
        children,
      },
    ],
  })

  return await Packer.toBlob(doc)
}

/**
 * Đóng gói tất cả các mã đề và file đáp án thành 1 file ZIP và kích hoạt tải về
 */
export async function downloadExamZip(cfg: ExamGenerationConfig, zipFilename?: string): Promise<void> {
  const zip = new JSZip()

  // 1. Thêm từng file đề thi riêng lẻ
  for (const exam of cfg.codes) {
    const blob = await createExamDocx(cfg, exam)
    zip.file(`De_${exam.code}.docx`, blob)
  }

  // 2. Thêm file Đáp án & Ma trận
  const answerBlob = await createAnswerAndMatrixDocx(cfg)
  zip.file('DapAn_Va_MaTran.docx', answerBlob)

  // 3. Tạo Blob nén ZIP
  const zipBlob = await zip.generateAsync({ type: 'blob' })

  // 4. Kích hoạt tải về tự động
  const url = URL.createObjectURL(zipBlob)
  const a = document.createElement('a')
  a.href = url
  a.download = zipFilename || `De_Kiem_Tra_${cfg.gradeName.replace(/\s+/g, '_')}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Thuật toán Fisher-Yates để đảo ngẫu nhiên một mảng
 */
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Tạo các mã đề từ danh sách câu hỏi gốc được bốc theo ma trận
 */
export function generateShuffledExamCodes(
  baseMcq: Exercise[],
  baseEssay: Exercise[],
  codes: string[] = ['101', '102', '103', '104']
): GeneratedExamCode[] {
  const letters: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D']

  return codes.map(code => {
    // 1. Đảo thứ tự các câu hỏi trắc nghiệm
    const shuffledMcqRaw = shuffleArray(baseMcq)

    const mcqQuestions: ShuffledQuestion[] = shuffledMcqRaw.map((ex, idx) => {
      // 4 phương án gốc
      const rawOptions = [
        { origKey: 'A', text: ex.optionA || '' },
        { origKey: 'B', text: ex.optionB || '' },
        { origKey: 'C', text: ex.optionC || '' },
        { origKey: 'D', text: ex.optionD || '' },
      ]

      // Đảo ngẫu nhiên 4 phương án
      const shuffledRawOpts = shuffleArray(rawOptions)
      const correctOriginal = (ex.correctAnswer || 'A').toUpperCase()

      let newCorrectKey: 'A' | 'B' | 'C' | 'D' = 'A'
      const options = shuffledRawOpts.map((opt, optIdx) => {
        const assignedKey = letters[optIdx]
        const isCorrect = opt.origKey === correctOriginal
        if (isCorrect) newCorrectKey = assignedKey
        return {
          key: assignedKey,
          text: opt.text,
          isCorrect,
        }
      })

      return {
        originalId: ex.id,
        questionNumber: idx + 1,
        statement: ex.statement,
        exerciseType: 1,
        difficulty: ex.difficulty,
        options,
        correctKey: newCorrectKey,
        solution: ex.solution,
        hint: ex.hint,
      }
    })

    // 2. Đảo thứ tự (hoặc giữ nguyên) câu hỏi tự luận
    const shuffledEssayRaw = shuffleArray(baseEssay)
    const essayQuestions: ShuffledQuestion[] = shuffledEssayRaw.map((ex, idx) => ({
      originalId: ex.id,
      questionNumber: idx + 1,
      statement: ex.statement,
      exerciseType: 2,
      difficulty: ex.difficulty,
      solution: ex.solution,
      hint: ex.hint,
      sampleCode: ex.sampleCode,
      score: 1.0,
    }))

    return {
      code,
      mcqQuestions,
      essayQuestions,
    }
  })
}

