import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from 'react-router-dom';
import axios from "axios";
import { Activity, Clock, Eye, CheckCircle, ShieldAlert, ChevronLeft, ChevronRight, Bell, BellOff } from "lucide-react";
import { getApiUrl, getWsUrl, getAuthToken, getAuthHeaders } from "../config";

const PAGE_SIZE = 10;

export default function TeleradWorklist({ doctor, onLogout }) {
  const [cases, setCases]               = useState([]);
  const navigate = useNavigate();
  const [filterPriority, setFilterPriority] = useState("all");
  const [page, setPage]                 = useState(1);
  const [wsStatus, setWsStatus]         = useState("connecting"); // connecting | open | closed
  const [notifications, setNotifications] = useState([]);

  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  const API_URL = getApiUrl();
  const WS_URL  = getWsUrl();

  // ─── Fetch Worklist ─────────────────────────────────────────────────────────
  const fetchWorklist = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/telerad/worklist`, {
        headers: getAuthHeaders(),
      });
      setCases(res.data);
    } catch (err) {
      console.error("فشل جلب قائمة الفحوصات", err);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchWorklist();
  }, [fetchWorklist]);

  // ─── WebSocket for Real-time Notifications ──────────────────────────────────
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const connect = () => {
      try {
        const ws = new WebSocket(`${WS_URL}/ws/notifications?token=${token}`);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsStatus("open");
          clearTimeout(reconnectTimerRef.current);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "new_case") {
              setNotifications(prev => [
                { id: Date.now(), text: `حالة جديدة: ${msg.modality} — ${msg.priority}`, ts: new Date() },
                ...prev.slice(0, 4), // keep last 5 notifications
              ]);
              fetchWorklist(); // auto-refresh
            }
          } catch { /* ignore non-JSON pings */ }
        };

        ws.onerror = () => setWsStatus("closed");

        ws.onclose = () => {
          setWsStatus("closed");
          // Auto-reconnect after 5 seconds
          reconnectTimerRef.current = setTimeout(connect, 5000);
        };
      } catch {
        setWsStatus("closed");
      }
    };

    connect();
    return () => {
      clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [WS_URL, fetchWorklist]);

  // ─── Claim a Case ───────────────────────────────────────────────────────────
  const handleClaimCase = async (studyId) => {
    try {
      await axios.post(
        `${API_URL}/api/telerad/cases/${studyId}/claim`,
        {},
        { headers: getAuthHeaders() },
      );
      fetchWorklist();
    } catch (err) {
      alert(err.response?.data?.detail || "تعذر استلام الحالة");
    }
  };

  // ─── Priority Badge ──────────────────────────────────────────────────────────
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case "stat":
        return (
          <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded text-xs flex items-center gap-1 font-bold animate-pulse">
            <ShieldAlert className="w-3 h-3" /> طوارئ قصوى (STAT)
          </span>
        );
      case "urgent":
        return (
          <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-xs flex items-center gap-1 font-semibold">
            <Clock className="w-3 h-3" /> عاجل (Urgent)
          </span>
        );
      default:
        return (
          <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-xs">
            روتيني (Routine)
          </span>
        );
    }
  };

  // ─── Filter + Paginate ────────────────────────────────────────────────────────
  const filteredCases = filterPriority === "all"
    ? cases
    : cases.filter(c => c.priority === filterPriority);

  const totalPages   = Math.max(1, Math.ceil(filteredCases.length / PAGE_SIZE));
  const safePage     = Math.min(page, totalPages);
  const pagedCases   = filteredCases.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset page when filter changes
  useEffect(() => { setPage(1); }, [filterPriority]);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans rtl" dir="rtl">

      {/* Live Notifications Bar */}
      {notifications.length > 0 && (
        <div className="mb-4 space-y-2">
          {notifications.map(n => (
            <div key={n.id} className="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg px-4 py-2 text-xs text-cyan-300 animate-pulse">
              <Bell className="w-4 h-4 flex-shrink-0" />
              <span>{n.text}</span>
              <button
                onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))}
                className="mr-auto text-slate-400 hover:text-white transition"
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Activity className="w-8 h-8 text-cyan-400" />
          <div>
            <h1 className="text-xl font-bold">شبكة قراءة الأشعة عن بُعد (Teleradiology Worklist)</h1>
            <p className="text-xs text-slate-400">توزيع الحالات وإدارة زمن الاستجابة الطبية (SLA)</p>
          </div>
        </div>

        {/* WebSocket Status + Filters */}
        <div className="flex items-center gap-3">
          {/* WS Indicator */}
          <span className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${
            wsStatus === "open"
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-slate-800 text-slate-500 border-slate-700"
          }`}>
            {wsStatus === "open" ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
            {wsStatus === "open" ? "مباشر" : "غير متصل"}
          </span>

          {/* Priority Filters */}
          {["all", "stat", "urgent", "routine"].map((p) => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`px-3 py-1.5 rounded-lg text-xs transition ${
                filterPriority === p
                  ? "bg-cyan-600 text-white font-bold"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-600"
              }`}
            >
              {p === "all" ? "جميع الحالات" : p.toUpperCase()}
            </button>
          ))}
        </div>
        <button onClick={onLogout} className="text-xs bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition ml-4">تسجيل الخروج</button>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/doctor/workspace')} className="text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-4 py-2 rounded-lg transition font-bold">محطة الطبيب التشخيصية</button>
        <button onClick={() => navigate('/tech/upload-station')} className="text-xs bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 px-4 py-2 rounded-lg transition font-bold">محطة رفع الفحوصات (DICOM)</button>
        {(doctor?.role === 'admin' || doctor?.role === 'clinic_admin') && (
            <button onClick={() => navigate('/admin')} className="text-xs bg-slate-500/20 text-slate-400 hover:bg-slate-500/30 px-4 py-2 rounded-lg transition font-bold">لوحة الإدارة</button>
        )}
      </div>

      {/* Summary chips */}
      <div className="flex gap-3 mb-4 text-xs text-slate-400">
        <span className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-full">
          إجمالي: <strong className="text-slate-200">{filteredCases.length}</strong>
        </span>
        <span className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-full">
          طوارئ: <strong className="text-red-400">{cases.filter(c => c.priority === "stat").length}</strong>
        </span>
        <span className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-full">
          عاجل: <strong className="text-amber-400">{cases.filter(c => c.priority === "urgent").length}</strong>
        </span>
      </div>

      {/* Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-right border-collapse text-sm">
          <thead>
            <tr className="bg-slate-800/60 text-slate-400 text-xs border-b border-slate-800">
              <th className="p-4">الأولوية / SLA</th>
              <th className="p-4">المنشأة المصدر</th>
              <th className="p-4">نوع الفحص والمقطع</th>
              <th className="p-4">الحالة التشغيلية</th>
              <th className="p-4 text-center">الإجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {pagedCases.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-500 text-sm">
                  لا توجد حالات بهذا الفلتر
                </td>
              </tr>
            )}
            {pagedCases.map((c) => (
              <tr key={c.id} className="hover:bg-slate-800/30 transition">
                <td className="p-4">{getPriorityBadge(c.priority)}</td>
                <td className="p-4 font-medium text-slate-300">{c.institution_name || "مركز أشعة معتمد"}</td>
                <td className="p-4">
                  <div className="font-mono text-xs text-cyan-400 font-bold">{c.modality}</div>
                  <div className="text-[11px] text-slate-400">{c.body_part || "عام"}</div>
                </td>
                <td className="p-4">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
                    {c.status}
                  </span>
                </td>
                <td className="p-4 text-center">
                  {c.is_assigned_to_me ? (
                    <button
                      onClick={() => window.location.href = `/doctor/workspace?study=${c.id}`}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 mx-auto transition"
                    >
                      <Eye className="w-3.5 h-3.5" /> فتح التشخيص
                    </button>
                  ) : (
                    <button
                      onClick={() => handleClaimCase(c.id)}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 mx-auto transition"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> استلام الحالة
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-400">
            صفحة <strong className="text-white">{safePage}</strong> من <strong className="text-white">{totalPages}</strong>
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
