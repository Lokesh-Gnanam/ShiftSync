import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import SeniorDashboard from './pages/SeniorDashboard';
import JuniorDashboard from './pages/JuniorDashboard';
import SignUp from './pages/SignUp';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';

import './App.css';

const PUBLIC_ROUTES = ['/', '/about', '/contact', '/login', '/signup'];

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  const userRole = user.role?.toLowerCase();
  
  if (allowedRoles && !allowedRoles.map(r => r.toLowerCase()).includes(userRole)) {
    if (userRole === 'admin') return <Navigate to="/admin" replace />;
    if (userRole === 'senior') return <Navigate to="/senior" replace />;
    if (userRole === 'junior') return <Navigate to="/junior" replace />;
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function AppContent() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Redirect authenticated users away from public homepage
  if (user && location.pathname === '/') {
    const rolePath = `/${user.role?.toLowerCase() || 'junior'}`;
    return <Navigate to={rolePath} replace />;
  }

  return (
    <div className="app-container">
      {/* Universal Navbar - hides on login/signup automatically */}
      <Navbar />

      <main className="main-content">
        <Routes>
          {/* PUBLIC ROUTES */}
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          
          {/* PROTECTED ROUTES */}
          <Route 
            path="/admin/*" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/senior/*" 
            element={
              <ProtectedRoute allowedRoles={['senior']}>
                <SeniorDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route 
            path="/junior/*" 
            element={
              <ProtectedRoute allowedRoles={['junior']}>
                <JuniorDashboard />
              </ProtectedRoute>
            } 
          />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const { user, loading } = useAuth();
  console.log('[App State] User:', user?.username, '| Loading:', loading);
  return <AppContent />;
}

export default App;
