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
  ShadingType,
  TabStopType,
  LeaderType
} from 'docx'
import type { Exercise } from '../types'

const FONT_FAMILY = 'Times New Roman'
const FONT_CODE = 'Courier New'

// Chiều rộng vùng văn bản trang A4 Dọc (11906 - 2 * 1134 = 9638 dxa)
const PAGE_TEXT_WIDTH = 9638

const BORDER_SINGLE = {
  style: BorderStyle.SINGLE,
  size: 4,
  color: '94A3B8'
}

const TABLE_BORDERS_FULL = {
  top: BORDER_SINGLE,
  bottom: BORDER_SINGLE,
  left: BORDER_SINGLE,
  right: BORDER_SINGLE,
  insideHorizontal: BORDER_SINGLE,
  insideVertical: BORDER_SINGLE
}

const TABLE_BORDERS_NONE = {
  top: { style: BorderStyle.NONE },
  bottom: { style: BorderStyle.NONE },
  left: { style: BorderStyle.NONE },
  right: { style: BorderStyle.NONE },
  insideHorizontal: { style: BorderStyle.NONE },
  insideVertical: { style: BorderStyle.NONE }
}

export interface WorksheetExportOptions {
  title?: string
  schoolName?: string
  subjectName?: string
  className?: string
  durationMinutes?: number | null
  ruledLinesCount?: number
  ruledLineStyle?: 'dots' | 'solid'
  includeAnswerKey?: boolean
  exercises: Exercise[]
}

