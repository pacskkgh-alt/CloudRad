import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  X, 
  Disc, 
  Laptop, 
  FolderPlus, 
  FileText, 
  Image as ImageIcon, 
  Video, 
  ArrowRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  UploadCloud,
  FolderOpen
} from 'lucide-react';
import { getApiUrl, getAuthToken } from '../api';

/**
 * UploadTypeModal Component
 * 
 * Dark-themed modal allowing users to choose an upload source:
 * 1. Medical Imaging from CD
 * 2. Medical Imaging from Computer
 * 3. Other Documents from Computer or CD
 * 
 * Features:
 * - Direct File & Folder Picker with full format support (.dcm, .zip, folders, images, docs)
 * - Full Drag & Drop support directly into the modal
 * - Live real-time upload progress bar and status feedback
 * - Automatic JWT authentication header inclusion (Bearer <token>)
 * - Automatic detection of expired sessions with one-click re-login action
 */
export default function UploadTypeModal({ 
  isOpen = true, 
  onClose, 
  onUploadSuccess,
  onSelect 
}) {
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isAuthError, setIsAuthError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !uploading) {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, uploading]);

  if (!isOpen) return null;

  // Retrieve JWT token securely
  const getValidToken = () => {
    return (
      getAuthToken() ||
      localStorage.getItem('cloudrad_token') ||
      localStorage.getItem('token') ||
      localStorage.getItem('access_token') ||
      sessionStorage.getItem('cloudrad_token') ||
      sessionStorage.getItem('token') ||
      ''
    );
  };

  const handleFilesSelected = async (fileList, sourceType = 'computer') => {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    setErrorMessage('');
    setIsAuthError(false);
    setIsSuccess(false);
    setUploading(true);
    setUploadProgress(5);
    setStatusMessage(`جاري تحضير ${files.length} ملف للرفع...`);

    const token = getValidToken();

    // Critical check: if no token found, alert user clearly
    if (!token) {
      setUploading(false);
      setIsAuthError(true);
      setErrorMessage('بيانات الدخول غير متوفرة أو انتهت صلاحية الجلسة. يرجى تسجيل الدخول أولاً للمتابعة.');
      return;
    }

    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    formData.append('source_type', sourceType);

    try {
      const API_URL = getApiUrl();
      setStatusMessage(`جاري رفع ${files.length} ملف إلى الخادم...`);

      const response = await axios.post(`${API_URL}/api/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 90) / progressEvent.total);
            setUploadProgress(percent);
            if (percent >= 90) {
              setStatusMessage('اكتمل الرفع! جاري معالجة صور DICOM والتحقق من البيانات...');
            }
          }
        },
      });

      setUploadProgress(100);
      setIsSuccess(true);
      setStatusMessage('تم الرفع والمعالجة بنجاح! جاري تحديث الحالات...');

      // Notify parent component and close
      setTimeout(() => {
        setUploading(false);
        onUploadSuccess?.(response.data);
        onClose?.();
      }, 1000);

    } catch (err) {
      console.error('Upload request failed:', err);
      setUploading(false);
      setUploadProgress(0);

      const status = err.response?.status;
      const serverDetail = err.response?.data?.detail;

      if (status === 401 || serverDetail === 'بيانات الدخول غير صالحة') {
        setIsAuthError(true);
        setErrorMessage('جلسة تسجيل الدخول منتهية أو غير صالحة (بيانات الدخول غير صالحة). يرجى إعادة تسجيل الدخول لتتمكن من الرفع.');
      } else if (status === 413) {
        setErrorMessage('حجم الملفات المرفوعة كبير جداً. الحد الأقصى المسموح به هو 2GB.');
      } else if (serverDetail) {
        setErrorMessage(`خطأ من الخادم: ${serverDetail}`);
      } else {
        setErrorMessage('تعذر الاتصال بالخادم لرفع الملفات. يرجى التأكد من اتصال الإنترنت وإعادة المحاولة.');
      }
    } finally {
      // Reset input values so user can re-select the same file if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  const handleCardClick = (type) => {
    if (uploading) return;
    setErrorMessage('');
    setIsAuthError(false);
    onSelect?.(type);

    if (type === 'cd-folder') {
      folderInputRef.current?.click();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!uploading) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!uploading && e.dataTransfer?.files?.length > 0) {
      handleFilesSelected(e.dataTransfer.files, 'drag-and-drop');
    }
  };

  const handleReLogin = () => {
    localStorage.removeItem('cloudrad_token');
    localStorage.removeItem('cloudrad_doctor');
    localStorage.removeItem('token');
    localStorage.removeItem('access_token');
    window.location.href = '/login';
  };

  const imagingTags = ['MRI', 'CT', 'PET-CT', 'ULTRASOUND', 'X-RAY'];
  const documentTags = ['.PDF', '.DOC', '.DOCX', 'IMAGE', 'VIDEO'];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity duration-200"
      onClick={uploading ? undefined : onClose}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
    >
      {/* Hidden file & folder inputs */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept=".dcm,.zip,.tar,.gz,.pdf,.doc,.docx,image/*,video/*,*"
        onChange={(e) => handleFilesSelected(e.target.files, 'files')}
      />
      <input
        ref={folderInputRef}
        type="file"
        className="hidden"
        multiple
        webkitdirectory=""
        directory=""
        onChange={(e) => handleFilesSelected(e.target.files, 'folder')}
      />

      {/* Modal Container */}
      <div 
        className={`relative w-full max-w-4xl bg-[#111317] border rounded-xl shadow-2xl p-6 sm:p-8 text-left transition-all duration-200 ${
          isDragging 
            ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-[#161a22]' 
            : 'border-gray-800'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag overlay indicator */}
        {isDragging && (
          <div className="absolute inset-0 bg-emerald-950/70 backdrop-blur-xs border-2 border-dashed border-emerald-400 rounded-xl z-30 flex flex-col items-center justify-center pointer-events-none p-6 text-center">
            <UploadCloud size={56} className="text-emerald-400 animate-bounce mb-3" />
            <span className="text-white text-xl font-bold">أفلت الملفات هنا لبدء الرفع فوراً</span>
            <span className="text-emerald-300 text-sm mt-1">يدعم ملفات ومجلدات DICOM والملفات المضغوطة ZIP</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-gray-800">
          <h2 
            id="upload-modal-title" 
            className="text-xl font-semibold text-white tracking-wide flex items-center gap-2.5"
          >
            <UploadCloud size={22} className="text-emerald-400" />
            Upload files
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="text-gray-400 hover:text-white hover:bg-gray-800/80 p-2 rounded-lg transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="mt-4 p-4 rounded-lg bg-red-950/60 border border-red-800 text-red-200 text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5 text-red-300">خطأ في الرفع</span>
                <span>{errorMessage}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              {isAuthError && (
                <button
                  type="button"
                  onClick={handleReLogin}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
                >
                  تسجيل الدخول مجدداً
                </button>
              )}
              <button
                type="button"
                onClick={() => setErrorMessage('')}
                className="text-red-400 hover:text-red-200 p-1 rounded"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Active Uploading & Progress Screen */}
        {uploading && (
          <div className="mt-6 p-6 rounded-xl bg-[#1a1c22] border border-gray-700/80 space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center text-sm">
              <span className="text-emerald-400 flex items-center gap-2.5 font-bold">
                {isSuccess ? (
                  <CheckCircle2 size={20} className="text-emerald-400" />
                ) : (
                  <Loader2 size={20} className="animate-spin text-emerald-400" />
                )}
                {statusMessage}
              </span>
              <span className="text-emerald-300 font-mono font-bold bg-[#23252b] px-3 py-1 rounded-md border border-gray-700 text-sm shadow-sm">
                {uploadProgress}%
              </span>
            </div>
            
            {/* Animated Progress Bar */}
            <div className="w-full bg-[#111317] rounded-full h-3 overflow-hidden border border-gray-800 shadow-inner">
              <div 
                className="bg-gradient-to-r from-blue-500 via-teal-400 to-emerald-400 h-full rounded-full transition-all duration-300 shadow-sm relative"
                style={{ width: `${uploadProgress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse w-full"></div>
              </div>
            </div>

            <p className="text-xs text-gray-400 text-right">
              يرجى عدم إغلاق هذه الصفحة حتى تكتمل عملية الرفع وفهرسة الفحص في السجل الطبي.
            </p>
          </div>
        )}

        {/* Content Structure */}
        <div className="mt-6 flex flex-col gap-4">
          
          {/* Top Row: 2-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Card 1: Medical Imaging from CD */}
            <div
              onClick={() => handleCardClick('cd')}
              className={`group relative flex flex-col justify-between bg-[#1a1c22] border border-gray-800 rounded-lg p-6 transition-all duration-200 shadow-sm ${
                uploading 
                  ? 'opacity-60 cursor-not-allowed' 
                  : 'hover:border-gray-600 cursor-pointer'
              }`}
            >
              <div>
                {/* Icon Composition */}
                <div className="flex items-center justify-between mb-4">
                  <div className="relative flex items-center justify-center w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-105 transition-transform duration-200">
                    <Laptop size={22} className="text-emerald-400" />
                    <Disc size={15} className="absolute -bottom-1 -right-1 text-emerald-300 bg-[#1a1c22] rounded-full p-0.5 shadow-sm" />
                  </div>

                  {/* Optional Folder Select Shortcut */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick('cd-folder');
                    }}
                    title="Upload whole CD directory"
                    className="text-[11px] font-semibold text-gray-400 hover:text-emerald-300 bg-[#23252b] hover:bg-gray-800 px-2.5 py-1 rounded border border-gray-700/60 flex items-center gap-1.5 transition-colors"
                  >
                    <FolderOpen size={13} />
                    <span>Select Folder</span>
                  </button>
                </div>

                {/* Sub-title */}
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  FROM CD
                </span>

                {/* Main Title */}
                <h3 className="text-white text-lg font-medium leading-snug mb-4 group-hover:text-emerald-300 transition-colors">
                  Upload medical imaging from a CD
                </h3>
              </div>

              {/* Tags Row */}
              <div className="flex flex-wrap gap-2 pt-2">
                {imagingTags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-[#23252b] text-gray-400 text-xs px-2 py-1 uppercase rounded font-bold border border-gray-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Card 2: Medical Imaging from Computer */}
            <div
              onClick={() => handleCardClick('computer')}
              className={`group relative flex flex-col justify-between bg-[#1a1c22] border border-gray-800 rounded-lg p-6 transition-all duration-200 shadow-sm ${
                uploading 
                  ? 'opacity-60 cursor-not-allowed' 
                  : 'hover:border-gray-600 cursor-pointer'
              }`}
            >
              <div>
                {/* Icon: FolderPlus */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform duration-200">
                    <FolderPlus size={22} className="text-emerald-400" />
                  </div>
                </div>

                {/* Sub-title */}
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  FROM YOUR COMPUTER
                </span>

                {/* Main Title */}
                <h3 className="text-white text-lg font-medium leading-snug mb-4 group-hover:text-emerald-300 transition-colors">
                  Upload medical imaging from your computer
                </h3>
              </div>

              {/* Tags Row */}
              <div className="flex flex-wrap gap-2 pt-2">
                {imagingTags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-[#23252b] text-gray-400 text-xs px-2 py-1 uppercase rounded font-bold border border-gray-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

          </div>

          {/* Bottom Row: Full-width Card (Other Documents) */}
          <div
            onClick={() => handleCardClick('documents')}
            className={`group relative flex flex-col sm:flex-row bg-[#1a1c22] border border-gray-800 rounded-lg overflow-hidden transition-all duration-200 shadow-sm ${
              uploading 
                ? 'opacity-60 cursor-not-allowed' 
                : 'hover:border-gray-600 cursor-pointer'
            }`}
          >
            {/* Left Content Area */}
            <div className="flex-1 p-6 flex flex-col justify-between">
              <div>
                {/* Group of File Icons */}
                <div className="flex items-center mb-4">
                  <div className="flex items-center -space-x-1.5">
                    <div className="w-9 h-9 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-blue-400 shadow-sm z-30 group-hover:-translate-y-0.5 transition-transform duration-200">
                      <FileText size={18} />
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-emerald-400 shadow-sm z-20 group-hover:-translate-y-0.5 transition-transform duration-200 delay-75">
                      <ImageIcon size={18} />
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-purple-400 shadow-sm z-10 group-hover:-translate-y-0.5 transition-transform duration-200 delay-150">
                      <Video size={18} />
                    </div>
                  </div>
                </div>

                {/* Sub-title */}
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  FROM YOUR COMPUTER
                </span>

                {/* Main Title */}
                <h3 className="text-white text-lg font-medium leading-snug mb-4 group-hover:text-blue-300 transition-colors">
                  Upload other documents from your computer or CD
                </h3>
              </div>

              {/* Tags Row */}
              <div className="flex flex-wrap gap-2 pt-2">
                {documentTags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-[#23252b] text-gray-400 text-xs px-2 py-1 uppercase rounded font-bold border border-gray-800"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Right Side Button Area (dark blue bg-[#1a365d]) */}
            <div className="sm:w-36 bg-[#1a365d] group-hover:bg-[#1e4274] border-t sm:border-t-0 sm:border-l border-blue-900/40 flex flex-col items-center justify-center p-6 transition-colors duration-200">
              <div className="flex flex-col items-center gap-2 group-hover:translate-x-1 transition-transform duration-200">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/30 transition-colors">
                  <ArrowRight size={20} className="text-blue-400" />
                </div>
                <span className="text-xs font-bold text-blue-400 tracking-wider uppercase">
                  UPLOAD
                </span>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
