
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import MobileAppModal from './MobileAppModal';

const AppDownloadButtons = () => {
  const [showMobile, setShowMobile] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
        <div className="pointer-events-auto flex flex-col items-end gap-3">
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => setShowMobile(true)}
                        size="icon"
                        className="h-12 w-12 rounded-full bg-slate-800 hover:bg-pink-600 text-white border border-slate-700 hover:border-pink-500 shadow-xl shadow-black/50 transition-all duration-300 hover:scale-110"
                      >
                        <Smartphone className="w-6 h-6" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p>Mobile App</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <MobileAppModal isOpen={showMobile} onClose={() => setShowMobile(false)} />
    </>
  );
};

export default AppDownloadButtons;
