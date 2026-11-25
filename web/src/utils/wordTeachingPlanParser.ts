import JSZip from 'jszip';

export interface ParsedTeachingPlanRow {
  id?: string;
  stt?: number;
  periodNumber: number;
  periodName: string;
  title: string;
  numberOfPeriods: string;
  weekNumber: number;
  equipment: string;
  location: string;
  topicName?: string;
  semester?: number;
}

/**
 * Lấy toàn bộ text từ một node XML w:tc (table cell)
 */
function getCellText(cellNode: Element): string {
  const textNodes = cellNode.getElementsByTagName('w:t');
  const texts: string[] = [];
  for (let i = 0; i < textNodes.length; i++) {
    texts.push(textNodes[i].textContent || '');
  }
  return texts.join('').trim();
}

/**
 * Trích xuất số tiết đầu tiên từ chuỗi (ví dụ: "1, 2" -> 1; "Tiết 5" -> 5; "12" -> 12)
 */
function extractFirstPeriodNumber(periodText: string, fallback: number): number {
  const match = periodText.match(/\d+/);
  if (match) {
    const val = parseInt(match[0], 10);
    return isNaN(val) || val <= 0 ? fallback : val;
  }
  return fallback;
}

/**
 * Phân tích file Word .docx chứa Phụ lục 3 (Khung phân phối chương trình môn học)
 */
