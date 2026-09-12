import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Cloud, Shield, Share2, Activity, CheckCircle2, Users, ArrowLeft } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div dir="rtl" className="min-h-screen bg-[#020813] text-slate-200 font-sans selection:bg-emerald-500/30 overflow-x-hidden">
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[800px] h-[800px] bg-emerald-900/20 rounded-full blur-[120px] mix-blend-screen opacity-50 animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-teal-900/20 rounded-full blur-[100px] mix-blend-screen opacity-40"></div>
        <div className="absolute top-[40%] left-[20%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[150px] mix-blend-screen opacity-30"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
      </div>

      {/* Navbar */}
      <nav className="relative z-10 border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-2xl font-black text-white italic">M</span>
            </div>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-200 tracking-wide">
              CloudRad
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 font-semibold text-slate-300">
            <a href="#features" className="hover:text-emerald-400 transition-colors">المميزات</a>
            <a href="#how-it-works" className="hover:text-emerald-400 transition-colors">آلية العمل</a>
            <a href="#security" className="hover:text-emerald-400 transition-colors">الأمان</a>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            دخول المنصة
            <ArrowLeft size={16} />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-sm mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            الجيل الجديد من أنظمة الأرشفة الطبية PACS
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-[1.2] tracking-tight">
            إدارة صور الأشعة بذكاء <br/>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
              أسرع، أكثر أماناً، ومن أي مكان.
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            منصة CloudRad توفر حلولاً متكاملة للعيادات والمراكز الطبية لأرشفة صور الأشعة ومشاركتها مع الاستشاريين وإدارة الأطباء بسهولة عبر نظام سحابي متطور.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <button 
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-[#020813] font-bold text-lg shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)] transition-all hover:-translate-y-1"
            >
              ابدأ الآن - دخول النظام
            </button>
            <a href="#features" className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700 text-white font-bold text-lg transition-all hover:-translate-y-1">
              استكشف المميزات
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-24 px-6 bg-slate-900/20 border-y border-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white">مميزات استثنائية لعيادتك</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">كل ما تحتاجه لإدارة قسم الأشعة والتيليراديولوجي في مكان واحد بأعلى معايير الجودة.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<Cloud className="w-8 h-8 text-cyan-400" />}
              title="تخزين سحابي فائق"
              desc="رفع وتخزين ملفات DICOM الطبية بسرعة فائقة مع ضغط ذكي لا يؤثر على جودة الصور التشخيصية."
            />
            <FeatureCard 
              icon={<Share2 className="w-8 h-8 text-emerald-400" />}
              title="مشاركة سلسة وآمنة"
              desc="شارك الفحوصات مع الأطباء الاستشاريين أو المرضى بروابط آمنة مشفرة ومؤقتة بضغطة زر واحدة."
            />
            <FeatureCard 
              icon={<Users className="w-8 h-8 text-purple-400" />}
              title="إدارة العيادات"
              desc="نظام Multi-tenant متقدم يتيح لكل عيادة إدارة طاقمها الطبي وحالاتها بخصوصية تامة واستقلالية كاملة."
            />
            <FeatureCard 
              icon={<Shield className="w-8 h-8 text-rose-400" />}
              title="تشفير وحماية الخصوصية"
              desc="يتم إخفاء بيانات المريض (Anonymization) وتشفير النقل بالكامل للحفاظ على سرية البيانات."
            />
            <FeatureCard 
              icon={<Activity className="w-8 h-8 text-amber-400" />}
              title="التشخيص عن بعد"
              desc="صندوق وارد مخصص للاستشارات لتمكين الأطباء من إعطاء رأي طبي ثانٍ للحالات المحولة إليهم بسرعة."
            />
            <FeatureCard 
              icon={<CheckCircle2 className="w-8 h-8 text-teal-400" />}
              title="توافق شامل"
              desc="استعراض الصور الطبية من أي متصفح بفضل عارض OHIF المدمج دون الحاجة لتنصيب أي برامج."
            />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="relative z-10 py-24 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white">كيف يعمل CloudRad؟</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Connecting line for desktop */}
            <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-slate-800 via-emerald-500/50 to-slate-800 -z-10"></div>
            
            <div className="space-y-6 flex flex-col items-center">
              <div className="w-24 h-24 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-xl relative group">
                <div className="absolute inset-0 bg-cyan-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <Cloud className="w-10 h-10 text-cyan-400" />
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-white">1</div>
              </div>
              <h3 className="text-xl font-bold text-white">الرفع الآمن</h3>
              <p className="text-slate-400 text-sm">ارفع مجلدات DICOM مباشرة من المتصفح بدون أي أدوات إضافية.</p>
            </div>

            <div className="space-y-6 flex flex-col items-center">
              <div className="w-24 h-24 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-xl relative group">
                <div className="absolute inset-0 bg-emerald-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <Share2 className="w-10 h-10 text-emerald-400" />
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-white">2</div>
              </div>
              <h3 className="text-xl font-bold text-white">المشاركة والتوزيع</h3>
              <p className="text-slate-400 text-sm">توليد روابط مشاركة مؤقتة للمرضى، أو إحالة الحالات للأطباء الاستشاريين.</p>
            </div>

            <div className="space-y-6 flex flex-col items-center">
              <div className="w-24 h-24 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center shadow-xl relative group">
                <div className="absolute inset-0 bg-teal-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <Activity className="w-10 h-10 text-teal-400" />
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-white">3</div>
              </div>
              <h3 className="text-xl font-bold text-white">التشخيص الفوري</h3>
              <p className="text-slate-400 text-sm">فتح الصور التشخيصية بأدوات احترافية من أي جهاز وإرسال التقرير الطبي.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800 bg-slate-900/50 py-12 px-6 text-center text-slate-500">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
            <span className="text-sm font-black text-white italic">M</span>
          </div>
          <span className="text-xl font-bold text-slate-300">CloudRad</span>
        </div>
        <p className="mb-4">© 2026 جميع الحقوق محفوظة لمنصة CloudRad</p>
        <p className="text-xs">المنصة الطبية السحابية المتكاملة لخدمات الأشعة</p>
      </footer>

    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="p-8 rounded-3xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-900/10 group backdrop-blur-sm">
      <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-700 mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}
