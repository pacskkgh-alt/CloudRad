import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getApiUrl, getAuthHeaders } from '../api';
import { Users, X, Plus, Trash2, Edit2, Shield, User } from 'lucide-react';

const API_URL = getApiUrl();

export default function ClinicManagementModal({ onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'doctor'
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/clinic/users`, { headers: getAuthHeaders() });
      setUsers(res.data);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء جلب قائمة المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/clinic/users`, formData, { headers: getAuthHeaders() });
      setFormData({ full_name: '', email: '', password: '', role: 'doctor' });
      setShowAddForm(false);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'حدث خطأ أثناء إضافة المستخدم');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم نهائياً؟')) return;
    try {
      await axios.delete(`${API_URL}/api/clinic/users/${id}`, { headers: getAuthHeaders() });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'حدث خطأ أثناء الحذف');
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await axios.put(`${API_URL}/api/clinic/users/${id}/toggle`, {}, { headers: getAuthHeaders() });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'حدث خطأ أثناء تغيير حالة المستخدم');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-slate-800 p-8 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto text-white" dir="rtl">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold">إدارة عيادتي (طاقم العمل)</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {!showAddForm ? (
          <div className="mb-6">
            <button 
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition-all font-bold shadow-lg shadow-indigo-500/20"
            >
              <Plus className="w-5 h-5" /> إضافة موظف / طبيب جديد
            </button>
          </div>
        ) : (
          <div className="bg-slate-800/30 border border-slate-700 p-6 rounded-2xl mb-8">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><User className="w-5 h-5 text-indigo-400"/> بيانات المستخدم الجديد</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required type="text" placeholder="الاسم الكامل" value={formData.full_name} onChange={e=>setFormData({...formData, full_name: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-xl focus:border-indigo-500 outline-none" />
                <input required type="email" placeholder="البريد الإلكتروني" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-xl focus:border-indigo-500 outline-none" />
                <input required type="password" placeholder="كلمة المرور" value={formData.password} onChange={e=>setFormData({...formData, password: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-xl focus:border-indigo-500 outline-none" />
                
                <select value={formData.role} onChange={e=>setFormData({...formData, role: e.target.value})} className="w-full bg-slate-900/50 border border-slate-700 p-3 rounded-xl focus:border-indigo-500 outline-none text-slate-300">
                  <option value="doctor">طبيب (معالج / قارئ)</option>
                  <option value="user">فني (رفع وتصوير فقط)</option>
                  <option value="clinic_admin">مدير عيادة مساعد</option>
                </select>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-xl font-bold">حفظ المستخدم</button>
                <button type="button" onClick={() => setShowAddForm(false)} className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-xl font-bold">إلغاء</button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-slate-400">جاري تحميل البيانات...</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-right">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="p-4 font-semibold text-slate-400">الاسم</th>
                  <th className="p-4 font-semibold text-slate-400">البريد الإلكتروني</th>
                  <th className="p-4 font-semibold text-slate-400">الصلاحية</th>
                  <th className="p-4 font-semibold text-slate-400">الحالة</th>
                  <th className="p-4 font-semibold text-slate-400 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                    <td className="p-4 font-medium">{u.full_name}</td>
                    <td className="p-4 text-slate-400">{u.email}</td>
                    <td className="p-4">
                      {u.role === 'clinic_admin' ? <span className="text-purple-400 font-bold bg-purple-500/10 px-3 py-1 rounded-full text-sm">مدير عيادة</span> :
                       u.role === 'doctor' ? <span className="text-cyan-400 font-bold bg-cyan-500/10 px-3 py-1 rounded-full text-sm">طبيب</span> :
                       <span className="text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-full text-sm">فني</span>}
                    </td>
                    <td className="p-4">
                      <button onClick={() => handleToggleStatus(u.id)} className={`px-3 py-1 rounded-full text-sm font-bold border transition-colors ${u.is_active ? 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>
                        {u.is_active ? 'نشط' : 'معطل'}
                      </button>
                    </td>
                    <td className="p-4 text-left">
                      <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors" title="حذف">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-500">لا يوجد مستخدمين آخرين في العيادة</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
