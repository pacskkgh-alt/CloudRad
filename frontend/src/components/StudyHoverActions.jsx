import React, { useState } from 'react';
import { 
  X, 
  FilePlus, 
  Send, 
  Tag, 
  Columns, 
  Download, 
  Trash2, 
  FileText,
  Building2 
} from 'lucide-react';

/**
 * StudyHoverActions Component
 * 
 * A sleek quick-action toolbar that appears when hovering over a study row in CaseTimeline.
 * 
 * Features:
 * - Positioned absolutely over the study row with `group-hover:opacity-100` transition
 * - Left side selection indicators: Image thumbnail and Report document badge with 'X' clear buttons
 * - Vertical divider
 * - Action buttons: Create case, Share, Manage labels, Compare, Download, Move to trash
 * 
 * @param {string} [thumbnailUrl] - Optional URL for study image thumbnail
 * @param {string} [patientInitial='U'] - Fallback initial if no thumbnail image exists
 * @param {boolean} [hasReport=true] - Whether a report document indicator is shown
 * @param {function} [onCreateCase] - Callback for 'Create case' action
 * @param {function} [onShare] - Callback for 'Share' action
 * @param {function} [onManageLabels] - Callback for 'Manage labels' action
 * @param {function} [onCompare] - Callback for 'Compare' action
 * @param {function} [onDownload] - Callback for 'Download' action
 * @param {function} [onTrash] - Callback for 'Move to trash' action
 * @param {function} [onClearImage] - Callback when thumbnail 'X' is clicked
 * @param {function} [onClearDoc] - Callback when report doc 'X' is clicked
 * @param {string} [className] - Optional custom wrapper styling
 */
