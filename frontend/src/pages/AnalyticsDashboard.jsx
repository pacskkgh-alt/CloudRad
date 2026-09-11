import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import {
  BarChart2, TrendingUp, TrendingDown, Activity, FileText,
  Users, Building, Clock, CheckCircle, AlertTriangle, RefreshCcw,
  Minus
} from "lucide-react";
import { getApiUrl, getAuthHeaders } from "../config";

const API_URL = getApiUrl();

// ─── Colour palette ──────────────────────────────────────────────────────────
const MODALITY_COLORS = {
  CT:   "#3b82f6",
  MR:   "#a855f7",
  MRI:  "#a855f7",
  US:   "#14b8a6",
  CR:   "#f59e0b",
  DX:   "#f59e0b",
  NM:   "#ef4444",
  PT:   "#ef4444",
  default: "#64748b",
};

const getColor = (m) =>
  MODALITY_COLORS[(m || "").toUpperCase()] || MODALITY_COLORS.default;

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
function KPICard({ icon: Icon, label, value, sub, color, trend }) {
  const isUp   = trend > 0;
  const isFlat = trend === 0;
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex gap-4 items-start hover:border-slate-700 transition-all">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-3xl font-black text-slate-100 mt-1 leading-none">{value ?? "—"}</p>
        {sub != null && (
          <div className="flex items-center gap-1 mt-1">
            {isFlat
              ? <Minus className="w-3 h-3 text-slate-500" />
              : isUp
              ? <TrendingUp   className="w-3 h-3 text-emerald-400" />
              : <TrendingDown className="w-3 h-3 text-red-400" />
            }
            <span className={`text-xs font-semibold ${isFlat ? "text-slate-500" : isUp ? "text-emerald-400" : "text-red-400"}`}>
              {isFlat ? "0%" : `${isUp ? "+" : ""}${sub}%`}
            </span>
            <span className="text-xs text-slate-500">مقارنة بالشهر الماضي</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Inline Bar Chart (SVG — no dependency) ──────────────────────────────────
function SparkBarChart({ data, height = 80, color = "#6366f1" }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.count), 1);
  const w = 100 / data.length;
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      {data.map((d, i) => {
        const barH = (d.count / max) * (height - 4);
        return (
          <g key={i}>
            <rect
              x={i * w + w * 0.1}
              y={height - barH - 2}
              width={w * 0.8}
              height={barH + 2}
              rx="1.5"
              fill={color}
              opacity="0.85"
            />
          </g>
        );
      })}
    </svg>
  );
}

// ─── Donut Chart (SVG) ───────────────────────────────────────────────────────
function DonutChart({ slices, size = 140 }) {
  const r  = 50;
  const cx = 60;
  const cy = 60;
  const circumference = 2 * Math.PI * r;

  let cumulative = 0;
  const total = slices.reduce((s, x) => s + x.count, 0) || 1;

  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth="18" />
      {slices.map((s, i) => {
        const pct    = s.count / total;
        const dash   = pct * circumference;
        const offset = -cumulative * circumference;
        cumulative  += pct;
        return (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="18"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={offset}
            strokeLinecap="butt"
            style={{ transformOrigin: `${cx}px ${cy}px`, transform: "rotate(-90deg)" }}
          />
        );
      })}
      <text x={cx} y={cy - 4} textAnchor="middle" fill="#f1f5f9" fontSize="14" fontWeight="bold">
        {total}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#64748b" fontSize="7">
        فحص
      </text>
    </svg>
  );
}

// ─── Horizontal Bar ──────────────────────────────────────────────────────────
function HBar({ label, value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 w-24 text-left truncate shrink-0">{label}</span>
      <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs font-bold text-slate-300 w-8 text-left">{value}</span>
    </div>
  );
}

