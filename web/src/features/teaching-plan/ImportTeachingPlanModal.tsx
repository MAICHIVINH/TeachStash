import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Trash2, Loader2, FileText, X, Info } from 'lucide-react';
import { api } from '../../services/api';
import { parseTeachingPlanDocx, ParsedTeachingPlanRow } from '../../utils/wordTeachingPlanParser';

interface Props {
  gradeLevelId: number;
  gradeLevelName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportTeachingPlanModal: React.FC<Props> = ({
  gradeLevelId,
  gradeLevelName,
  isOpen, 
  onClose,
  onSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedTeachingPlanRow[]>([]);
  const [replaceExisting, setReplaceExisting] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessFile = async (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.docx')) {
      setParseError('Vui lòng chọn tệp Word có định dạng .docx');
      return;
    }

    setFile(selectedFile);
    setIsParsing(true);
    setParseError(null);

    try {
      const rows = await parseTeachingPlanDocx(selectedFile);
      setParsedRows(rows);
    } catch (err: any) {
      console.error('Lỗi phân tích file Word:', err);
      setParseError(err.message || 'Không thể đọc nội dung file Word. Vui lòng kiểm tra lại cấu trúc bảng.');
      setParsedRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      handleProcessFile(f);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) {
      handleProcessFile(f);
    }
  };

  const handleDeleteRow = (index: number) => {
    setParsedRows(prev => prev.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;

    setIsSubmitting(true);
    try {
      const items = parsedRows.map((row, idx) => ({
        gradeLevelId,
        weekNumber: row.weekNumber,
        periodNumber: row.periodNumber,
        periodName: row.periodName,
        title: row.title,
        numberOfPeriods: row.numberOfPeriods,
        equipment: row.equipment,
        location: row.location,
        topicName: row.topicName,
        sortOrder: idx + 1
      }));

      await api.importTeachingPlan({
        gradeLevelId,
        replaceExisting,
        items
      });

      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Lỗi khi nhập PPCT:', err);
      setParseError(err.message || 'Có lỗi xảy ra khi lưu kế hoạch dạy học vào cơ sở dữ liệu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedRows([]);
    setParseError(null);
    setIsParsing(false);
    setIsSubmitting(false);
    onClose();
  };

  // Tính số liệu tổng quan
  const totalLessons = parsedRows.length;
  const maxWeek = parsedRows.reduce((max, r) => Math.max(max, r.weekNumber), 0);
  const totalPeriods = parsedRows.reduce((sum, r) => {
    const n = parseInt(r.numberOfPeriods.match(/\d+/)?.[0] || '1', 10);
    return sum + (isNaN(n) ? 1 : n);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                Nhập Kế hoạch dạy học từ Word (.docx)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tự động nhận diện khung phân phối chương trình môn học theo chuẩn Công văn 5512 cho{' '}
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {gradeLevelName || `Khối ${gradeLevelId}`}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Khu vực kéo thả / chọn file */}
          <div
            onDragOver={e => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-2xl p-6 text-center transition-all ${isDragOver
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
              : 'border-slate-300 dark:border-slate-700 hover:border-blue-400 bg-slate-50/50 dark:bg-slate-800/20'
              }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx"
              className="hidden"
              onChange={handleFileChange}
            />

            {isParsing ? (
              <div className="py-6 flex flex-col items-center gap-3">
                <Loader2 className="w-9 h-9 text-blue-500 animate-spin" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Đang phân tích bảng phân phối chương trình từ file Word...
                </p>
              </div>
            ) : file ? (
              <div className="flex items-center justify-between max-w-lg mx-auto p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-blue-200 dark:border-blue-900/50 shadow-xs">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                    <FileText className="w-5 h-5 shrink-0" />
                  </div>
                  <div className="text-left truncate">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(file.size / 1024).toFixed(1)} KB • Nhấn để chọn tệp khác
                    </p>
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 ml-2" />
              </div>
            ) : (
              <div className="py-4 flex flex-col items-center gap-2">
                <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-1">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Kéo thả file Word <span className="text-blue-600 dark:text-blue-400 font-semibold">.docx</span> vào đây hoặc bấm để chọn tệp
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Hỗ trợ bảng phân phối chương trình chuẩn Phụ lục 3 (CV 5512/BGDĐT)
                </p>
              </div>
            )}
          </div>

          {/* Lỗi nếu có */}
          {parseError && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3 text-rose-700 dark:text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
              <div className="flex-1">
                <p className="font-semibold">Không thể xử lý tệp</p>
                <p className="text-xs mt-0.5 opacity-90">{parseError}</p>
              </div>
            </div>
          )}

          {/* Bảng xem trước dữ liệu khi phân tích xong */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-blue-50/60 dark:bg-blue-950/30 p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/40">
                <div className="flex items-center gap-2 text-xs font-medium text-blue-900 dark:text-blue-200">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>
                    Nhận diện thành công: <strong className="font-bold">{totalLessons}</strong> bài dạy (
                    <strong className="font-bold">{maxWeek}</strong> tuần,{' '}
                    <strong className="font-bold">{totalPeriods}</strong> tiết)
                  </span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Kiểm tra xem trước bên dưới trước khi xác nhận
                </div>
              </div>

              {/* Tùy chọn thay thế khung cũ */}
              <label className="flex items-center gap-2.5 px-1 py-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={e => setReplaceExisting(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Xóa và thay thế toàn bộ khung phân phối chương trình hiện có của khối lớp này
                </span>
              </label>

              {/* Table Preview */}
              <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <table className="w-full text-xs text-left text-slate-600 dark:text-slate-300">
                  <thead className="text-[11px] uppercase tracking-wider bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 sticky top-0 z-10 backdrop-blur-xs">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">STT</th>
                      <th className="py-2.5 px-3 w-20 text-center">Tiết PPCT</th>
                      <th className="py-2.5 px-4">Bài học</th>
                      <th className="py-2.5 px-3 w-16 text-center">Số tiết</th>
                      <th className="py-2.5 px-3 w-16 text-center">Tuần</th>
                      <th className="py-2.5 px-4 hidden md:table-cell">Thiết bị</th>
                      <th className="py-2.5 px-3 hidden lg:table-cell">Địa điểm</th>
                      <th className="py-2.5 px-2 w-10 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {parsedRows.map((row, idx) => (
                      <tr
                        key={row.id || idx}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2 px-3 text-center text-slate-400 font-mono">
                          {row.stt || idx + 1}
                        </td>
                        <td className="py-2 px-3 text-center font-semibold text-slate-700 dark:text-slate-200">
                          {row.periodName}
                        </td>
                        <td className="py-2 px-4">
                          <p className="font-medium text-slate-800 dark:text-slate-100 line-clamp-1">
                            {row.title}
                          </p>
                          {row.topicName && (
                            <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5 font-normal">
                              {row.topicName}
                            </p>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center font-mono">{row.numberOfPeriods}</td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-mono">
                            T{row.weekNumber}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-slate-500 dark:text-slate-400 hidden md:table-cell truncate max-w-xs">
                          {row.equipment}
                        </td>
                        <td className="py-2 px-3 text-slate-500 dark:text-slate-400 hidden lg:table-cell truncate max-w-[120px]">
                          {row.location}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(idx)}
                            className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                            title="Xóa dòng này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Gợi ý quy chuẩn */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p>
              Hệ thống tự động phát hiện tiêu đề Học kỳ 1, Học kỳ 2, và phân nhóm theo từng Chủ đề trong file Word để tổ chức dữ liệu chính xác và tối ưu nhất.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 bg-slate-50/70 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={parsedRows.length === 0 || isSubmitting}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang nhập dữ liệu...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Xác nhận nhập vào PPCT ({parsedRows.length})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