export default function StudyHoverActions({
  thumbnailUrl = null,
  patientInitial = 'U',
  hasReport = true,
  onCreateCase,
  onShare,
  onManageLabels,
  onCompare,
  onDownload,
  onTrash,
  onClearImage,
  onClearDoc,
  className = ''
}) {
  const [showThumbnail, setShowThumbnail] = useState(true);
  const [showDoc, setShowDoc] = useState(hasReport);

  const handleClearThumbnail = (e) => {
    e.stopPropagation();
    setShowThumbnail(false);
    onClearImage?.(e);
  };

  const handleClearDoc = (e) => {
    e.stopPropagation();
    setShowDoc(false);
    onClearDoc?.(e);
  };

  const handleAction = (callback, e) => {
    e.stopPropagation();
    callback?.(e);
  };

  return (
    <div 
      className={`absolute inset-0 z-20 flex flex-row items-center gap-4 sm:gap-6 bg-white/95 backdrop-blur-xs shadow-sm border-t border-b border-gray-100 px-4 py-2 w-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto select-none ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Left Side: Selection Indicators */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Image Thumbnail with Deselect 'X' */}
        {showThumbnail && (
          <div className="relative group/thumb shrink-0">
            <button
              type="button"
              onClick={handleClearThumbnail}
              title="Deselect image"
              className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-gray-700/90 text-white rounded-full flex items-center justify-center hover:bg-red-500 shadow-sm transition-colors z-30 focus:outline-none"
            >
              <X size={10} strokeWidth={2.5} />
            </button>
            <div className="w-12 h-12 rounded-lg bg-gray-900 border border-gray-200 flex items-center justify-center overflow-hidden shadow-xs">
              {thumbnailUrl ? (
                <img 
                  src={thumbnailUrl} 
                  alt="Study Thumbnail" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-gray-200 text-xl font-black font-serif italic">
                  {patientInitial}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Document Icon with Deselect 'X' */}
        {showDoc && (
          <div className="relative group/doc shrink-0">
            <button
              type="button"
              onClick={handleClearDoc}
              title="Deselect report"
              className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-gray-700/90 text-white rounded-full flex items-center justify-center hover:bg-red-500 shadow-sm transition-colors z-30 focus:outline-none"
            >
              <X size={10} strokeWidth={2.5} />
            </button>
            <div className="w-12 h-12 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center shadow-xs">
              <FileText className="w-6 h-6 text-emerald-500 fill-emerald-100/50" strokeWidth={2} />
            </div>
          </div>
        )}

        {/* Subtle Vertical Divider */}
        {(showThumbnail || showDoc) && (
          <div className="h-8 w-px bg-gray-200 mx-1 shrink-0" />
        )}
      </div>

      {/* Action Buttons (Left to Right) */}
      <div className="flex items-center gap-1 sm:gap-3 md:gap-5 overflow-x-auto py-1">
        {/* 1. Create case */}
        <button
          type="button"
          onClick={(e) => handleAction(onCreateCase, e)}
          className="flex flex-col items-center justify-center gap-1.5 px-3 py-1 hover:bg-gray-50 active:bg-gray-100 rounded-md transition-colors text-xs font-medium text-gray-600 hover:text-gray-900 shrink-0 focus:outline-none group/btn cursor-pointer"
        >
          <FilePlus className="w-5 h-5 text-emerald-500 group-hover/btn:scale-110 transition-transform" />
          <span>Create case</span>
        </button>

        {/* 2. Share */}
        <button
          type="button"
          onClick={(e) => handleAction(onShare, e)}
          className="flex flex-col items-center justify-center gap-1.5 px-3 py-1 hover:bg-gray-50 active:bg-gray-100 rounded-md transition-colors text-xs font-medium text-gray-600 hover:text-gray-900 shrink-0 focus:outline-none group/btn cursor-pointer"
        >
          <Send className="w-5 h-5 text-blue-500 group-hover/btn:scale-110 transition-transform" />
          <span>Share</span>
        </button>

        {/* 3. Telerad Dispatch */}
        <button
          type="button"
          onClick={(e) => handleAction(onManageLabels, e)}
          title="Dispatch to Teleradiology Network"
          className="flex flex-col items-center justify-center gap-1.5 px-3 py-1 hover:bg-teal-50 active:bg-teal-100 rounded-md transition-colors text-xs font-medium text-gray-600 hover:text-teal-700 shrink-0 focus:outline-none group/btn cursor-pointer"
        >
          <Building2 className="w-5 h-5 text-teal-600 group-hover/btn:scale-110 transition-transform" />
          <span>Telerad</span>
        </button>

        {/* 4. Compare */}
        <button
          type="button"
          onClick={(e) => handleAction(onCompare, e)}
          className="flex flex-col items-center justify-center gap-1.5 px-3 py-1 hover:bg-gray-50 active:bg-gray-100 rounded-md transition-colors text-xs font-medium text-gray-600 hover:text-gray-900 shrink-0 focus:outline-none group/btn cursor-pointer"
        >
          <Columns className="w-5 h-5 text-gray-400 group-hover/btn:scale-110 transition-transform" />
          <span>Compare</span>
        </button>

        {/* 5. Download */}
        <button
          type="button"
          onClick={(e) => handleAction(onDownload, e)}
          className="flex flex-col items-center justify-center gap-1.5 px-3 py-1 hover:bg-gray-50 active:bg-gray-100 rounded-md transition-colors text-xs font-medium text-gray-600 hover:text-gray-900 shrink-0 focus:outline-none group/btn cursor-pointer"
        >
          <Download className="w-5 h-5 text-gray-600 group-hover/btn:scale-110 transition-transform" />
          <span>Download</span>
        </button>

        {/* 6. Move to trash */}
        <button
          type="button"
          onClick={(e) => handleAction(onTrash, e)}
          className="flex flex-col items-center justify-center gap-1.5 px-3 py-1 hover:bg-red-50/50 active:bg-red-50 rounded-md transition-colors text-xs font-medium text-gray-600 hover:text-red-600 shrink-0 focus:outline-none group/btn cursor-pointer"
        >
          <Trash2 className="w-5 h-5 text-red-500 group-hover/btn:scale-110 transition-transform" />
          <span>Move to trash</span>
        </button>
      </div>
    </div>
  );
}
