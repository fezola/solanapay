import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Gift, Share2, ExternalLink, X } from 'lucide-react';

interface BonusNotificationCardProps {
  amount: number;
  asset: string;
  reason: string;
  txHash: string;
  onShare: () => void;
  onDismiss: () => void;
}

export const BonusNotificationCard: React.FC<BonusNotificationCardProps> = ({
  amount,
  asset,
  reason,
  txHash,
  onShare,
  onDismiss,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const openExplorer = () => {
    const url = `https://solscan.io/tx/${txHash}`;
    window.open(url, '_blank');
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 50 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={handleDismiss}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md"
          >
            <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 via-white to-purple-50 border-2 border-purple-200 shadow-2xl">
              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-purple-100 transition-colors z-10"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>

              {/* Confetti decoration */}
              <div className="absolute top-0 left-0 right-0 flex justify-around pt-4 text-2xl opacity-60 pointer-events-none">
                <span>🎉</span>
                <span>✨</span>
                <span>🎊</span>
                <span>💰</span>
              </div>

              <div className="p-8 pt-12">
                {/* Gift Icon */}
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-purple-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                    <div className="relative w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                      <Gift className="w-10 h-10 text-white" />
                    </div>
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">
                  Congratulations! 🎉
                </h2>
                <p className="text-center text-gray-600 mb-6">
                  You've received a bonus!
                </p>

                {/* Amount */}
                <div className="flex items-baseline justify-center mb-6">
                  <span className="text-4xl font-semibold text-purple-600 mr-1">$</span>
                  <span className="text-6xl font-bold text-purple-600">{amount.toFixed(2)}</span>
                  <span className="text-2xl font-semibold text-gray-600 ml-2">{asset}</span>
                </div>

                {/* Reason */}
                <div className="bg-purple-100 rounded-xl p-4 mb-6">
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-1">
                    Reason
                  </p>
                  <p className="text-base font-medium text-gray-900">
                    {reason}
                  </p>
                </div>

                {/* Share Button */}
                <Button
                  onClick={onShare}
                  className="w-full bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white font-semibold py-6 rounded-xl mb-3 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <Share2 className="w-5 h-5" />
                  Share on X (Twitter)
                </Button>

                {/* View Transaction */}
                <button
                  onClick={openExplorer}
                  className="w-full flex items-center justify-center gap-2 text-purple-600 hover:text-purple-700 font-medium py-3 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on Solscan
                </button>

                {/* Dismiss */}
                <button
                  onClick={handleDismiss}
                  className="w-full text-gray-500 hover:text-gray-700 font-medium py-2 transition-colors"
                >
                  Got it!
                </button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

