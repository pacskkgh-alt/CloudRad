import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  X, 
  Stethoscope, 
  Building2, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileText,
  UserCheck
} from 'lucide-react';
import { getApiUrl } from '../api';

const API_URL = getApiUrl();

/**
 * SecondOpinionModal Component
 * 
 * Dark-themed modal (matching UploadTypeModal palette) allowing patients 
 * or registered users to request a second radiological opinion from an active doctor.
 */
export default function SecondOpinionModal({ 
  isOpen = false, 
  onClose, 
  studyId, 
  studyModality = 'DICOM',
  patientName = 'Patient' 
}) {
  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [patientNotes, setPatientNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    fetchDoctors();
    setIsSuccess(false);
    setErrorMessage('');
    setPatientNotes('');
  }, [isOpen]);

  const fetchDoctors = async () => {
    try {
      setLoadingDoctors(true);
      const res = await axios.get(`${API_URL}/api/consultations/doctors-list`);
      setDoctors(res.data);
      if (res.data.length > 0) {
        setSelectedDoctorId(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load doctors list:', err);
      setErrorMessage('تعذر تحميل قائمة الأطباء المتاحين. يرجى المحاولة لاحقاً.');
    } finally {
      setLoadingDoctors(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      setErrorMessage('يرجى اختيار الطبيب الاستشاري المطلوب.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      await axios.post(`${API_URL}/api/consultations/request`, {
        study_id: studyId,
        target_doctor_id: selectedDoctorId,
        patient_notes: patientNotes.trim() || null,
      });

      setIsSuccess(true);
    } catch (err) {
      console.error('Failed to submit second opinion request:', err);
      const detail = err.response?.data?.detail || 'حدث خطأ أثناء إرسال طلب الرأي الطبي. يرجى المحاولة مجدداً.';
      setErrorMessage(detail);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111317] border border-gray-800 rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative text-gray-100">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-5 border-b border-gray-800/80 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Stethoscope size={22} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-wide">
                طلب استشارة ورأي طبي ثانٍ
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Request a Second Opinion &bull; فحص {studyModality} ({patientName})
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white bg-[#1a1c22] hover:bg-gray-800 border border-gray-700/50 rounded-lg p-2 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-5 p-3.5 bg-red-950/40 border border-red-800/60 rounded-xl flex items-center gap-3 text-red-300 text-xs font-medium">
            <AlertCircle size={18} className="shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success View */}
        {isSuccess ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={36} />
            </div>
            <h4 className="text-xl font-bold text-white">تم إرسال طلب الاستشارة بنجاح!</h4>
            <p className="text-sm text-gray-400 max-w-md">
              تم تحويل الفحص وملاحظاتك إلى الطبيب الاستشاري المختار. ستتم مراجعة الصور وإصدار الرأي الطبي في أقرب وقت.
            </p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg transition-colors text-sm"
            >
              تم &bull; إغلاق النافذة
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Doctor Picker */}
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase mb-2">
                اختر الطبيب الاستشاري (Consulting Radiologist)
              </label>
              {loadingDoctors ? (
                <div className="p-4 bg-[#1a1c22] border border-gray-800 rounded-xl text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin text-emerald-400" />
                  جاري تحميل قائمة الاستشاريين المتاحين...
                </div>
              ) : doctors.length === 0 ? (
                <div className="p-4 bg-[#1a1c22] border border-gray-800 rounded-xl text-center text-xs text-gray-400">
                  لا يوجد أطباء متاحون حالياً للاستشارة.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
                  {doctors.map((doc) => (
                    <button
                      type="button"
                      key={doc.id}
                      onClick={() => setSelectedDoctorId(doc.id)}
                      className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between ${
                        selectedDoctorId === doc.id
                          ? 'bg-[#1e293b] border-emerald-500 ring-1 ring-emerald-500'
                          : 'bg-[#1a1c22] border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <span className="text-sm font-bold text-white flex items-center gap-2">
                          <UserCheck size={16} className={selectedDoctorId === doc.id ? 'text-emerald-400' : 'text-gray-500'} />
                          {doc.full_name}
                        </span>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#23252b] text-emerald-400 font-bold border border-gray-800">
                          {doc.role}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-1.5">
                        <Building2 size={13} className="text-gray-500 shrink-0" />
                        <span className="truncate">{doc.clinic_name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Clinical Symptoms & Notes */}
            <div>
              <label className="block text-xs font-bold text-gray-300 uppercase mb-2 flex items-center gap-1.5">
                <FileText size={14} className="text-gray-400" />
                الأعراض والأسئلة السريرية (Clinical Indication & Notes)
              </label>
              <textarea
                rows={4}
                value={patientNotes}
                onChange={(e) => setPatientNotes(e.target.value)}
                placeholder="صف الأعراض الحالية، سبب طلب الرأي الثاني، أو أي استفسار محدد تود من الاستشاري التركيز عليه..."
                className="w-full bg-[#1a1c22] border border-gray-800 rounded-xl p-3.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-sans"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl border border-gray-700 hover:bg-gray-800 text-gray-300 font-semibold text-sm transition-colors"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={submitting || loadingDoctors || doctors.length === 0}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 text-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    إرسال طلب الاستشارة
                  </>
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
