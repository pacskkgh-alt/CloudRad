import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import DoctorWorkspace from './pages/DoctorWorkspace';
import TechnicianStation from './pages/TechnicianStation';
import ReceptionPortal from './pages/ReceptionPortal';
import PatientViewPage from './pages/PatientViewPage';
import TeleradWorklist from './pages/TeleradWorklist';
import LandingPage from './pages/LandingPage';

function App() {
  const [doctor, setDoctor] = useState(null);

  useEffect(() => {
    // Check for existing auth on mount
    const savedToken = localStorage.getItem('cloudrad_token');
    const savedDoctor = localStorage.getItem('cloudrad_doctor');
    if (savedToken && savedDoctor) {
      try {
        setDoctor(JSON.parse(savedDoctor));
      } catch {
        localStorage.removeItem('cloudrad_token');
        localStorage.removeItem('cloudrad_doctor');
      }
    }
  }, []);

  const handleLogin = (data) => {
    setDoctor({
      id: data.doctor_id,
      name: data.full_name,
      email: data.email,
      clinic_id: data.clinic_id,
      role: data.role,
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('cloudrad_token');
    localStorage.removeItem('cloudrad_doctor');
    setDoctor(null);
  };

  // Redirect to correct portal based on role
  const getRoleRedirectPath = (role) => {
    switch (role) {
      case 'admin':
      case 'clinic_admin':
        return '/admin';
      case 'doctor':
        return '/doctor/workspace';
      case 'technician':
        return '/tech/upload-station';
      case 'reception':
      case 'user': // Treat 'user' as reception or fallback
        return '/reception/portal';
      default:
        return '/login';
    }
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/view/:token" element={<PatientViewPage />} />
        {/* Support old patient URL just in case */}
        <Route path="/patient/:token" element={<PatientViewPage />} />
        <Route
          path="/login"
          element={
            doctor ? <Navigate to={getRoleRedirectPath(doctor.role)} replace /> : <LoginPage onLogin={handleLogin} />
          }
        />

        {/* Global /app redirect based on role */}
        <Route
          path="/app"
          element={
            doctor ? <Navigate to={getRoleRedirectPath(doctor.role)} replace /> : <Navigate to="/login" replace />
          }
        />

        {/* Protected routes */}
        <Route
          path="/admin"
          element={
            doctor ? (
              (doctor.role === 'admin' || doctor.role === 'clinic_admin') ? <AdminDashboard doctor={doctor} onLogout={handleLogout} /> :
              <Navigate to={getRoleRedirectPath(doctor.role)} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        
        <Route
          path="/doctor/workspace"
          element={
            doctor ? (
              (doctor.role === 'admin' || doctor.role === 'clinic_admin' || doctor.role === 'doctor') ? 
                <DoctorWorkspace doctor={doctor} onLogout={handleLogout} /> :
                <Navigate to={getRoleRedirectPath(doctor.role)} replace />
            ) : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/tech/upload-station"
          element={
            doctor ? (
              (doctor.role === 'admin' || doctor.role === 'doctor' || doctor.role === 'technician') ? 
                <TechnicianStation user={doctor} onLogout={handleLogout} /> :
                <Navigate to={getRoleRedirectPath(doctor.role)} replace />
            ) : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/reception/portal"
          element={
            doctor ? (
              (doctor.role === 'admin' || doctor.role === 'clinic_admin' || doctor.role === 'reception' || doctor.role === 'user') ? 
                <ReceptionPortal user={doctor} onLogout={handleLogout} /> :
                <Navigate to={getRoleRedirectPath(doctor.role)} replace />
            ) : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/telerad"
          element={
            doctor ? <TeleradWorklist doctor={doctor} onLogout={handleLogout} /> : <Navigate to="/login" replace />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
