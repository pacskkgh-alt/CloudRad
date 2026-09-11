import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { useParams } from 'react-router-dom';
import { DownloadCloud, ShieldAlert, FileText, Image as ImageIcon, ChevronLeft, ChevronRight, ExternalLink, Stethoscope } from 'lucide-react';
import axios from 'axios';
import { getApiUrl, getPacsUrl } from '../api';
import SecondOpinionModal from '../components/SecondOpinionModal';

const API_URL = getApiUrl();
const PACS_URL = getPacsUrl();

export default function PatientViewPage() {
  const { token } = useParams();
  const [studyInfo, setStudyInfo] = useState(null);
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null);
  const [passcode, setPasscode] = useState('');
  const [showSecondOpinionModal, setShowSecondOpinionModal] = useState(false);

  useEffect(() => {
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      // Re-using the same verify endpoint
      const res = await axios.post(`${API_URL}/api/links/${token}/verify`, { passcode: null });
      if (res.data.requires_passcode) {
        // Fallback for simplicity if a passcode was set, though simplified for this spec
        setErrorStatus('REQUIRES_PASSCODE');
        setLoading(false);
        return;
      }
      setStudyInfo(res.data);

      try {
        const reportRes = await axios.get(`${API_URL}/api/reports/${res.data.study_id}?share_token=${token}`);
        setReport(reportRes.data.report_content || '');
      } catch {
        setReport('<p>No diagnostic report is available for this study yet. Please check back later.</p>');
      }
      setLoading(false);
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 404) {
        setErrorStatus('EXPIRED');
      } else {
        setErrorStatus('ERROR');
      }
      setLoading(false);
    }
  };

  const submitPasscode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorStatus(null);
    try {
      const res = await axios.post(`${API_URL}/api/links/${token}/verify`, { passcode: passcode.trim() });
      // If still requires passcode, it means it's incorrect (401 handled by catch)
      setStudyInfo(res.data);
      try {
        const reportRes = await axios.get(`${API_URL}/api/reports/${res.data.study_id}?share_token=${token}`);
        setReport(reportRes.data.report_content || '');
      } catch {
        setReport('<p>No diagnostic report is available for this study yet. Please check back later.</p>');
      }
      setLoading(false);
    } catch (err) {
      setErrorStatus('REQUIRES_PASSCODE');
      alert(err.response?.data?.detail || "Incorrect passcode");
      setLoading(false);
    }
  };

  // Simplified PDF Download handler
  const handleDownload = () => window.print();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-blue-500 font-semibold animate-pulse text-lg">Securely retrieving medical records...</div>
      </div>
    );
  }

  // Security Trigger Screen
  if (errorStatus === 'EXPIRED') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center border border-gray-100">
          <div className="mx-auto w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6">
             <ShieldAlert size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-500 font-medium">This secure link has expired for patient privacy. Please contact your healthcare provider to generate a new link.</p>
        </div>
      </div>
    );
  }

  // Passcode Gate Screen
  if (errorStatus === 'REQUIRES_PASSCODE') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center border border-gray-100">
          <div className="mx-auto w-16 h-16 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mb-6">
             <ShieldAlert size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Restricted Access</h2>
          <p className="text-gray-500 font-medium mb-6">This patient medical record requires a passcode to proceed.</p>
          <form onSubmit={submitPasscode} className="space-y-4">
             <input type="password" value={passcode} onChange={e=>setPasscode(e.target.value)} required placeholder="Enter Passcode..." className="w-full border-gray-200 bg-gray-50 text-gray-900 rounded-xl p-3 border focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-semibold" />
             <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-md transition-colors">Decrypt & Open Case</button>
          </form>
        </div>
      </div>
    );
  }

  if (errorStatus) {
    return <div className="min-h-screen bg-gray-50 p-10 text-center text-red-500 font-bold">Failed to load payload.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* 1. Header & Branding */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-blue-600 tracking-tight">CloudRad Medical</h1>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Secure View Portal</p>
          </div>
          <div className="flex items-center gap-4 bg-blue-50 px-5 py-2 rounded-xl border border-blue-100 shadow-inner">
            <div className="flex flex-col text-right sm:text-left">
              <span className="text-sm font-bold text-gray-800">{studyInfo?.patient_name}</span>
              <span className="text-xs text-gray-500 font-medium">ID: {studyInfo?.patient_id_number}</span>
            </div>
            <div className="h-8 w-px bg-blue-200"></div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">Modality</span>
              <span className="text-lg font-black text-blue-700 leading-tight">{studyInfo?.modality}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 flex flex-col gap-8">
        
        {/* 2. Top Section: Diagnostic Report */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row">
          <div className="p-6 md:p-8 flex-1 flex flex-col">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-100 pb-4">
              <FileText className="text-blue-500" size={20}/> Diagnostic Report
            </h2>
            <div 
              className="flex-1 prose prose-sm text-gray-700 mb-6"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(report) }}
            />
            <div className="mt-auto flex flex-wrap items-center gap-3">
              <button 
                onClick={handleDownload}
                className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-colors text-sm"
              >
                <DownloadCloud size={17} /> Download PDF Report
              </button>
              <button
                onClick={() => setShowSecondOpinionModal(true)}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-colors text-sm"
              >
                <Stethoscope size={17} /> طلب رأي طبي ثانٍ (Second Opinion)
              </button>
            </div>
          </div>
          
          {/* Desktop Only: Advanced WebPACS Viewer */}
          <div className="hidden md:flex bg-gray-900 p-8 flex-col items-center justify-center text-center w-72 text-white border-l border-gray-800">
            <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mb-4">
               <ImageIcon size={32} />
            </div>
            <h3 className="text-lg font-bold mb-2">High-Res Imaging</h3>
            <p className="text-sm text-gray-400 mb-6">Access the full diagnostic quality imagery via OHIF viewer.</p>
            <a 
              href={studyInfo?.study_instance_uid ? `${PACS_URL}/ohif/viewer?url=/dicom-web/studies/${studyInfo.study_instance_uid}` : (studyInfo?.orthanc_study_uuid ? `${PACS_URL}/osimis-viewer/app/index.html?study=${studyInfo.orthanc_study_uuid}` : '#')}
              target="_blank" 
 
              rel="noopener"
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-lg font-bold shadow-lg transition-colors border border-blue-400"
            >
              Open WebPACS <ExternalLink size={16} />
            </a>
          </div>
        </section>

        {/* 3. Bottom Section: Mobile Responsive Image Carousel */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
               <ImageIcon className="text-blue-500" size={20}/> Key Snapshots
             </h2>
             {/* Show WebPACS link strictly on mobile to compensate for no right-panel */}
             <a 
                href={studyInfo?.orthanc_study_uuid ? `${PACS_URL}/osimis-viewer/app/index.html?study=${studyInfo.orthanc_study_uuid}` : '#'}

                target="_blank" 
                rel="noopener"
                className="md:hidden flex items-center justify-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full"
             >
               Open OHIF <ExternalLink size={12} />
             </a>
          </div>

          <div className="relative group">
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
              {/* Real Orthanc Previews */}
              {studyInfo?.instances?.slice(0, 6).map((instanceId, idx) => (
                <div key={instanceId} className="snap-center shrink-0 w-64 h-64 bg-black rounded-xl overflow-hidden relative shadow-md border-2 border-transparent hover:border-blue-500 transition-colors cursor-pointer flex items-center justify-center">
                  <img src={`${PACS_URL}/instances/${instanceId}/preview`} alt="DICOM Frame" className="w-full h-full object-contain" />
                  <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded text-xs font-bold font-mono">IMG {idx + 1}/{Math.min(6, studyInfo.instances.length)}</div>
                </div>
              ))}
              {(!studyInfo?.instances || studyInfo.instances.length === 0) && (
                <div className="snap-center shrink-0 w-64 h-64 bg-gray-900 rounded-xl overflow-hidden relative shadow-md text-gray-600 font-bold flex flex-col items-center justify-center text-sm border border-gray-800">
                  <ImageIcon size={32} className="mb-2 opacity-30" />
                  No visual previews available
                </div>
              )}
            </div>
            
            {/* Desktop Carousel Controls */}
            <button className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -ml-5 bg-white shadow-lg p-2 rounded-full text-gray-600 hover:text-blue-600 transition-colors border border-gray-100 z-10"><ChevronLeft size={24}/></button>
            <button className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 -mr-5 bg-white shadow-lg p-2 rounded-full text-gray-600 hover:text-blue-600 transition-colors border border-gray-100 z-10"><ChevronRight size={24}/></button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2 md:hidden">Swipe to interact with frames</p>
        </section>

      </main>
      
      {/* Required scoped printable CSS to hide heavy UI during PDF Print */}
      <style>{`
        @media print {
          body { background-color: white !important; }
          header, section:nth-of-type(2), button, .hidden.md\\:flex { display: none !important; }
          main { p: 0 !important; m: 0 !important; width: 100% !important; max-width: 100% !important; }
          .shadow-sm, .shadow-md, .shadow-lg, .border { box-shadow: none !important; border: none !important; }
        }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Second Opinion Modal */}
      <SecondOpinionModal
        isOpen={showSecondOpinionModal}
        onClose={() => setShowSecondOpinionModal(false)}
        studyId={studyInfo?.study_id}
        studyModality={studyInfo?.modality}
        patientName={studyInfo?.patient_name}
      />
    </div>
  );
}
