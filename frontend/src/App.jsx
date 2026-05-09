import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherLiveQuiz from './pages/TeacherLiveQuiz';
import StudentDashboard from './pages/StudentDashboard';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import QuizView from './pages/QuizView';
import ResultsView from './pages/ResultsView';
import TeacherAnalyticsOverview from './pages/TeacherAnalyticsOverview';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Navbar />
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route path="/teacher-dashboard" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/teacher-live/:id" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherLiveQuiz />
              </ProtectedRoute>
            } />

            <Route path="/analytics/:id" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <AnalyticsDashboard />
              </ProtectedRoute>
            } />

            <Route path="/teacher/analytics" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherAnalyticsOverview />
              </ProtectedRoute>
            } />
            
            <Route path="/student-dashboard" element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/quiz/:id" element={
              <ProtectedRoute allowedRoles={['student']}>
                <QuizView />
              </ProtectedRoute>
            } />
            
            <Route path="/results/:id" element={
              <ProtectedRoute allowedRoles={['student']}>
                <ResultsView />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