export async function parseTeachingPlanDocx(file: File): Promise<ParsedTeachingPlanRow[]> {
  const zip = await JSZip.loadAsync(file);
  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) {
    throw new Error('Tệp không đúng định dạng Word .docx hợp lệ (thiếu word/document.xml).');
  }

  const xmlText = await docXmlFile.async('text');
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

  // Kiểm tra lỗi cú pháp XML nếu có
  const parserError = xmlDoc.getElementsByTagName('parsererror');
  if (parserError.length > 0) {
    throw new Error('Lỗi khi phân tích nội dung XML của tệp Word.');
  }

  const tables = xmlDoc.getElementsByTagName('w:tbl');
  if (tables.length === 0) {
    throw new Error('Không tìm thấy bảng biểu (table) nào trong tệp Word.');
  }

  let targetTable: Element | null = null;

  // Tìm bảng có chứa tiêu đề phù hợp chuẩn CV 5512
  for (let i = 0; i < tables.length; i++) {
    const tbl = tables[i];
    const rows = tbl.getElementsByTagName('w:tr');
    for (let r = 0; r < Math.min(5, rows.length); r++) {
      const rowText = rows[r].textContent?.toLowerCase() || '';
      if (
        (rowText.includes('bài học') || rowText.includes('tên bài') || rowText.includes('nội dung')) &&
        (rowText.includes('tiết') || rowText.includes('ppct') || rowText.includes('tuần'))
      ) {
        targetTable = tbl;
        break;
      }
    }
    if (targetTable) break;
  }

  // Nếu không tìm được theo từ khóa, lấy bảng lớn nhất có nhiều hàng nhất
  if (!targetTable) {
    let maxRows = 0;
    for (let i = 0; i < tables.length; i++) {
      const rowCount = tables[i].getElementsByTagName('w:tr').length;
      if (rowCount > maxRows) {
        maxRows = rowCount;
        targetTable = tables[i];
      }
    }
  }

  if (!targetTable) {
    throw new Error('Không tìm thấy bảng phân phối chương trình phù hợp.');
  }

  const rows = targetTable.getElementsByTagName('w:tr');
  const results: ParsedTeachingPlanRow[] = [];

  let currentSemester = 1;
  let currentTopicName = '';
  let headerFound = false;
  let runningPeriod = 1;
  let runningWeek = 1;

  for (let r = 0; r < rows.length; r++) {
    const tr = rows[r];
    const cells = tr.getElementsByTagName('w:tc');
    if (cells.length === 0) continue;

    const cellTexts: string[] = [];
    for (let c = 0; c < cells.length; c++) {
      cellTexts.push(getCellText(cells[c]));
    }

    const fullRowText = cellTexts.join(' ').trim();
    const fullRowLower = fullRowText.toLowerCase();

    // 1. Nhận diện dòng Tiêu đề bảng (Header row)
    if (!headerFound) {
      if (
        (fullRowLower.includes('bài học') || fullRowLower.includes('tên bài')) &&
        (fullRowLower.includes('tiết') || fullRowLower.includes('stt') || fullRowLower.includes('tuần'))
      ) {
        headerFound = true;
      }
      continue;
    }

    // 2. Nhận diện dòng Học kỳ (Ví dụ: "HỌC KỲ I", "HỌC KỲ 2", "HỌC KÌ II")
    if (
      fullRowLower.includes('học kỳ') ||
      fullRowLower.includes('học kì') ||
      fullRowLower.includes('hk1') ||
      fullRowLower.includes('hk2') ||
      fullRowLower.includes('hki') ||
      fullRowLower.includes('hkii')
    ) {
      if (fullRowLower.includes('ii') || fullRowLower.includes('2')) {
        currentSemester = 2;
        if (runningWeek < 19) runningWeek = 19;
      } else {
        currentSemester = 1;
      }
      continue;
    }

    // 3. Nhận diện dòng Chủ đề (Ví dụ: "CHỦ ĐỀ 1: MÁY TÍNH VÀ CỘNG ĐỒNG", "Chủ đề A: ...")
    if (
      (cells.length <= 3 || (fullRowText.length > 0 && cellTexts.filter(t => t.length > 0).length <= 2)) &&
      (fullRowLower.includes('chủ đề') || fullRowLower.includes('chu de') || fullRowLower.includes('chương') || fullRowLower.includes('phần'))
    ) {
      currentTopicName = fullRowText.replace(/\s+/g, ' ').trim();
      continue;
    }

    // Nếu số ô có nội dung quá ít (< 3 ô), có thể là dòng tiêu đề phụ gộp cột
    const filledCells = cellTexts.filter(t => t.length > 0);
    if (filledCells.length <= 2 && (fullRowLower.includes('chủ đề') || fullRowLower.includes('ôn tập') || fullRowLower.includes('kiểm tra'))) {
      if (fullRowLower.includes('chủ đề')) {
        currentTopicName = fullRowText.replace(/\s+/g, ' ').trim();
        continue;
      }
    }

    // 4. Nhận diện dòng Dữ liệu bài học
    // Cấu trúc 7 cột chuẩn CV 5512:
    // Cột 0: STT
    // Cột 1: Bài học / Tên bài
    // Cột 2: Số tiết
    // Cột 3: Thời điểm / Tuần
    // Cột 4: Thiết bị dạy học
    // Cột 5: Địa điểm dạy học
    // (hoặc biến thể có cột Tiết PPCT ở cột 1, Bài học ở cột 2)
    let stt = 0;
    let periodName = '';
    let title = '';
    let numberOfPeriods = '1';
    let weekNumber = runningWeek;
    let equipment = 'SGK, SGV, Máy tính, tivi.';
    let location = 'Phòng học/Phòng máy';

    if (cells.length >= 7) {
      // Đúng chuẩn 7 cột như file user:
      // Col 0: STT ('1')
      // Col 1: PPCT ('1, 2')
      // Col 2: Bài học ('Bài 1. Hệ điều hành.')
      // Col 3: Số tiết ('2LT' hoặc '1')
      // Col 4: Tuần ('1')
      // Col 5: Thiết bị dạy học ('SGK, SGV...')
      // Col 6: Địa điểm dạy học ('Phòng học/Phòng máy')
      const c0 = cellTexts[0];
      const c1 = cellTexts[1];
      const c2 = cellTexts[2];
      const c3 = cellTexts[3];
      const c4 = cellTexts[4];
      const c5 = cellTexts[5];
      const c6 = cellTexts[6];

      const parsedStt = parseInt(c0, 10);
      if (!isNaN(parsedStt)) stt = parsedStt;

      periodName = c1;
      title = c2;
      numberOfPeriods = c3 || '1';
      const matchWeek = c4.match(/\d+/);
      if (matchWeek) weekNumber = parseInt(matchWeek[0], 10);
      equipment = c5 || equipment;
      location = c6 || location;
    } else if (cells.length === 6) {
      // Kiểu 6 cột (không có cột PPCT riêng)
      const c0 = cellTexts[0];
      const c1 = cellTexts[1];
      const c2 = cellTexts[2];
      const c3 = cellTexts[3];
      const c4 = cellTexts[4];
      const c5 = cellTexts[5];

      const parsedStt = parseInt(c0, 10);
      if (!isNaN(parsedStt)) stt = parsedStt;

      title = c1;
      numberOfPeriods = c2 || '1';
      periodName = c3;
      const matchWeek = c3.match(/\d+/);
      if (matchWeek) weekNumber = parseInt(matchWeek[0], 10);
      equipment = c4 || equipment;
      location = c5 || location;
    } else if (cells.length >= 4) {
      // Bảng thu gọn
      title = cellTexts[1] || cellTexts[0];
      numberOfPeriods = cellTexts[2] || '1';
      periodName = cellTexts[3] || `${runningPeriod}`;
    }

    title = title.replace(/\s+/g, ' ').trim();
    if (!title || title.length < 2) continue;

    // Bỏ qua nếu dòng này là dòng lặp lại header
    if (title.toLowerCase() === 'bài học' || title.toLowerCase() === 'tên bài') continue;

    // Chuẩn hóa tiết PPCT
    let periodNumber = runningPeriod;
    if (periodName) {
      periodNumber = extractFirstPeriodNumber(periodName, runningPeriod);
    } else {
      periodName = `${runningPeriod}`;
    }

    // Tự động suy ra số tiết kế tiếp
    const numP = parseInt(numberOfPeriods.match(/\d+/)?.[0] || '1', 10);
    runningPeriod = periodNumber + Math.max(1, numP);

    if (weekNumber > 0) {
      runningWeek = weekNumber;
    } else {
      weekNumber = runningWeek;
    }

    results.push({
      id: `row-${results.length + 1}`,
      stt: stt > 0 ? stt : results.length + 1,
      periodNumber,
      periodName: periodName.trim(),
      title,
      numberOfPeriods: numberOfPeriods.trim(),
      weekNumber: Math.min(52, Math.max(1, weekNumber)),
      equipment: equipment.trim(),
      location: location.trim(),
      topicName: currentTopicName || undefined,
      semester: currentSemester
    });
  }

  if (results.length === 0) {
    throw new Error(
      'Không nhận diện được dòng bài học nào từ bảng. Vui lòng kiểm tra lại file Word đúng chuẩn Phụ lục 3 (CV 5512).'
    );
  }

  return results;
}
