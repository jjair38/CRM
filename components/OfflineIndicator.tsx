'use client';

import React from 'react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 left-4 z-[100] flex items-center gap-3 rounded-xl bg-red-950/80 backdrop-blur-md border border-red-500/50 px-4 py-3 text-xs font-medium text-white shadow-2xl"
        >
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <WifiOff size={16} className="text-red-400" />
          <span>Você está offline. O sistema tentará sincronizar ao reconectar.</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
