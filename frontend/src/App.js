import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import '@/App.css';
import Login from './pages/Login';
import NGODashboard from './pages/NGODashboard';
import DonorDashboard from './pages/DonorDashboard';
import VolunteerDashboard from './pages/VolunteerDashboard';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { Toaster } from 'sonner';
import { io } from 'socket.io-client';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
let socket = null;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
      
      if (!socket) {
        socket = io(BACKEND_URL, {
          transports: ['websocket', 'polling']
        });
        
        socket.on('connect', () => {
          console.log('WebSocket connected');
        });
        
        socket.on('request_status_changed', (data) => {
          window.dispatchEvent(new CustomEvent('request_status_changed', { detail: data }));
        });
        
        socket.on('new_request', (data) => {
          window.dispatchEvent(new CustomEvent('new_request', { detail: data }));
        });
        
        socket.on('verification_updated', (data) => {
          window.dispatchEvent(new CustomEvent('verification_updated', { detail: data }));
        });
      }
    }
    setLoading(false);
    
    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, []);

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F7F2]">
        <div className="animate-pulse text-[#1A4D2E] text-xl font-heading">Loading SmartPlate...</div>
      </div>
    );
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to={`/${user.role}`} />} />
          <Route path="/ngo" element={user && user.role === 'ngo' ? <NGODashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
          <Route path="/donor" element={user && user.role === 'donor' ? <DonorDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
          <Route path="/volunteer" element={user && user.role === 'volunteer' ? <VolunteerDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
          <Route path="/admin" element={user && user.role === 'admin' ? <AdminDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
          <Route path="/analytics" element={user ? <AnalyticsDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} />
          <Route path="/" element={<Navigate to={user ? `/${user.role}` : '/login'} />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;