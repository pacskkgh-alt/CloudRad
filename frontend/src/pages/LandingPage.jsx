import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Cloud, Zap, ArrowRight, Activity, Users, FileImage } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Cloud className="w-8 h-8 text-blue-500" />,
      title: 'سحابة آمنة 100%',
      description: 'حفظ آمن وموثوق لجميع صور الأشعة (DICOM) وتقارير المرضى في خوادم سحابية محمية.'
    },
    {
      icon: <Zap className="w-8 h-8 text-emerald-500" />,
      title: 'وصول فوري للصور',
      description: 'استعراض سريع للصور الإشعاعية عبر متصفح الويب بدون الحاجة لتحميل أو تثبيت برامج إضافية.'
    },
    {
      icon: <ShieldCheck className="w-8 h-8 text-purple-500" />,
      title: 'صلاحيات متعددة',
      description: 'نظام إدارة صلاحيات متقدم (Super Admin, Clinic Admin, Doctor) يعزل بيانات كل عيادة بخصوصية تامة.'
    },
    {
      icon: <Users className="w-8 h-8 text-indigo-500" />,
      title: 'مشاركة تعاونية',
      description: 'مشاركة الفحوصات والآراء الطبية بسهولة بين الأطباء داخل العيادة للحصول على آراء ثانية (Second Opinion).'
    }
  ];

  const steps = [
    {
      number: '1',
      title: 'رفع الفحص',
      description: 'قم برفع ملفات DICOM بكل سهولة من أي جهاز.'
    },
    {
      number: '2',
      title: 'التحليل والمعاينة',
      description: 'استخدم أدوات المعاينة المتقدمة لتحليل الصور.'
    },
    {
      number: '3',
      title: 'كتابة التقرير',
      description: 'أضف تقريرك الطبي وشاركه فوراً مع مرضاك أو زملائك.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-200">
              <Activity className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">
              CloudRad
            </span>
          </div>
          <div>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg flex items-center gap-2"
            >
              دخول المنصة
              <ArrowRight className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white pb-16 pt-24 sm:pb-24 sm:pt-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-white to-white"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
            منصة الأشعة السحابية
            <br />
            <span className="text-blue-600">الأكثر تطوراً وأماناً</span>
          </h1>
          <p className="mt-4 text-xl text-slate-600 max-w-3xl mx-auto mb-10 leading-relaxed">
            منظومة متكاملة لإدارة عيادات ومراكز الأشعة. حفظ، مشاركة، وتحليل صور DICOM الطبية من أي مكان، وفي أي وقت، مع نظام إدارة أدوار متقدم يضمن خصوصية البيانات.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-4 rounded-xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 flex items-center gap-2"
            >
              ابدأ الآن
              <ArrowRight className="w-5 h-5 rotate-180" />
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">لماذا تختار CloudRad؟</h2>
            <div className="w-24 h-1 bg-blue-600 mx-auto rounded-full"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-slate-100 group">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">كيف تعمل المنصة؟</h2>
            <div className="w-24 h-1 bg-emerald-500 mx-auto rounded-full"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Connection Line */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>
            
            {steps.map((step, index) => (
              <div key={index} className="relative z-10 text-center">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg shadow-blue-200">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                <p className="text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <FileImage className="w-16 h-16 mx-auto mb-6 text-blue-300" />
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">مستعد للارتقاء بعيادتك إلى السحابة؟</h2>
          <p className="text-xl text-blue-100 mb-10">
            انضم الآن وابدأ في إدارة صور مرضاك الطبية بكفاءة وأمان لا مثيل لهما.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-4 rounded-xl bg-white text-blue-900 font-bold text-lg hover:bg-slate-50 transition-colors shadow-lg"
          >
            تسجيل الدخول للمنصة
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <Activity className="w-6 h-6 text-blue-500" />
            <span className="text-xl font-bold text-white">CloudRad</span>
          </div>
          <p>© {new Date().getFullYear()} CloudRad Platform. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
