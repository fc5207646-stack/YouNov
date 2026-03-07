
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from '@/components/ui/use-toast';
import { apiFetch } from '@/lib/apiClient';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const refreshMe = useCallback(async () => {
    try {
      const data = await apiFetch('/me', { timeout: 8000 });
      setUser(data.user || null);
      setIsAdmin(data.user?.role === 'ADMIN');
    } catch (_e) {
      setUser(null);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
    const t = setTimeout(() => setLoading(false), 10000);
    return () => clearTimeout(t);
  }, [refreshMe]);

  const signUp = useCallback(async (email, password, options) => {
    try {
      const payload = {
        email,
        password,
        displayName: options?.data?.displayName || options?.data?.display_name || options?.data?.name || 'User',
        username: options?.data?.username,
        referralCode: options?.data?.referralCode || options?.data?.referral_code
      };
      const data = await apiFetch('/auth/register', { method: 'POST', body: payload });
      // register 会自动登录（cookie），同步本地态
      setUser(data.user || null);
      setIsAdmin(data.user?.role === 'ADMIN');
      return { data, error: null };
    } catch (error) {
      console.error("Sign up error:", error);
      return { data: null, error };
    }
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    try {
      const data = await apiFetch('/auth/login', { method: 'POST', body: { email, password } });
      setUser(data.user || null);
      setIsAdmin(data.user?.role === 'ADMIN');
      return { data, error: null };
    } catch (error) {
      console.error("Sign in error:", error);
      return { data: null, error };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
      
      setUser(null);
      setIsAdmin(false);
      
      toast({ 
        title: "Signed out", 
        description: "See you next time!",
      });
      return { error: null };
    } catch (error) {
      console.error("Sign out error:", error);
      toast({
        variant: "destructive",
        title: "Sign out error",
        description: "Failed to sign out properly.",
      });
      return { error };
    }
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    isAdmin,
    signUp,
    signIn,
    signOut,
    refreshMe,
  }), [user, loading, isAdmin, signUp, signIn, signOut, refreshMe]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
