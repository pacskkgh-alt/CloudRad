import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, File, Building, LogOut, Plus, Trash2, User, BarChart2 } from 'lucide-react';
import axios from 'axios';
import { getApiUrl, getAuthHeaders } from '../config';
import AnalyticsDashboard from './AnalyticsDashboard';

const API_URL = getApiUrl();



export default function AdminDashboard({ doctor, onLogout }) {
  const darkMode = true; // PacsBin aesthetic strict dark mode
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [links, setLinks] = useState([]);
  const [stats, setStats] = useState({ totalStudies: 0 });
  const navigate = useNavigate();

  const [showUserModal, setShowUserModal] = useState(false);
  const [showClinicModal, setShowClinicModal] = useState(false);

  const [userForm, setUserForm] = useState({ full_name: '', email: '', password: '', role: 'user', clinic_id: '' });
  const [clinicForm, setClinicForm] = useState({ name: '', address: '', phone_call: '' });

  const fetchData = async () => {
    const fetchSafe = async (url) => {
      try {
        const res = await axios.get(url, { headers: getAuthHeaders() });
        return res.data;
      } catch (err) {
        console.error(`Error fetching ${url}:`, err);
        return null;
      }
    };

    const studiesData = await fetchSafe(`${API_URL}/api/studies`);
    const usersData = await fetchSafe(`${API_URL}/api/admin/users`);
    const clinicsData = await fetchSafe(`${API_URL}/api/admin/clinics`);
    const sharesData = await fetchSafe(`${API_URL}/api/admin/shares`);

    if (studiesData) setStats({ totalStudies: studiesData.length });
    if (usersData) setUsers(usersData);
    if (clinicsData) setClinics(clinicsData);
    if (sharesData) setLinks(sharesData);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/admin/users`, userForm, { headers: getAuthHeaders() });
      setShowUserModal(false);
      fetchData();
      setUserForm({ full_name: '', email: '', password: '', role: 'user', clinic_id: '' });
    } catch (err) {
      alert(err.response?.data?.detail || "Error creating user");
    }
  };

  const handleDeleteUser = async (id) => {
    if(!window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    try {
      await axios.delete(`${API_URL}/api/admin/users/${id}`, { headers: getAuthHeaders() });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Error deleting user");
    }
  };

  const handleToggleUser = async (id) => {
    try {
      await axios.put(`${API_URL}/api/admin/users/${id}/toggle`, {}, { headers: getAuthHeaders() });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Error toggling user status");
    }
  };

  const handleRevokeLink = async (id) => {
    if(!window.confirm('تأكيد إبطال الرابط فوراً؟ (Nuke Link)')) return;
    try {
      await axios.put(`${API_URL}/api/admin/shares/${id}/revoke`, {}, { headers: getAuthHeaders() });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || "Error revoking link");
    }
  };

  const handleCreateClinic = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/admin/clinics`, clinicForm, { headers: getAuthHeaders() });
      setShowClinicModal(false);
      fetchData();
      setClinicForm({ name: '', address: '', phone_call: '' });
    } catch (err) {
      alert("Error creating clinic");
    }
  };

  const renderOverview = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className={`p-8 rounded-3xl border shadow-xl flex items-center gap-6 ${darkMode ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="p-5 rounded-2xl bg-indigo-500/20 text-indigo-400"><File className="w-10 h-10" /></div>
        <div><p className="text-4xl font-black">{stats.totalStudies}</p><p className="text-sm text-slate-500 font-bold mt-1">إجمالي الفحوصات</p></div>
      </div>
      <div className={`p-8 rounded-3xl border shadow-xl flex items-center gap-6 ${darkMode ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="p-5 rounded-2xl bg-cyan-500/20 text-cyan-400"><Building className="w-10 h-10" /></div>
        <div><p className="text-4xl font-black">{clinics.length}</p><p className="text-sm text-slate-500 font-bold mt-1">العيادات والمراكز</p></div>
      </div>
      <div className={`p-8 rounded-3xl border shadow-xl flex items-center gap-6 ${darkMode ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="p-5 rounded-2xl bg-purple-500/20 text-purple-400"><Users className="w-10 h-10" /></div>
        <div><p className="text-4xl font-black">{users.length}</p><p className="text-sm text-slate-500 font-bold mt-1">المستخدمين (الأطباء والفنيين)</p></div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className={`rounded-3xl border shadow-xl overflow-hidden ${darkMode ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'}`}>
      <div className="p-6 border-b flex justify-between items-center border-slate-800 border-opacity-50">
         <h3 className="text-xl font-bold">إدارة مستخدمين النظام</h3>
         <button onClick={() => setShowUserModal(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition-all"><Plus className="w-4 h-4"/> إضافة مستخدم لتسجيل الدخول</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-right">
          <thead className={darkMode ? 'bg-slate-800/50' : 'bg-slate-50'}>
            <tr>
              <th className="p-4 font-semibold text-slate-400">الاسم</th>
              <th className="p-4 font-semibold text-slate-400">البريد الإلكتروني</th>
              <th className="p-4 font-semibold text-slate-400">الصلاحية (الدور)</th>
              <th className="p-4 font-semibold text-slate-400">حالة الحساب</th>
              <th className="p-4 font-semibold text-slate-400">العيادة المرتبطة</th>
              <th className="p-4 font-semibold text-slate-400">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className={`border-b border-opacity-30 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <td className="p-4 font-medium flex items-center gap-3"><User className="w-8 h-8 p-1.5 bg-slate-800 rounded-full text-slate-300" /> {u.full_name}</td>
                <td className="p-4 text-slate-400">{u.email}</td>
                <td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-bold ${u.role === 'admin' ? 'bg-red-500/10 text-red-500' : u.role === 'doctor' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-cyan-500/10 text-cyan-400'}`}>{u.role === 'user' ? 'فني أشعة' : u.role === 'doctor' ? 'طبيب معالج' : 'مدير نظام'}</span></td>
                <td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-bold border ${u.is_active ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>{u.is_active ? 'نشط' : 'معطل'}</span></td>
                <td className="p-4 text-slate-400">{clinics.find(c => c.id === u.clinic_id)?.name || 'غير محدد (الفرع الرئيسي)'}</td>
                <td className="p-4 flex gap-2 justify-end">
                  <button onClick={() => handleToggleUser(u.id)} className={`p-2 rounded-lg transition-colors ${u.is_active ? 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20' : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'}`} title={u.is_active ? "تعطيل الحساب" : "تفعيل الحساب"}>{u.is_active ? 'تعطيل' : 'تفعيل'}</button>
                  <button onClick={() => handleDeleteUser(u.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20" title="حذف المستخدم"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderClinics = () => (
    <div className={`rounded-3xl border shadow-xl overflow-hidden ${darkMode ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'}`}>
      <div className="p-6 border-b flex justify-between items-center border-slate-800 border-opacity-50">
         <h3 className="text-xl font-bold">بوابة العيادات وإدارة المراكز</h3>
         <button onClick={() => setShowClinicModal(true)} className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl transition-all"><Plus className="w-4 h-4"/> تسجيل مركز طبي جديد</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-right">
          <thead className={darkMode ? 'bg-slate-800/50' : 'bg-slate-50'}>
            <tr>
              <th className="p-4 font-semibold text-slate-400">المركز الطبي</th>
              <th className="p-4 font-semibold text-slate-400">العنوان</th>
              <th className="p-4 font-semibold text-slate-400">الهاتف</th>
              <th className="p-4 font-semibold text-slate-400">الطاقم المسجل للعيادة</th>
            </tr>
          </thead>
          <tbody>
            {clinics.map(c => (
              <tr key={c.id} className={`border-b border-opacity-30 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <td className="p-4 font-bold text-cyan-400"><Building className="inline-block w-5 h-5 ml-2 opacity-50"/>{c.name}</td>
                <td className="p-4 text-slate-400">{c.address || '-'}</td>
                <td className="p-4 text-slate-400">{c.phone_call || '-'}</td>
                <td className="p-4"><span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-bold text-slate-300">{users.filter(u => u.clinic_id === c.id).length} مستخدمين</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderLinks = () => (
    <div className={`rounded-3xl border shadow-xl overflow-hidden ${darkMode ? 'bg-[#111827] border-slate-800' : 'bg-white border-slate-200'}`}>
      <div className="p-6 border-b flex justify-between items-center border-slate-800 border-opacity-50">
         <h3 className="text-xl font-bold">مراقبة الروابط والمشاركات العالمية</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-right">
          <thead className={darkMode ? 'bg-slate-800/50' : 'bg-slate-50'}>
            <tr>
              <th className="p-4 font-semibold text-slate-400">المريض</th>
              <th className="p-4 font-semibold text-slate-400">الطبيب المنشئ</th>
              <th className="p-4 font-semibold text-slate-400">عدد المشاهدات</th>
              <th className="p-4 font-semibold text-slate-400">تاريخ الانتهاء</th>
              <th className="p-4 font-semibold text-slate-400">حالة الرابط</th>
              <th className="p-4 font-semibold text-slate-400">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {links.map(l => (
              <tr key={l.id} className={`border-b border-opacity-30 ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <td className="p-4 font-medium">{l.patient_name}</td>
                <td className="p-4 text-slate-400">{l.doctor_name}</td>
                <td className="p-4 text-slate-400">{l.views_count}</td>
                <td className="p-4 text-slate-400">{l.expires_at ? new Date(l.expires_at).toLocaleString('en-US') : 'دائم'}</td>
                <td className="p-4"><span className={`px-3 py-1 rounded-full text-xs font-bold border ${l.is_active ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>{l.is_active ? 'نشط' : 'منتهي'}</span></td>
                <td className="p-4 flex gap-2 justify-end">
                  {l.is_active && <button onClick={() => handleRevokeLink(l.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 font-bold" title="إبطال الرابط (Nuke)">إبطال Nuke</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'dark bg-[#0a0f1c] text-white' : 'bg-slate-50 text-slate-900'} transition-colors duration-500 font-sans`} dir="rtl">
      <header className={`flex flex-col lg:flex-row justify-between items-center p-5 lg:px-10 backdrop-blur-md sticky top-0 z-40 transition-colors gap-4 ${darkMode ? 'bg-[#0a0f1c]/80 border-b border-white/5' : 'bg-white/80 border-b border-slate-200'}`}>
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-400 flex items-center justify-center shadow-lg"><h1 className="text-xl font-bold text-white uppercase tracking-wider">CR</h1></div>
          <h1 className="text-xl font-bold border-l pl-4 border-slate-700">CloudRad <span className="font-light text-indigo-400">إدارة النظام المركزية</span></h1>
        </div>
        
        <div className="flex bg-[#1f2937] p-1.5 rounded-2xl w-full lg:w-auto overflow-x-auto">
           <button onClick={()=>setActiveTab('overview')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab==='overview'?'bg-indigo-600 text-white shadow-lg':'text-slate-400 hover:text-white flex-shrink-0'}`}>لوحة القيادة</button>
           <button onClick={()=>setActiveTab('analytics')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab==='analytics'?'bg-violet-600 text-white shadow-lg':'text-slate-400 hover:text-white flex-shrink-0'}`}><BarChart2 className="w-4 h-4"/>الإحصائيات</button>
           <button onClick={()=>setActiveTab('users')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab==='users'?'bg-indigo-600 text-white shadow-lg':'text-slate-400 hover:text-white flex-shrink-0'}`}>إدارة الموظفين</button>
           <button onClick={()=>setActiveTab('clinics')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab==='clinics'?'bg-indigo-600 text-white shadow-lg':'text-slate-400 hover:text-white flex-shrink-0'}`}>المراكز والمستشفيات</button>
           <button onClick={()=>setActiveTab('links')} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab==='links'?'bg-rose-600 text-white shadow-lg':'text-slate-400 hover:text-white flex-shrink-0'}`}>مراقبة وتسجيل المشاركات</button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/tech/upload-station')} className="text-xs bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 px-3 py-2 rounded-lg transition font-bold whitespace-nowrap">محطة الرفع</button>
          <button onClick={() => navigate('/telerad')} className="text-xs bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 px-3 py-2 rounded-lg transition font-bold whitespace-nowrap">Teleradiology</button>
          <button onClick={() => navigate('/doctor/workspace')} className="text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 px-3 py-2 rounded-lg transition font-bold whitespace-nowrap">محطة الطبيب</button>
          <button onClick={onLogout} className="p-2.5 rounded-full bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 ml-2" title="خروج"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'overview'   && renderOverview()}
        {activeTab === 'analytics'  && <AnalyticsDashboard doctor={doctor} />}
        {activeTab === 'users'      && renderUsers()}
        {activeTab === 'clinics'    && renderClinics()}
        {activeTab === 'links'      && renderLinks()}
      </div>

      {showUserModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className={`p-8 rounded-3xl w-full max-w-md ${darkMode ? 'bg-[#111827] border border-slate-800' : 'bg-white'}`}>
             <h3 className="text-2xl font-bold mb-6">إنشاء حساب ذكي للنظام</h3>
             <form onSubmit={handleCreateUser} className="space-y-4">
                <input required type="text" placeholder="الاسم الرباعي أو الثلاثي" value={userForm.full_name} onChange={e=>setUserForm({...userForm, full_name: e.target.value})} className="w-full bg-slate-800/50 border border-slate-700 p-3 rounded-xl focus:border-indigo-500 outline-none" />
                <input required type="email" placeholder="البريد الإلكتروني للولوج" value={userForm.email} onChange={e=>setUserForm({...userForm, email: e.target.value})} className="w-full bg-slate-800/50 border border-slate-700 p-3 rounded-xl focus:border-indigo-500 outline-none" />
                <input required type="password" placeholder="كلمة المرور (مشفرة ذاتياً)" value={userForm.password} onChange={e=>setUserForm({...userForm, password: e.target.value})} className="w-full bg-slate-800/50 border border-slate-700 p-3 rounded-xl focus:border-indigo-500 outline-none" />
                
                <select value={userForm.role} onChange={e=>setUserForm({...userForm, role: e.target.value})} className="w-full bg-slate-800/50 border border-slate-700 p-3 rounded-xl focus:border-indigo-500 outline-none text-slate-300">
                  <option value="user">دور (فني المركز الطبي) - رفع واستقبال</option>
                  <option value="doctor">دور (الطبيب المعالج المركزي) - كتابة تقارير</option>
                  <option value="clinic_admin">دور (مدير العيادة) - إدارة الطاقم</option>
                  <option value="admin">دور (مدير نظام العصب) - لوحة التحكم الشاملة</option>
                </select>

                <select value={userForm.clinic_id} onChange={e=>setUserForm({...userForm, clinic_id: e.target.value})} className="w-full bg-slate-800/50 border border-slate-700 p-3 rounded-xl focus:border-indigo-500 outline-none text-slate-300">
                  <option value="">-- الفروع المركزية (بدون تحديد عيادة) --</option>
                  {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>

                <div className="flex gap-4 mt-8 pt-4">
                  <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20">منح الصلاحية</button>
                  <button type="button" onClick={()=>setShowUserModal(false)} className="flex-1 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white p-3 rounded-xl font-bold">إلغاء</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {showClinicModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`p-8 rounded-3xl w-full max-w-md ${darkMode ? 'bg-[#111827] border border-slate-800' : 'bg-white'}`}>
             <h3 className="text-2xl font-bold mb-6 text-cyan-400">تسجيل مركز طبي جديد</h3>
             <form onSubmit={handleCreateClinic} className="space-y-4">
                <input required type="text" placeholder="اسم المركز الطبي" value={clinicForm.name} onChange={e=>setClinicForm({...clinicForm, name: e.target.value})} className="w-full bg-slate-800/50 border border-slate-700 p-3 rounded-xl focus:border-cyan-500 outline-none text-white" />
                <input type="text" placeholder="العنوان أو المدينة" value={clinicForm.address} onChange={e=>setClinicForm({...clinicForm, address: e.target.value})} className="w-full bg-slate-800/50 border border-slate-700 p-3 rounded-xl focus:border-cyan-500 outline-none text-white" />
                <input type="text" placeholder="هاتف المركز لسهولة التواصل" value={clinicForm.phone_call} onChange={e=>setClinicForm({...clinicForm, phone_call: e.target.value})} className="w-full bg-slate-800/50 border border-slate-700 p-3 rounded-xl focus:border-cyan-500 outline-none text-white" />
                
                <div className="flex gap-4 mt-8 pt-4">
                  <button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white p-3 rounded-xl font-bold shadow-lg shadow-cyan-500/20">تأسيس العيادة</button>
                  <button type="button" onClick={()=>setShowClinicModal(false)} className="flex-1 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white p-3 rounded-xl font-bold">إلغاء</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
