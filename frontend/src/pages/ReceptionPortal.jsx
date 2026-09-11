import React, { useState, useEffect } from "react";
import axios from "axios";
import { Users, Link as LinkIcon, Download, RefreshCcw, Copy } from "lucide-react";
import { getApiUrl } from "../config";

export default function ReceptionPortal({ user, onLogout }) {
  const [studies, setStudies] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sharedLinks, setSharedLinks] = useState({});

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

  const handleGenerateLink = async (studyId) => {
    try {
      const res = await axios.post(`${API_URL}/api/share/`, { study_id: studyId }, { headers });
      const fullUrl = `${window.location.origin}/patient/${res.data.token}`;
      setSharedLinks(prev => ({ ...prev, [studyId]: fullUrl }));
    } catch (err) {
      alert("فشل إنشاء الرابط");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("تم نسخ الرابط!");
  };

  const filteredStudies = studies.filter(s => 
    s.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.patient_id_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans rtl" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-amber-400" />
          <div>
            <h1 className="text-xl font-bold">بوابة الاستقبال (Reception Portal)</h1>
            <p className="text-xs text-slate-400">إدارة المرضى ومشاركة الروابط - مرحباً {user?.name}</p>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <div className="w-72">
            <input 
              type="text" 
              placeholder="بحث باسم المريض أو رقم الهوية..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
          <button onClick={onLogout} className="text-xs bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition">تسجيل الخروج</button>
        </div>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold text-slate-200">سجل المرضى والفحوصات</h2>
          <button onClick={fetchStudies} className="text-slate-400 hover:text-white transition">
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-800/50 text-slate-300">
              <tr>
                <th className="px-4 py-3 rounded-tr-lg">اسم المريض</th>
                <th className="px-4 py-3">رقم الهوية</th>
                <th className="px-4 py-3">نوع الفحص</th>
                <th className="px-4 py-3">تاريخ الفحص</th>
                <th className="px-4 py-3 text-center">التقرير الطبي</th>
                <th className="px-4 py-3 rounded-tl-lg text-center">مشاركة</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudies.map((study) => (
                <tr key={study.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition">
                  <td className="px-4 py-3 font-semibold text-slate-200">{study.patient_name}</td>
                  <td className="px-4 py-3 text-slate-400">{study.patient_id_number || "-"}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono text-xs">
                      {study.modality || "DICOM"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{study.study_date || "اليوم"}</td>
                  <td className="px-4 py-3 text-center">
                    {study.has_report ? (
                      <a
                        href={`${API_URL}/api/reports/${study.id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-xs"
                      >
                        <Download className="w-4 h-4" /> جاهز للطباعة
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500">قيد الانتظار</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {sharedLinks[study.id] ? (
                      <button 
                        onClick={() => copyToClipboard(sharedLinks[study.id])}
                        className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 bg-amber-400/10 px-2 py-1 rounded text-xs transition"
                      >
                        <Copy className="w-3 h-3" /> نسخ الرابط
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleGenerateLink(study.id)}
                        className="inline-flex items-center gap-1 text-slate-400 hover:text-amber-400 text-xs transition"
                      >
                        <LinkIcon className="w-4 h-4" /> إنشاء رابط
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredStudies.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-xs">لا يوجد بيانات لعرضها</div>
          )}
        </div>
      </div>
    </div>
  );
}
