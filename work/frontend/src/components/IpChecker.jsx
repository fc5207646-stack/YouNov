import React, { useEffect, useState, useRef } from 'react';
import { apiFetch } from '@/lib/apiClient';
import AccessDeniedPage from '@/pages/AccessDeniedPage';
import { Loader2 } from 'lucide-react';

const IpChecker = ({ children }) => {
  const [status, setStatus] = useState('loading'); // 'loading', 'allowed', 'blocked', 'error'
  const [blockDetails, setBlockDetails] = useState(null);
  const checkPerformed = useRef(false);

  useEffect(() => {
    // 1. Check if we already verified this session to avoid redundant API calls
    const sessionStatus = sessionStorage.getItem('ip_security_status');
    if (sessionStatus === 'allowed') {
      setStatus('allowed');
      return;
    } else if (sessionStatus === 'blocked') {
      setStatus('blocked');
      return;
    }

    // 2. Prevent double execution in Strict Mode
    if (checkPerformed.current) return;
    checkPerformed.current = true;

    const verifyIp = async () => {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        setStatus('allowed');
        sessionStorage.setItem('ip_security_status', 'allowed');
        return;
      }
      const timeoutMs = 8000;
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch('/api/ip/check', { signal: controller.signal });
        clearTimeout(id);
        const data = await res.json().catch(() => ({}));
        if (data && data.allowed === false) {
          setBlockDetails(data);
          setStatus('blocked');
          sessionStorage.setItem('ip_security_status', 'blocked');
        } else {
          setStatus('allowed');
          sessionStorage.setItem('ip_security_status', 'allowed');
        }
      } catch (err) {
        console.warn('IP check failed, allowing access:', err?.message || err);
        setStatus('allowed');
        sessionStorage.setItem('ip_security_status', 'allowed');
      }
    };

    verifyIp();
  }, []);

  // Strict Render Gating
  if (status === 'loading') {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-[9999]">
        <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
        <p className="text-slate-400 font-medium tracking-wider animate-pulse">VERIFYING CONNECTION...</p>
      </div>
    );
  }

  if (status === 'blocked') {
    return <AccessDeniedPage details={blockDetails} />;
  }

  // Only render children if explicitly allowed
  return <>{children}</>;
};

export default IpChecker;