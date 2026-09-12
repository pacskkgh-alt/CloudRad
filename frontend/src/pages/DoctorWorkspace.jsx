import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from 'react-router-dom';
import axios from "axios";
import { Stethoscope, FileText, Eye, Download, CheckCircle, ChevronLeft, ChevronRight, RefreshCcw } from "lucide-react";
import { getApiUrl, getAuthHeaders } from "../config";

const PAGE_SIZE = 8;

export default function DoctorWorkspace({ doctor, onLogout }) {
  const [studies, setStudies]           = useState([]);
  const [selectedStudy, setSelectedStudy] = useState(null);
  const [reportText, setReportText]     = useState("");
  const [searchQuery, setSearchQuery]   = useState("");
  const [page, setPage]                 = useState(1);
  const [loading, setLoading]           = useState(false);
  const [saving, setSaving]             = useState(false);
  const navigate = useNavigate();

  const API_URL = getApiUrl();

  // ─── Fetch Studies ──────────────────────────────────────────────────────────
  const fetchStudies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/studies`, { headers: getAuthHeaders() });
      const studiesWithReports = await Promise.all(
        res.data.map(async (study) => {
          if (study.has_report) {
            try {
              const repRes = await axios.get(
                `${API_URL}/api/reports/${study.id}`,
                { headers: getAuthHeaders() },
              );
              return {
                ...study,
                report_content: repRes.data.report_content,
                is_finalized:   repRes.data.is_finalized,
              };
            } catch {
              return study;
            }
          }
          return study;
        }),
      );
      setStudies(studiesWithReports);
    } catch (err) {
      console.error("فشل جلب الدراسات", err);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => { fetchStudies(); }, [fetchStudies]);
  useEffect(() => { setPage(1); }, [searchQuery]);

  // ─── Viewer ──────────────────────────────────────────────────────────────────
  const handleOpenViewer = (orthancUuid) => {
    window.open(`/viewer/index.html?study=${orthancUuid}`, "_blank");
  };

  // ─── Save Report ──────────────────────────────────────────────────────────────
  const handleSaveReport = async (studyId) => {
    setSaving(true);
    try {
      await axios.post(
        `${API_URL}/api/reports/`,
        { study_id: studyId, report_content: reportText, is_finalized: true },
        { headers: getAuthHeaders() },
      );
      alert("تم اعتماد وحفظ التقرير الطبي بنجاح");
      fetchStudies();
    } catch {
      alert("فشل حفظ التقرير");
    } finally {
      setSaving(false);
    }
  };

  // ─── Filter + Paginate ────────────────────────────────────────────────────────
  const filtered = studies.filter(
    (s) =>
      s.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.modality?.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paged      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans rtl" dir="rtl">

      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Stethoscope className="w-8 h-8 text-emerald-400" />
          <div>
            <h1 className="text-xl font-bold">محطة الطبيب التشخيصية (Doctor Workspace)</h1>
            <p className="text-xs text-slate-400">
              قائمة الحالات الطبية، كتابة التقارير واعتمادها — مرحباً د. {doctor?.full_name}
            </p>
          </div>
        </div>
        <div className="flex gap-3 items-center">
          {/* Search */}
          <input
            type="text"
            placeholder="بحث باسم المريض أو نوع الفحص..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
          {/* Refresh */}
          <button
            onClick={fetchStudies}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
            title="تحديث"
          >
            <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={onLogout}
            className="text-xs bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/telerad')} className="text-xs bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 px-4 py-2 rounded-lg transition font-bold">شبكة Teleradiology</button>
        <button onClick={() => navigate('/tech/upload-station')} className="text-xs bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 px-4 py-2 rounded-lg transition font-bold">محطة رفع الفحوصات (DICOM)</button>
        {(doctor?.role === 'admin' || doctor?.role === 'clinic_admin') && (
            <button onClick={() => navigate('/admin')} className="text-xs bg-slate-500/20 text-slate-400 hover:bg-slate-500/30 px-4 py-2 rounded-lg transition font-bold">لوحة الإدارة</button>
        )}
      </div>

      {/* Stats */}
      <div className="flex gap-3 mb-4 text-xs text-slate-400">
        <span className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-full">
          إجمالي: <strong className="text-slate-200">{filtered.length}</strong>
        </span>
        <span className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-full">
          لم تُكتب تقاريرها: <strong className="text-amber-400">{filtered.filter(s => !s.has_report).length}</strong>
        </span>
        <span className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-full">
          معتمدة: <strong className="text-emerald-400">{filtered.filter(s => s.is_finalized).length}</strong>
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Study List */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          {loading && (
            <div className="text-center py-10 text-slate-500 text-sm animate-pulse">جاري التحميل...</div>
          )}
          {!loading && paged.length === 0 && (
            <div className="text-center py-10 text-slate-500 text-sm">لا توجد دراسات</div>
          )}
          {paged.map((study) => (
            <div
              key={study.id}
              className={`p-4 rounded-xl border transition flex items-center justify-between ${
                selectedStudy?.id === study.id
                  ? "bg-slate-900 border-emerald-500/50"
                  : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200">{study.patient_name}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    {study.modality || "DICOM"}
                  </span>
                  {study.is_finalized && (
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      معتمد ✓
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-1 flex gap-4">
                  <span>تاريخ الفحص: {study.study_date || "اليوم"}</span>
                  <span>الصور: {study.instances_count || 1}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenViewer(study.orthanc_study_uuid)}
                  className="flex items-center gap-1 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                >
                  <Eye className="w-4 h-4" /> فتح العارض
                </button>
                <button
                  onClick={() => {
                    setSelectedStudy(study);
                    setReportText(
                      study.report_content
                        ? study.report_content.replace(/<[^>]+>/g, "")
                        : "",
                    );
                  }}
                  className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                >
                  <FileText className="w-4 h-4" /> {study.has_report ? "تعديل التقرير" : "كتابة تقرير"}
                </button>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-400">
                صفحة <strong className="text-white">{safePage}</strong> من{" "}
                <strong className="text-white">{totalPages}</strong>
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Report Editor */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col h-full min-h-[500px]">
          <h2 className="text-sm font-bold text-slate-200 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            {selectedStudy
              ? `تقرير المريض: ${selectedStudy.patient_name}`
              : "اختر دراسة لكتابة التقرير"}
          </h2>
          {selectedStudy ? (
            <div className="flex-1 flex flex-col gap-3 h-full">
              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder="اكتب التشخيص، الملاحظات الطبية، والتوصيات هنا..."
                className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono leading-relaxed resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleSaveReport(selectedStudy.id)}
                  disabled={saving || !reportText.trim()}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-2 rounded-lg text-xs font-bold transition"
                >
                  <CheckCircle className="w-4 h-4" />
                  {saving ? "جاري الحفظ..." : "اعتماد التقرير الطبي"}
                </button>
                {selectedStudy.has_report && (
                  <a
                    href={`${API_URL}/api/reports/${selectedStudy.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
                    title="تحميل PDF"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
              يرجى اختيار مريض من القائمة للبدء في كتابة أو مراجعة التقرير
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
