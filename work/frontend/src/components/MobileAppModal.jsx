
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Smartphone, Apple, Play } from 'lucide-react';

const MobileAppModal = ({ isOpen, onClose }) => {
  const androidUrl = import.meta.env.VITE_MOBILE_APP_DOWNLOAD_URL || "/app-release.apk";
  const iosUrl = import.meta.env.VITE_IOS_APP_DOWNLOAD_URL || "#";
  
  // Helper to ensure full URL for QR code
  const getFullUrl = (url) => url.startsWith('http') ? url : `${window.location.origin}${url}`;
  
  // Default to Android
  const [activePlatform, setActivePlatform] = useState('android'); 
  const currentUrl = activePlatform === 'android' ? getFullUrl(androidUrl) : getFullUrl(iosUrl);

  // Reset to Android when modal opens
  useEffect(() => {
    if (isOpen) {
      setActivePlatform('android');
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-bold">
            <Smartphone className="w-6 h-6 text-pink-400" />
            Download Mobile App
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Read on the go with the YouNov mobile app. Select your platform below to update the QR code.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-6 space-y-4">
          <div className="bg-white p-2 rounded-xl shadow-lg shadow-pink-900/20 relative">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(currentUrl)}`} 
              alt={`Scan to Download ${activePlatform === 'android' ? 'Android' : 'iOS'} App`} 
              className="w-48 h-48 object-contain transition-all duration-300"
              key={currentUrl} // Force re-render on url change for animation
            />
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded-full border border-slate-700 shadow-sm whitespace-nowrap">
                {activePlatform === 'android' ? 'Android QR' : 'iOS QR'}
            </div>
          </div>
          <p className="text-sm text-slate-500 text-center">
            Scan with your phone camera to download instantly.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button 
            className={`w-full font-semibold transition-all ${activePlatform === 'ios' ? 'bg-white text-black hover:bg-slate-200 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'}`} 
            onClick={() => {
              setActivePlatform('ios');
              window.open(iosUrl, '_blank');
            }}
          >
            <Apple className="w-4 h-4 mr-2" /> iOS Version
          </Button>
          <Button 
            className={`w-full font-semibold transition-all ${activePlatform === 'android' ? 'bg-green-600 text-white hover:bg-green-700 ring-2 ring-green-600 ring-offset-2 ring-offset-slate-900' : 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700'}`} 
            onClick={() => {
              setActivePlatform('android');
              window.open(androidUrl, '_blank');
            }}
          >
            <Play className="w-4 h-4 mr-2 fill-current" /> Android Version
          </Button>
        </div>

        <DialogFooter className="sm:justify-start mt-4">
          <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MobileAppModal;
