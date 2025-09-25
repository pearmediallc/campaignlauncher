import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Container, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './components/Login';
import Register from './components/Register';
import CampaignForm from './components/CampaignForm';
import StatusChecker from './components/StatusChecker';
import Navigation from './components/Navigation';
import UserManagement from './pages/UserManagement';
import AuditLogs from './pages/AuditLogs';
import Profile from './pages/Profile';
import FacebookAuth from './components/FacebookAuth';
import FacebookSDKAuth from './components/FacebookSDKAuth';
import FacebookAuthCallback from './pages/FacebookAuthCallback';
import FacebookSDKTest from './pages/FacebookSDKTest';
import ResourcesManagement from './pages/ResourcesManagement';
import Strategy150Container from './components/Strategy150/Strategy150Container';
import CampaignManagement from './components/CampaignManagement/CampaignManagement';

// Configure axios defaults for production
if (process.env.NODE_ENV === 'production') {
  // In production, API calls should be relative to the same domain
  // Empty string means use the same domain with full path from components
  axios.defaults.baseURL = '';
} else {
  // In development, use the environment variable or localhost (without /api suffix)
  axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5002';
}

// Add axios interceptor to automatically include authentication token
axios.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');

    // If token exists, add it to the Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    // Handle request error
    return Promise.reject(error);
  }
);

// Optional: Add response interceptor to handle auth errors globally
axios.interceptors.response.use(
  (response) => {
    // Return successful response as-is
    return response;
  },
  (error) => {
    // If we get a 401, the token might be expired
    if (error.response?.status === 401) {
      // Only redirect to login if we're not already on the login page
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register') {
        // Token is invalid or expired
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

const theme = createTheme({
  palette: {
    primary: {
      main: '#1877f2',
    },
    secondary: {
      main: '#42b883',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <>
                    <Navigation />
                    <Container maxWidth="lg" sx={{ py: 4 }}>
                      <FacebookAuth />
                      <CampaignForm />
                    </Container>
                  </>
                </ProtectedRoute>
              }
            />
            <Route path="/auth/facebook/callback" element={<FacebookAuthCallback />} />
            <Route
              path="/facebook-sdk-test"
              element={
                <ProtectedRoute>
                  <>
                    <Navigation />
                    <FacebookSDKTest />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <>
                    <Navigation />
                    <Container maxWidth="lg" sx={{ py: 4 }}>
                      <CampaignForm />
                    </Container>
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <>
                    <Navigation />
                    <UserManagement />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/audit-logs"
              element={
                <ProtectedRoute>
                  <>
                    <Navigation />
                    <AuditLogs />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <>
                    <Navigation />
                    <Profile />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/resources"
              element={
                <ProtectedRoute>
                  <>
                    <Navigation />
                    <ResourcesManagement />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/strategy-1-50-1"
              element={
                <ProtectedRoute>
                  <>
                    <Navigation />
                    <Strategy150Container />
                  </>
                </ProtectedRoute>
              }
            />
            <Route
              path="/campaign-management"
              element={
                <ProtectedRoute>
                  <>
                    <Navigation />
                    <Container maxWidth="lg" sx={{ py: 4 }}>
                      <CampaignManagement />
                    </Container>
                  </>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
        <ToastContainer
          position="bottom-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;