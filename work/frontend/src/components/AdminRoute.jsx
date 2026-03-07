
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2 } from 'lucide-react';

const AdminRoute = ({ children }) => {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);

  // Slight delay to ensure isAdmin state has settled if it was pending
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setIsChecking(false), 200);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  if (loading || isChecking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600 mb-4" />
        <p className="text-slate-400 animate-pulse">Verifying privileges...</p>
      </div>
    );
  }

  // Check if user exists and has admin role
  if (!user || !isAdmin) {
    // If user is logged in but not admin, maybe redirect to home or show denied?
    // For now, redirect to admin login to force re-auth if needed, or home if just unauthorized.
    if (user && !isAdmin) {
        console.warn("User attempted admin access without privileges.");
        return <Navigate to="/" replace />;
    }
    
    // Redirect to admin login, preserving the intended destination
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
};

export default AdminRoute;