// ─── SLA Gauge ───────────────────────────────────────────────────────────────
function SLAGauge({ pct, label }) {
  const color = pct >= 95 ? "#22c55e" : pct >= 80 ? "#f59e0b" : "#ef4444";
  const arc   = pct / 100;
  const r     = 40;
  const circum = Math.PI * r; // semi-circle
  const dash   = arc * circum;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="110" height="65" viewBox="0 0 110 65">
        {/* background arc */}
        <path
          d="M 10 55 A 45 45 0 0 1 100 55"
          fill="none" stroke="#1e293b" strokeWidth="12" strokeLinecap="round"
        />
        {/* colored arc */}
        <path
          d="M 10 55 A 45 45 0 0 1 100 55"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${arc * 141} 141`}
        />
        <text x="55" y="52" textAnchor="middle" fill={color} fontSize="14" fontWeight="bold">
          {pct}%
        </text>
      </svg>
      <span className="text-xs text-slate-400 font-medium">{label}</span>
    </div>
  );
}


// ─── Main Analytics Dashboard ─────────────────────────────────────────────────
export default function AnalyticsDashboard({ doctor }) {
  const [summary,    setSummary]    = useState(null);
  const [timeline,   setTimeline]   = useState([]);
  const [modality,   setModality]   = useState([]);
  const [reportRate, setReportRate] = useState(null);
  const [sla,        setSla]        = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [days,       setDays]       = useState(30);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const safe = async (url) => {
      try {
        const res = await axios.get(url, { headers: getAuthHeaders() });
        return res.data;
      } catch { return null; }
    };
    const [s, t, m, r, sl] = await Promise.all([
      safe(`${API_URL}/api/analytics/summary`),
      safe(`${API_URL}/api/analytics/studies-over-time?days=${days}`),
      safe(`${API_URL}/api/analytics/modality-distribution`),
      safe(`${API_URL}/api/analytics/report-rate`),
      safe(`${API_URL}/api/analytics/telerad-sla`),
    ]);
    if (s)  setSummary(s);
    if (t)  setTimeline(t);
    if (m)  setModality(m);
    if (r)  setReportRate(r);
    if (sl) setSla(sl);
    setLoading(false);
  }, [days]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const modalitySlices = modality.map((m) => ({ ...m, color: getColor(m.modality) }));
  const maxDoctorReports = Math.max(...(reportRate?.per_doctor?.map((d) => d.reports) || [1]));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 rtl" dir="rtl">

      {/* ─── Header ──────────────────────────────────────────────── */}
      <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20">
            <BarChart2 className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-black">لوحة الإحصائيات والتحليلات</h1>
            <p className="text-xs text-slate-400">بيانات حية • Analytics Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Days selector */}
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                days === d
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-600"
              }`}
            >
              {d === 7 ? "أسبوع" : d === 30 ? "30 يوم" : "3 أشهر"}
            </button>
          ))}
          <button
            onClick={fetchAll}
            className={`p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition ${loading ? "animate-spin" : ""}`}
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-16 text-slate-500">
          <Activity className="w-8 h-8 mx-auto mb-3 animate-pulse text-indigo-500" />
          <p className="text-sm">جاري تحميل الإحصائيات...</p>
        </div>
      )}

      {!loading && (
        <>
          {/* ─── KPI Cards ───────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KPICard
              icon={FileText}
              label="إجمالي الفحوصات"
              value={summary?.total_studies?.toLocaleString("ar-SA")}
              sub={summary?.mom_change_percent}
              trend={summary?.mom_change_percent ?? 0}
              color="bg-indigo-500/15 text-indigo-400"
            />
            <KPICard
              icon={Users}
              label="المرضى المسجلون"
              value={summary?.total_patients?.toLocaleString("ar-SA")}
              trend={0}
              color="bg-cyan-500/15 text-cyan-400"
            />
            <KPICard
              icon={CheckCircle}
              label="التقارير المكتملة"
              value={summary?.total_reports?.toLocaleString("ar-SA")}
              trend={0}
              color="bg-emerald-500/15 text-emerald-400"
            />
            <KPICard
              icon={AlertTriangle}
              label="تقارير قيد الانتظار"
              value={summary?.pending_reports?.toLocaleString("ar-SA")}
              trend={0}
              color="bg-amber-500/15 text-amber-400"
            />
          </div>

          {/* ─── Charts Row 1 ────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

            {/* Studies Over Time */}
            <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-200">حجم الفحوصات عبر الزمن</h2>
                  <p className="text-xs text-slate-500">آخر {days} يوم</p>
                </div>
                <span className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-full border border-indigo-500/20">
                  {timeline.reduce((s, d) => s + d.count, 0)} فحص
                </span>
              </div>

              <SparkBarChart data={timeline} height={110} color="#6366f1" />

              {/* X-axis labels (first + last + middle) */}
              <div className="flex justify-between mt-2 text-[10px] text-slate-600">
                <span>{timeline[0]?.date?.slice(5) || ""}</span>
                <span>{timeline[Math.floor(timeline.length / 2)]?.date?.slice(5) || ""}</span>
                <span>{timeline[timeline.length - 1]?.date?.slice(5) || ""}</span>
              </div>
            </div>

            {/* Modality Donut */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-slate-200 mb-4">توزيع أنواع الفحوصات</h2>
              <div className="flex items-center justify-center mb-4">
                <DonutChart slices={modalitySlices} size={140} />
              </div>
              <div className="space-y-2">
                {modalitySlices.slice(0, 6).map((s) => (
                  <div key={s.modality} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <span className="text-slate-300 font-mono font-bold">{s.modality}</span>
                    <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden mx-1">
                      <div className="h-1.5 rounded-full" style={{ width: `${s.percent}%`, background: s.color }} />
                    </div>
                    <span className="text-slate-500">{s.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Charts Row 2 ────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

            {/* Report Completion */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-slate-200 mb-4">معدل اكتمال التقارير</h2>

              {/* Circular progress */}
              <div className="flex justify-center mb-4">
                <div className="relative w-28 h-28">
                  <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" strokeWidth="10" />
                    <circle
                      cx="50" cy="50" r="42"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={`${(reportRate?.completion_rate || 0) * 2.64} 264`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-emerald-400">{reportRate?.completion_rate ?? 0}%</span>
                    <span className="text-[10px] text-slate-500">مكتملة</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20">
                  <p className="text-lg font-black text-emerald-400">{reportRate?.with_report ?? 0}</p>
                  <p className="text-[10px] text-slate-500">لها تقرير</p>
                </div>
                <div className="bg-amber-500/10 rounded-xl p-3 border border-amber-500/20">
                  <p className="text-lg font-black text-amber-400">{reportRate?.without_report ?? 0}</p>
                  <p className="text-[10px] text-slate-500">بدون تقرير</p>
                </div>
              </div>
            </div>

            {/* Top Doctors */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-slate-200 mb-4">أداء الأطباء (عدد التقارير)</h2>
              <div className="space-y-3">
                {(reportRate?.per_doctor || []).slice(0, 7).map((d, i) => (
                  <HBar
                    key={i}
                    label={d.name}
                    value={d.reports}
                    max={maxDoctorReports}
                    color={i === 0 ? "#6366f1" : i === 1 ? "#8b5cf6" : "#a78bfa"}
                  />
                ))}
                {(!reportRate?.per_doctor?.length) && (
                  <p className="text-xs text-slate-500 text-center py-4">لا يوجد بيانات حتى الآن</p>
                )}
              </div>
            </div>

            {/* SLA Gauges */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-sm font-bold text-slate-200 mb-2">التزام وقت الاستجابة (SLA)</h2>
              <p className="text-xs text-slate-500 mb-5">معدل إتمام الحالات ضمن الإطار الزمني المحدد</p>

              <div className="flex justify-around mb-4">
                <SLAGauge pct={sla?.stat_sla_pct    ?? 0} label="STAT (طوارئ)" />
                <SLAGauge pct={sla?.urgent_sla_pct  ?? 0} label="Urgent (عاجل)" />
              </div>

              <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700">
                <p className="text-xs text-slate-400 mb-1">معدل SLA الكلي</p>
                <p className="text-2xl font-black" style={{
                  color: (sla?.overall_sla_pct ?? 0) >= 95 ? "#22c55e"
                       : (sla?.overall_sla_pct ?? 0) >= 80 ? "#f59e0b" : "#ef4444"
                }}>
                  {sla?.overall_sla_pct ?? 0}%
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 text-center text-xs">
                <div className="bg-slate-800 rounded-lg p-2">
                  <p className="font-bold text-red-400">{sla?.stat_total ?? 0}</p>
                  <p className="text-slate-500">حالة طوارئ</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-2">
                  <p className="font-bold text-amber-400">{sla?.urgent_total ?? 0}</p>
                  <p className="text-slate-500">حالة عاجلة</p>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Secondary KPIs ──────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 text-center">
              <Building className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
              <p className="text-2xl font-black text-slate-100">{summary?.total_clinics ?? 0}</p>
              <p className="text-xs text-slate-500">مركز طبي</p>
            </div>
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 text-center">
              <Users className="w-5 h-5 text-indigo-400 mx-auto mb-2" />
              <p className="text-2xl font-black text-slate-100">{summary?.active_doctors ?? 0}</p>
              <p className="text-xs text-slate-500">طبيب وموظف نشط</p>
            </div>
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 text-center">
              <FileText className="w-5 h-5 text-purple-400 mx-auto mb-2" />
              <p className="text-2xl font-black text-slate-100">{reportRate?.finalized ?? 0}</p>
              <p className="text-xs text-slate-500">تقرير معتمد</p>
            </div>
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 text-center">
              <Activity className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
              <p className="text-2xl font-black text-slate-100">{summary?.this_month_studies ?? 0}</p>
              <p className="text-xs text-slate-500">فحص هذا الشهر</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
