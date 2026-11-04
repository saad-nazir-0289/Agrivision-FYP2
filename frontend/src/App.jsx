import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import FarmerLayout from './components/FarmerLayout';
import ComingSoon from './pages/ComingSoon';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Admin from './pages/Admin';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/admin" element={<ProtectedRoute role="admin"><Admin /></ProtectedRoute>} />
      {/* Farmer pages share one layout: top bar on top, the current page below it. */}
      <Route element={<ProtectedRoute role="farmer"><FarmerLayout /></ProtectedRoute>}>
        <Route path="/" element={<ComingSoon title="Dashboard" />} />
        <Route path="/ndvi-map" element={<ComingSoon title="NDVI Map" />} />
        <Route path="/alerts" element={<ComingSoon title="Alerts" />} />
        <Route path="/trends" element={<ComingSoon title="Trends" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}