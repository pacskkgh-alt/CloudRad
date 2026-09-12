import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, Shield, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../api';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const API_URL = getApiUrl();
          
      const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
      
      localStorage.setItem('cloudrad_token', res.data.access_token);
      localStorage.setItem('cloudrad_doctor', JSON.stringify({
        id: res.data.doctor_id,
        name: res.data.full_name,
        email: res.data.email,
        clinic_id: res.data.clinic_id,
        role: res.data.role,
      }));
      
      onLogin(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      } else {
        setError('خطأ في الاتصال بالخادم.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => alert("Google Workspace Auth not yet configured.");
  const handleForgotPassword = () => alert("Password recovery coming soon!");
  const handleRegister = () => alert("Registration coming soon!");

  return (
    <div dir="rtl" className="min-h-screen bg-[#020813] text-slate-200 font-sans selection:bg-emerald-500/30 overflow-x-hidden flex items-center justify-center p-4">
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-emerald-900/20 rounded-full blur-[120px] mix-blend-screen opacity-50 animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-teal-900/20 rounded-full blur-[100px] mix-blend-screen opacity-40"></div>
        <div className="absolute top-[40%] left-[20%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[150px] mix-blend-screen opacity-30"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
      </div>

      <div className="w-full max-w-[420px] bg-white rounded-[2rem] shadow-2xl relative overflow-hidden z-10 animate-in fade-in zoom-in duration-200 mt-12">
        
        {/* Header pattern */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-emerald-500 to-teal-600"></div>
        
        <button 
          onClick={() => navigate('/')}
          className="absolute top-4 right-4 w-8 h-8 bg-black/20 hover:bg-black/30 text-white rounded-full flex items-center justify-center transition-colors z-20"
        >
          <ArrowRight size={18} />
        </button>

        <div className="relative z-10 px-8 pt-16 pb-8 text-center text-gray-900">
          <div className="w-20 h-20 bg-white rounded-2xl shadow-xl mx-auto flex items-center justify-center border-4 border-white -mt-10 mb-4">
            <div className="w-full h-full bg-teal-500 rounded-xl flex items-center justify-center">
              <span className="text-4xl font-black text-white italic leading-none">M</span>
            </div>
          </div>
          <h3 className="text-2xl font-bold">مرحباً بك مجدداً</h3>
          <p className="text-gray-500 text-sm mt-1">قم بتسجيل الدخول للوصول إلى العيادة</p>
        </div>

        <div className="px-8 pb-8" dir="rtl">
          {error && (
            <div className="mb-6 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-bold text-center flex items-center justify-center gap-2">
              <Shield size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@clinic.com"
                required
                className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="relative">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3.5 pl-12 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center text-[12px] font-bold pt-2">
              <button type="button" onClick={handleForgotPassword} className="text-emerald-600 hover:text-emerald-700">نسيت كلمة المرور؟</button>
              <button type="button" onClick={handleRegister} className="text-gray-500 hover:text-gray-900">طلب حساب جديد</button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center gap-2 mt-4"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">أو</span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="mt-6 w-full flex items-center justify-center gap-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-3.5 rounded-xl transition-all shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            المتابعة باستخدام Google
          </button>

        </div>
      </div>
    </div>
  );
}
