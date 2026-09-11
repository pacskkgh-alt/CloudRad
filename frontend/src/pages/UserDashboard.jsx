import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { getApiUrl, getAuthHeaders, getModalityColor } from '../api';
import { 
  Share2, ShieldAlert, Check, Copy, Link as LinkIcon, 
  UploadCloud, Clock, Search, Menu, Users, LogOut, UserCog
} from 'lucide-react';
import UploadTypeModal from '../components/UploadTypeModal';
import ClinicManagementModal from '../components/ClinicManagementModal';

const API_URL = getApiUrl();

/**
 * UserDashboard Component
 * 
 * Provides standard user/doctor workflow:
 * - Study listing & filtering
 * - Uploading DICOM studies
 * - Generating secure share links with optional anonymization
 */
export default function UserDashboard({ doctor, onLogout }) {
  const [studies, setStudies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedStudy, setSelectedStudy] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);

  // Link generation state
  const [expiryDays, setExpiryDays] = useState(7);
  const [passcode, setPasscode] = useState('');
  const [isAnonymize, setIsAnonymize] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareToken, setShareToken] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showClinicAdmin, setShowClinicAdmin] = useState(false);

  // Fetch studies
  const fetchStudies = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/api/studies`, {
        headers: getAuthHeaders(),
      });
      setStudies(res.data);
    } catch (err) {
      console.error('Failed to load studies:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudies();
  }, [fetchStudies]);

  // Generate share link with isAnonymize in the dependency array to prevent stale closure bugs
  const handleGenerateShareLink = useCallback(async () => {
    if (!selectedStudy?.id) return;
    setIsGenerating(true);
    try {
      const payload = {
        study_id: selectedStudy.id,
        duration_days: expiryDays > 0 ? expiryDays : null,
        passcode: passcode ? passcode.trim() : null,
        allows_download: true,
        is_anonymized: isAnonymize,
      };

      const res = await axios.post(`${API_URL}/api/links/`, payload, {
        headers: getAuthHeaders(),
      });
      setShareToken(res.data.token);
    } catch (err) {
      console.error('Failed to generate share link:', err);
      alert('فشل إنشاء رابط المشاركة. تأكد من صحة الصلاحيات.');
    } finally {
      setIsGenerating(false);
    }
  }, [selectedStudy, expiryDays, passcode, isAnonymize]);

  const handleCopyLink = () => {
    if (!shareToken) return;
    const url = `${window.location.origin}/view/${shareToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredStudies = studies.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (s.patient_name || '').toLowerCase().includes(q) ||
      (s.patient_id_number || '').toLowerCase().includes(q) ||
      (s.modality || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 flex">
      {/* Sidebar */}
      <aside className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 flex-shrink-0">
        <button onClick={fetchStudies} className="text-gray-500 hover:text-emerald-600 mb-8" title="Refresh Studies">
          <Menu size={24} />
        </button>
        <div className="flex-1 flex flex-col items-center gap-4">
          <button onClick={fetchStudies} className="text-emerald-500 bg-emerald-50 p-2 rounded-lg hover:bg-emerald-100 transition-colors" title="Reload Studies">
            <Users size={20} />
          </button>
          
          {doctor?.role === 'clinic_admin' && (
            <button onClick={() => setShowClinicAdmin(true)} className="text-purple-500 bg-purple-50 p-2 rounded-lg hover:bg-purple-100 transition-colors" title="إدارة العيادة">
              <UserCog size={20} />
            </button>
          )}
        </div>
        {onLogout && (
          <button onClick={onLogout} className="text-gray-400 hover:text-red-500 p-2" title="Logout">
            <LogOut size={20} />
          </button>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Dashboard</h1>
              <p className="text-sm text-gray-500">Welcome, {doctor?.name || 'User'}</p>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 font-medium shadow-sm transition-all"
            >
              <UploadCloud size={18} />
              Upload Study
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient name, ID, or modality..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Studies Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Loading studies...</div>
            ) : filteredStudies.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No studies found.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-semibold uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3">Patient</th>
                    <th className="px-6 py-3">Modality</th>
                    <th className="px-6 py-3">Instances</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStudies.map((study) => (
                    <tr key={study.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{study.patient_name || 'Unknown'}</div>
                        <div className="text-xs text-gray-400">ID: {study.patient_id_number || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getModalityColor(study.modality)}`}>
                          {study.modality}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{study.instances_count || 0}</td>
                      <td className="px-6 py-4 text-gray-500 text-xs">{study.study_date || study.created_at || '—'}</td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-4">
                        <button
                          onClick={() => {
                            if (study.orthanc_study_uuid) {
                              const pacsUrl = API_URL.replace('api.', 'pacs.');
                              window.open(`${pacsUrl}/osimis-viewer/app/index.html?study=${study.orthanc_study_uuid}`, '_blank');
                            } else if (study.study_instance_uid) {
                              const pacsUrl = API_URL.replace('api.', 'pacs.');
                              window.open(`${pacsUrl}/ohif/viewer?url=/dicom-web/studies/${study.study_instance_uid}`, '_blank');
                            } else {
                              alert('لا يمكن عرض الدراسة: المعرّف غير متوفر حالياً.');
                            }
                          }}
                          className="text-emerald-600 hover:text-emerald-800 font-medium text-xs flex items-center gap-1.5"
                          title="View Images"
                        >
                          <Search size={14} /> عرض
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStudy(study);
                            setShareToken(null);
                            setIsAnonymize(false);
                            setShowShareModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium text-xs flex items-center gap-1.5"
                          title="Share Link"
                        >
                          <Share2 size={14} /> مشاركة
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Share Modal */}
      {showShareModal && selectedStudy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-gray-200 p-6 rounded-2xl shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Share2 size={18} className="text-blue-500" /> Share Study
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-gray-600 w-8 h-8 rounded-full flex items-center justify-center"
              >
                &times;
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
              <span className="font-semibold text-gray-800">{selectedStudy.patient_name}</span>
              <span className="text-gray-400 text-xs ml-2">({selectedStudy.modality})</span>
            </div>

            {!shareToken ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Expiry Duration</label>
                  <select
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(Number(e.target.value))}
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value={7}>7 Days</option>
                    <option value={14}>14 Days</option>
                    <option value={30}>30 Days</option>
                    <option value={0}>Unlimited</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Passcode (Optional)</label>
                  <input
                    type="text"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter security passcode..."
                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Anonymize Toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <label htmlFor="user_dashboard_anon" className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="user_dashboard_anon"
                      checked={isAnonymize}
                      onChange={(e) => setIsAnonymize(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-gray-700">Anonymize Patient Identity (إخفاء الهوية)</span>
                  </label>
                  <span className="text-[10px] text-gray-400">Hide patient name & ID</span>
                </div>

                <button
                  onClick={handleGenerateShareLink}
                  disabled={isGenerating}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold p-3 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  {isGenerating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <LinkIcon size={16} />}
                  Generate Link
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <p className="text-xs text-gray-500">Share this link with consulting doctors or patients:</p>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono text-gray-700 break-all">
                  {`${window.location.origin}/view/${shareToken}`}
                </div>
                <button
                  onClick={handleCopyLink}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied to Clipboard!' : 'Copy Link'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <UploadTypeModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={() => {
          fetchStudies();
          setShowUploadModal(false);
        }}
      />
      
      {showClinicAdmin && (
        <ClinicManagementModal onClose={() => setShowClinicAdmin(false)} />
      )}
    </div>
  );
}
