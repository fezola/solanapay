import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Lock, X, AlertCircle } from 'lucide-react';

interface PINVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (pin: string) => Promise<boolean>;
  title?: string;
  description?: string;
}

export function PINVerificationModal({
  isOpen,
  onClose,
  onVerify,
  title = 'Verify Your PIN',
  description = 'Enter your 6-digit PIN to confirm this transaction',
}: PINVerificationModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleNumberClick = (num: string) => {
    if (pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
      setError('');

      // Auto-verify when 6 digits entered
      if (newPin.length === 6) {
        verifyPin(newPin);
      }
    }
  };

  const verifyPin = async (pinToVerify: string) => {
    setIsVerifying(true);
    setError('');

    try {
      const isValid = await onVerify(pinToVerify);
      
      if (isValid) {
        // Success - close modal
        setPin('');
        onClose();
      } else {
        // Invalid PIN
        setError('Incorrect PIN. Please try again.');
        setPin('');
      }
    } catch (err) {
      setError('Verification failed. Please try again.');
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const handleClose = () => {
    setPin('');
    setError('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - DON'T close on click to prevent accidental dismissal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
          />

          {/* Modal - Fixed to bottom for mobile keyboard */}
          <div className="fixed inset-x-0 bottom-0 z-50 flex items-end justify-center pointer-events-none">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full pointer-events-auto"
            >
              <Card className="p-6 bg-white shadow-2xl rounded-t-3xl rounded-b-none border-t-4 border-blue-500">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Lock className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                      <p className="text-sm text-gray-600">{description}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-2"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* PIN Display - Bigger boxes */}
                <div className="flex justify-center gap-3 mb-6">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <motion.div
                      key={index}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center ${
                        pin.length > index
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-300 bg-white'
                      } ${error ? 'border-red-400 bg-red-50' : ''}`}
                    >
                      {pin.length > index && (
                        <div className={`w-3 h-3 rounded-full ${error ? 'bg-red-600' : 'bg-blue-600'}`} />
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <p className="text-red-600 text-sm">{error}</p>
                  </motion.div>
                )}

                {/* Verifying State */}
                {isVerifying && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-center"
                  >
                    <p className="text-blue-600 text-sm">Verifying PIN...</p>
                  </motion.div>
                )}

                {/* Number Pad - BIGGER buttons for better touch */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <motion.button
                      key={num}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleNumberClick(num.toString())}
                      disabled={isVerifying}
                      className="h-16 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-900 text-2xl font-semibold transition-colors disabled:opacity-50 shadow-sm"
                    >
                      {num}
                    </motion.button>
                  ))}
                  <div /> {/* Empty space */}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleNumberClick('0')}
                    disabled={isVerifying}
                    className="h-16 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-900 text-2xl font-semibold transition-colors disabled:opacity-50 shadow-sm"
                  >
                    0
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDelete}
                    disabled={isVerifying}
                    className="h-16 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-900 text-xl font-semibold transition-colors disabled:opacity-50 shadow-sm"
                  >
                    ⌫
                  </motion.button>
                </div>

                {/* Cancel Button */}
                <Button
                  onClick={handleClose}
                  variant="outline"
                  className="w-full h-12 text-base font-semibold"
                  disabled={isVerifying}
                >
                  Cancel
                </Button>

                {/* Security Note */}
                <p className="text-center text-gray-500 text-xs mt-3 mb-2">
                  🔒 Your PIN is required to authorize this transaction
                </p>
              </Card>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