export async function exportWorksheetToDocx(options: WorksheetExportOptions) {
  const {
    title = 'PHIẾU BÀI TẬP',
    schoolName = 'TRƯỜNG THPT .................................',
    subjectName = 'TIN HỌC',
    className = '',
    durationMinutes = null,
    ruledLinesCount = 6,
    ruledLineStyle = 'dots',
    includeAnswerKey = true,
    exercises = []
  } = options

  const mcqList = exercises.filter(e => e.exerciseType === 1 || Boolean(e.optionA || e.optionB))
  const essayList = exercises.filter(e => !(e.exerciseType === 1 || Boolean(e.optionA || e.optionB)))
  const hasMCQ = mcqList.length > 0
  const hasEssay = essayList.length > 0

  const docChildren: (Paragraph | Table)[] = []

  // 1. HEADER 2 CỘT: TRƯỜNG/TỔ & HỌC SINH/ĐIỂM
  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: TABLE_BORDERS_NONE,
    rows: [
      new TableRow({
        children: [
          // Cột trái: Thông tin Trường / Tổ
          new TableCell({
            width: { size: 45, type: WidthType.PERCENTAGE },
            borders: TABLE_BORDERS_NONE,
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 40, line: 240 },
                children: [
                  new TextRun({ text: schoolName.toUpperCase(), bold: true, size: 22, font: FONT_FAMILY })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 40, line: 240 },
                children: [
                  new TextRun({ text: 'TỔ CHUYÊN MÔN: TIN HỌC', bold: true, size: 22, font: FONT_FAMILY })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 0, line: 240 },
                children: [
                  new TextRun({ text: 'Năm học: 2026 - 2027', italics: true, size: 20, font: FONT_FAMILY })
                ]
              })
            ]
          }),

          // Cột phải: Thông tin học sinh, Lớp, Điểm, Lời phê
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            borders: TABLE_BORDERS_NONE,
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 40, line: 240 },
                children: [
                  new TextRun({ text: 'Họ và tên: ', bold: true, size: 22, font: FONT_FAMILY }),
                  new TextRun({ text: '................................................................', size: 22, font: FONT_FAMILY })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 40, line: 240 },
                children: [
                  new TextRun({ text: 'Lớp: ', bold: true, size: 22, font: FONT_FAMILY }),
                  new TextRun({ text: className ? `${className}        ` : '..............        ', bold: Boolean(className), size: 22, font: FONT_FAMILY }),
                  new TextRun({ text: 'Ngày làm bài: ', bold: true, size: 22, font: FONT_FAMILY }),
                  new TextRun({ text: '...../...../2026', size: 22, font: FONT_FAMILY })
                ]
              }),
              new Paragraph({
                alignment: AlignmentType.LEFT,
                spacing: { after: 0, line: 240 },
                children: [
                  new TextRun({ text: 'Điểm: ..................  ', bold: true, size: 22, font: FONT_FAMILY }),
                  new TextRun({ text: 'Lời phê: ............................................', size: 22, font: FONT_FAMILY })
                ]
              })
            ]
          })
        ]
      })
    ]
  })
  docChildren.push(headerTable)

  // 2. TIÊU ĐỀ PHIẾU
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 60 },
      children: [
        new TextRun({
          text: (title || 'PHIẾU BÀI TẬP').toUpperCase(),
          bold: true,
          size: 30, // 15pt
          font: FONT_FAMILY,
          color: '0F172A'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: durationMinutes ? 40 : 200 },
      children: [
        new TextRun({
          text: `MÔN HỌC: ${subjectName.toUpperCase()}${className ? ` - LỚP ${className}` : ''}`,
          bold: true,
          size: 24, // 12pt
          font: FONT_FAMILY
        })
      ]
    })
  )

  if (durationMinutes) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 200 },
        children: [
          new TextRun({
            text: `(Thời gian làm bài: ${durationMinutes} phút)`,
            italics: true,
            size: 22,
            font: FONT_FAMILY
          })
        ]
      })
    )
  }

  // 3. PHẦN I: TRẮC NGHIỆM (NẾU CÓ)
  if (hasMCQ) {
    const mcqHeading = hasEssay
      ? `PHẦN I: TRẮC NGHIỆM (${mcqList.length} CÂU)`
      : `CÂU HỎI TRẮC NGHIỆM (${mcqList.length} CÂU)`

    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 180, after: 100 },
        children: [
          new TextRun({
            text: mcqHeading,
            bold: true,
            size: 24, // 12pt
            font: FONT_FAMILY,
            color: '1E293B'
          })
        ]
      })
    )

    // Bảng khung điền đáp án trắc nghiệm cho học sinh
    docChildren.push(
      new Paragraph({
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: '* BẢNG TRẢ LỜI TRẮC NGHIỆM (Học sinh ghi đáp án A, B, C hoặc D vào ô tương ứng):',
            italics: true,
            bold: true,
            size: 20,
            font: FONT_FAMILY
          })
        ]
      })
    )

    // Tạo bảng đáp án theo từng nhóm 10 câu
    const chunkSize = 10
    for (let c = 0; c < mcqList.length; c += chunkSize) {
      const chunk = mcqList.slice(c, c + chunkSize)
      const colWidth = Math.floor(90 / chunk.length)

      const headerCells: TableCell[] = [
        new TableCell({
          width: { size: 10, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'Câu', bold: true, size: 20, font: FONT_FAMILY })]
            })
          ]
        })
      ]

      const answerCells: TableCell[] = [
        new TableCell({
          width: { size: 10, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'Đ/án', bold: true, size: 20, font: FONT_FAMILY })]
            })
          ]
        })
      ]

      chunk.forEach((_, idx) => {
        const qNumber = c + idx + 1
        headerCells.push(
          new TableCell({
            width: { size: colWidth, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `${qNumber}`, bold: true, size: 20, font: FONT_FAMILY })]
              })
            ]
          })
        )

        answerCells.push(
          new TableCell({
            width: { size: colWidth, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 80, after: 80 },
                children: [new TextRun({ text: ' ', size: 20, font: FONT_FAMILY })]
              })
            ]
          })
        )
      })

      const answerTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: TABLE_BORDERS_FULL,
        rows: [
          new TableRow({ children: headerCells }),
          new TableRow({ children: answerCells })
        ]
      })

      docChildren.push(answerTable)
      docChildren.push(new Paragraph({ spacing: { after: 120 }, children: [] }))
    }

    // Danh sách câu hỏi trắc nghiệm
    mcqList.forEach((q, idx) => {
      const qNum = idx + 1
      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 100, after: 60, line: 260 },
          children: [
            new TextRun({
              text: `Câu ${qNum}: `,
              bold: true,
              size: 22,
              font: FONT_FAMILY
            }),
            new TextRun({
              text: q.statement || q.title || '',
              size: 22,
              font: FONT_FAMILY
            })
          ]
        })
      )

      // Các phương án A, B, C, D
      const opts = [
        { label: 'A', text: q.optionA || '' },
        { label: 'B', text: q.optionB || '' },
        { label: 'C', text: q.optionC || '' },
        { label: 'D', text: q.optionD || '' }
      ].filter(o => o.text.trim())

      if (opts.length > 0) {
        const isLong = opts.some(o => o.text.length > 35)

        if (isLong || opts.length < 4) {
          // Xuất mỗi đáp án trên 1 dòng
          opts.forEach(opt => {
            docChildren.push(
              new Paragraph({
                indent: { left: 400 },
                spacing: { after: 40, line: 240 },
                children: [
                  new TextRun({ text: `${opt.label}. `, bold: true, size: 22, font: FONT_FAMILY }),
                  new TextRun({ text: opt.text, size: 22, font: FONT_FAMILY })
                ]
              })
            )
          })
        } else {
          // Xuất dạng bảng 2 cột A, B trên hàng 1; C, D trên hàng 2
          const optTable = new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: TABLE_BORDERS_NONE,
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: TABLE_BORDERS_NONE,
                    children: [
                      new Paragraph({
                        indent: { left: 300 },
                        spacing: { after: 30, line: 240 },
                        children: [
                          new TextRun({ text: 'A. ', bold: true, size: 22, font: FONT_FAMILY }),
                          new TextRun({ text: opts[0]?.text || '', size: 22, font: FONT_FAMILY })
                        ]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: TABLE_BORDERS_NONE,
                    children: [
                      new Paragraph({
                        indent: { left: 300 },
                        spacing: { after: 30, line: 240 },
                        children: [
                          new TextRun({ text: 'B. ', bold: true, size: 22, font: FONT_FAMILY }),
                          new TextRun({ text: opts[1]?.text || '', size: 22, font: FONT_FAMILY })
                        ]
                      })
                    ]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: TABLE_BORDERS_NONE,
                    children: [
                      new Paragraph({
                        indent: { left: 300 },
                        spacing: { after: 30, line: 240 },
                        children: [
                          new TextRun({ text: 'C. ', bold: true, size: 22, font: FONT_FAMILY }),
                          new TextRun({ text: opts[2]?.text || '', size: 22, font: FONT_FAMILY })
                        ]
                      })
                    ]
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    borders: TABLE_BORDERS_NONE,
                    children: [
                      new Paragraph({
                        indent: { left: 300 },
                        spacing: { after: 30, line: 240 },
                        children: [
                          new TextRun({ text: 'D. ', bold: true, size: 22, font: FONT_FAMILY }),
                          new TextRun({ text: opts[3]?.text || '', size: 22, font: FONT_FAMILY })
                        ]
                      })
                    ]
                  })
                ]
              })
            ]
          })
          docChildren.push(optTable)
        }
      }
    })
  }

  // 4. PHẦN II: TỰ LUẬN (NẾU CÓ)
  if (hasEssay) {
    const essayHeading = hasMCQ
      ? `PHẦN II: TỰ LUẬN (${essayList.length} BÀI)`
      : `BÀI TẬP TỰ LUẬN (${essayList.length} BÀI)`

    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: essayHeading,
            bold: true,
            size: 24, // 12pt
            font: FONT_FAMILY,
            color: '1E293B'
          })
        ]
      })
    )

    essayList.forEach((q, idx) => {
      const qNum = idx + 1

      docChildren.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 120, after: 60, line: 260 },
          children: [
            new TextRun({
              text: `Bài ${qNum}: `,
              bold: true,
              size: 22,
              font: FONT_FAMILY
            }),
            new TextRun({
              text: q.statement || q.title || '',
              size: 22,
              font: FONT_FAMILY
            })
          ]
        })
      )

      // Nếu có mã nguồn / ví dụ đi kèm
      // if (q.sampleCode) {
      //   docChildren.push(
      //     new Paragraph({
      //       indent: { left: 400, right: 400 },
      //       spacing: { before: 60, after: 60 },
      //       shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
      //       children: [
      //         new TextRun({
      //           text: q.sampleCode,
      //           size: 19,
      //           font: FONT_CODE,
      //           color: '334155'
      //         })
      //       ]
      //     })
      //   )
      // }

      // Dòng kẻ làm bài (Sử dụng Tab Stop Leader kéo dài 100% đến hết lề phải của trang A4)
      const lines = Math.max(2, Math.min(15, ruledLinesCount))
      const leader = ruledLineStyle === 'solid' ? LeaderType.UNDERSCORE : LeaderType.DOT

      // Dòng 1: "Bài làm:" kèm dòng kẻ kéo hết mép phải trang
      docChildren.push(
        new Paragraph({
          tabStops: [
            {
              type: TabStopType.RIGHT,
              position: PAGE_TEXT_WIDTH,
              leader
            }
          ],
          spacing: { before: 80, after: 60, line: 360 },
          children: [
            new TextRun({
              text: 'Bài làm:',
              italics: true,
              size: 20,
              font: FONT_FAMILY
            }),
            new TextRun({
              text: '\t',
              size: 20,
              font: FONT_FAMILY,
              color: '94A3B8'
            })
          ]
        })
      )

      // Các dòng kẻ ly tiếp theo: Kéo dài trọn vẹn từ lề trái sang lề phải trang A4
      for (let i = 1; i < lines; i++) {
        docChildren.push(
          new Paragraph({
            tabStops: [
              {
                type: TabStopType.RIGHT,
                position: PAGE_TEXT_WIDTH,
                leader
              }
            ],
            spacing: { before: 60, after: 60, line: 360 },
            children: [
              new TextRun({
                text: '\t',
                size: 20,
                font: FONT_FAMILY,
                color: '94A3B8'
              })
            ]
          })
        )
      }
    })
  }

  // 5. TRANG ĐÁP ÁN & LỜI GIẢI DÀNH CHO GIÁO VIÊN (NẾU BẬT)
  if (includeAnswerKey) {
    // Ngắt trang
    docChildren.push(
      new Paragraph({
        pageBreakBefore: true,
        alignment: AlignmentType.CENTER,
        spacing: { before: 180, after: 80 },
        children: [
          new TextRun({
            text: 'ĐÁP ÁN & HƯỚNG DẪN GIẢI CHI TIẾT',
            bold: true,
            size: 26, // 13pt
            font: FONT_FAMILY,
            color: '0F172A'
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 200 },
        children: [
          new TextRun({
            text: '(Dành riêng cho giáo viên đối chiếu & chấm điểm)',
            italics: true,
            size: 20,
            font: FONT_FAMILY,
            color: '64748B'
          })
        ]
      })
    )

    // Bảng đáp án trắc nghiệm chuẩn
    if (hasMCQ) {
      docChildren.push(
        new Paragraph({
          spacing: { before: 120, after: 80 },
          children: [
            new TextRun({
              text: '1. ĐÁP ÁN TRẮC NGHIỆM:',
              bold: true,
              size: 22,
              font: FONT_FAMILY
            })
          ]
        })
      )

      const chunkSize = 10
      for (let c = 0; c < mcqList.length; c += chunkSize) {
        const chunk = mcqList.slice(c, c + chunkSize)
        const colWidth = Math.floor(90 / chunk.length)

        const headerCells: TableCell[] = [
          new TableCell({
            width: { size: 10, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: 'E2E8F0' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Câu', bold: true, size: 20, font: FONT_FAMILY })]
              })
            ]
          })
        ]

        const keyCells: TableCell[] = [
          new TableCell({
            width: { size: 10, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: 'F1F5F9' },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Đ/án', bold: true, size: 20, font: FONT_FAMILY })]
              })
            ]
          })
        ]

        chunk.forEach((q, idx) => {
          const qNumber = c + idx + 1
          headerCells.push(
            new TableCell({
              width: { size: colWidth, type: WidthType.PERCENTAGE },
              shading: { type: ShadingType.CLEAR, fill: 'E2E8F0' },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: `${qNumber}`, bold: true, size: 20, font: FONT_FAMILY })]
                })
              ]
            })
          )

          keyCells.push(
            new TableCell({
              width: { size: colWidth, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: q.correctAnswer || '—',
                      bold: true,
                      size: 22,
                      font: FONT_FAMILY,
                      color: q.correctAnswer ? '047857' : '64748B'
                    })
                  ]
                })
              ]
            })
          )
        })

        const keyTable = new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: TABLE_BORDERS_FULL,
          rows: [
            new TableRow({ children: headerCells }),
            new TableRow({ children: keyCells })
          ]
        })

        docChildren.push(keyTable)
        docChildren.push(new Paragraph({ spacing: { after: 120 }, children: [] }))
      }
    }

    // Lời giải bài tự luận
    if (hasEssay) {
      docChildren.push(
        new Paragraph({
          spacing: { before: 160, after: 80 },
          children: [
            new TextRun({
              text: hasMCQ ? '2. HƯỚNG DẪN GIẢI BÀI TẬP TỰ LUẬN:' : 'HƯỚNG DẪN GIẢI BÀI TẬP TỰ LUẬN:',
              bold: true,
              size: 22,
              font: FONT_FAMILY
            })
          ]
        })
      )

      essayList.forEach((q, idx) => {
        const qNum = idx + 1
        docChildren.push(
          new Paragraph({
            spacing: { before: 100, after: 40 },
            children: [
              new TextRun({
                text: `* Bài ${qNum}: ${q.title || ''}`,
                bold: true,
                size: 22,
                font: FONT_FAMILY,
                color: '1E293B'
              })
            ]
          })
        )

        if (q.hint) {
          docChildren.push(
            new Paragraph({
              indent: { left: 300 },
              spacing: { after: 40 },
              children: [
                new TextRun({ text: '• Gợi ý: ', bold: true, italics: true, size: 20, font: FONT_FAMILY }),
                new TextRun({ text: q.hint, size: 20, font: FONT_FAMILY })
              ]
            })
          )
        }

        if (q.solution) {
          docChildren.push(
            new Paragraph({
              indent: { left: 300 },
              spacing: { after: 40 },
              children: [
                new TextRun({ text: '• Lời giải chi tiết: ', bold: true, size: 20, font: FONT_FAMILY }),
                new TextRun({ text: q.solution, size: 20, font: FONT_FAMILY })
              ]
            })
          )
        }

        if (q.sampleCode) {
          docChildren.push(
            new Paragraph({
              indent: { left: 300 },
              spacing: { after: 40 },
              children: [
                new TextRun({
                  text: `• Mã nguồn mẫu (${q.language || 'Code'}):`,
                  bold: true,
                  size: 20,
                  font: FONT_FAMILY
                })
              ]
            }),
            new Paragraph({
              indent: { left: 400, right: 400 },
              spacing: { after: 80 },
              shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
              children: [
                new TextRun({
                  text: q.sampleCode,
                  size: 19,
                  font: FONT_CODE,
                  color: '0F766E'
                })
              ]
            })
          )
        }

        if (!q.hint && !q.solution && !q.sampleCode) {
          docChildren.push(
            new Paragraph({
              indent: { left: 300 },
              spacing: { after: 40 },
              children: [
                new TextRun({ text: '(Chưa cập nhật hướng dẫn giải cho bài này)', italics: true, size: 20, font: FONT_FAMILY, color: '94A3B8' })
              ]
            })
          )
        }
      })
    }
  }

  // 6. BUILD DOCUMENT & DOWNLOAD
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.PORTRAIT
            },
            margin: {
              top: 1134, // 20mm
              bottom: 1134,
              left: 1134,
              right: 1134
            }
          }
        },
        children: docChildren
      }
    ]
  })

  const blob = await Packer.toBlob(doc)
  const safeClass = className ? `_${className.replace(/[^a-zA-Z0-9]/g, '')}` : ''
  const filename = `Phieu_bai_tap_TinHoc${safeClass}.docx`

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

