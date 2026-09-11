import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { HardDrive, FileArchive, RefreshCcw, Eye } from "lucide-react";
import { getApiUrl } from "../config";

export default function TechnicianStation({ user, onLogout }) {
  const [studies, setStudies] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef(null);

  const token = localStorage.getItem("cloudrad_token");
  const API_URL = getApiUrl();
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchStudies();
  }, []);

  const fetchStudies = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/studies`, { headers });
      setStudies(res.data);
    } catch (err) {
      console.error("فشل جلب الدراسات", err);
    }
  };

  const handleOpenViewer = (orthancUuid) => {
    window.open(`/viewer/index.html?study=${orthancUuid}`, "_blank");
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("anonymize", "false"); // Technicians upload with names usually

    try {
      await axios.post(`${API_URL}/api/upload`, formData, {
        headers: {
          ...headers,
          "Content-Type": "multipart/form-data"
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setProgress(percentCompleted);
        }
      });
      alert("تم رفع الملف بنجاح");
      fetchStudies();
    } catch (err) {
      console.error(err);
      alert("فشل الرفع");
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const filteredStudies = studies.filter(s => 
    s.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.modality?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans rtl" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <HardDrive className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-xl font-bold">محطة الفني (Technician Station)</h1>
            <p className="text-xs text-slate-400">رفع الفحوصات الطبية ومطابقة جودة DICOM - مرحباً {user?.name}</p>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <div className="w-72">
            <input 
              type="text" 
              placeholder="بحث..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>
          <button onClick={onLogout} className="text-xs bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition">تسجيل الخروج</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Area */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-center">
            <h2 className="text-sm font-bold text-slate-200 mb-4">رفع ملفات الفحص الجديد</h2>
            <div 
              className="border-2 border-dashed border-slate-700 rounded-xl p-8 hover:border-blue-500 transition cursor-pointer bg-slate-950/50"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileArchive className="w-12 h-12 text-blue-400 mx-auto mb-3" />
              <p className="text-sm text-slate-300 font-semibold">اضغط هنا لاختيار ملف ZIP (يحتوي DICOM)</p>
              <p className="text-xs text-slate-500 mt-2">أو قم بسحب الملف وإفلاته هنا</p>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleUpload}
                accept=".zip"
                className="hidden"
              />
            </div>
            
            {uploading && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>جاري الرفع...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Studies */}
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800 rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-slate-200">الفحوصات المرفوعة مؤخراً</h2>
            <button onClick={fetchStudies} className="text-slate-400 hover:text-white transition">
              <RefreshCcw className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-3">
            {filteredStudies.map((study) => (
              <div key={study.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">{study.patient_name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                      {study.modality || "DICOM"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    تاريخ الفحص: {study.study_date || "اليوم"} • الصور: {study.instances_count || 1}
                  </div>
                </div>
                <button
                  onClick={() => handleOpenViewer(study.orthanc_study_uuid)}
                  className="flex items-center gap-1 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                >
                  <Eye className="w-4 h-4" /> العارض
                </button>
              </div>
            ))}
            {filteredStudies.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-xs">لا يوجد فحوصات</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
