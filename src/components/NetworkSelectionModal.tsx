import { motion, AnimatePresence } from 'motion/react';
import { Card } from './ui/card';
import { X, ChevronRight, AlertTriangle } from 'lucide-react';
import type { CryptoAsset, NetworkOption } from './CryptoSelectionScreen';

interface NetworkSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  crypto: CryptoAsset;
  onSelectNetwork: (network: NetworkOption) => void;
}

export function NetworkSelectionModal({
  isOpen,
  onClose,
  crypto,
  onSelectNetwork,
}: NetworkSelectionModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed left-1/2 -translate-x-1/2 bottom-0 z-50 bg-white rounded-t-3xl max-h-[80vh] overflow-hidden flex flex-col w-full max-w-lg"
            style={{ paddingBottom: `calc(2rem + env(safe-area-inset-bottom))` }}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                    <img
                      src={crypto.logo}
                      alt={crypto.symbol}
                      className="w-6 h-6 rounded-full object-contain"
                    />
                  </div>
                  <div>
                    <h2 className="text-gray-900 font-semibold text-lg">
                      Select Network
                    </h2>
                    <p className="text-gray-600 text-sm">
                      Choose network for {crypto.symbol}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Warning */}
            <div className="px-6 pt-4 pb-2 flex-shrink-0">
              <Card className="p-3 bg-yellow-50 border border-yellow-200">
                <div className="flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-yellow-800 text-xs leading-relaxed">
                    <strong>Important:</strong> Make sure to send {crypto.symbol} on the same network you select here. Sending on the wrong network will result in permanent loss of funds.
                  </p>
                </div>
              </Card>
            </div>

            {/* Network List */}
            <div className="flex-1 overflow-y-auto px-6 pt-4 pb-4">
              <div className="space-y-3 pb-24">
                {crypto.networks.map((network, index) => (
                  <motion.div
                    key={network.id}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.05 * index }}
                  >
                    <button
                      onClick={() => {
                        onSelectNetwork(network);
                        onClose();
                      }}
                      className="w-full"
                    >
                      <Card className="p-4 border border-gray-200 hover:border-gray-900 hover:shadow-md transition-all cursor-pointer active:scale-[0.98]">
                        <div className="flex items-center gap-3">
                          {/* Network Icon - Smaller */}
                          <div className="relative flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
                              <img
                                src={network.logo}
                                alt={network.name}
                                className="w-6 h-6 rounded-full object-contain"
                              />
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 flex-shrink-0 bg-white rounded-full">
                              <img
                                src={crypto.logo}
                                alt={crypto.symbol}
                                className="w-4 h-4 rounded-full border-2 border-white object-contain"
                              />
                            </div>
                          </div>

                          {/* Network Info */}
                          <div className="flex-1 min-w-0 text-left">
                            <h3 className="text-gray-900 font-semibold text-base mb-1">
                              {network.name}
                            </h3>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                              <span>⚡ {network.estimatedTime}</span>
                              <span>✓ {network.confirmations} conf{network.confirmations > 1 ? 's' : ''}</span>
                              <span>Min: {network.minDeposit} {crypto.symbol}</span>
                            </div>
                          </div>

                          {/* Arrow */}
                          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        </div>
                      </Card>
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

