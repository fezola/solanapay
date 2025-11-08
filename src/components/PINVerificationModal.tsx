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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md pointer-events-auto"
            >
              <Card className="p-6 bg-white shadow-2xl">
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
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* PIN Display */}
                <div className="flex justify-center gap-2 mb-6">
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <motion.div
                      key={index}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center ${
                        pin.length > index
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 bg-white'
                      } ${error ? 'border-red-300 bg-red-50' : ''}`}
                    >
                      {pin.length > index && (
                        <div className={`w-2.5 h-2.5 rounded-full ${error ? 'bg-red-600' : 'bg-blue-600'}`} />
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

                {/* Number Pad */}
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <motion.button
                      key={num}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleNumberClick(num.toString())}
                      disabled={isVerifying}
                      className="h-14 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-900 text-xl font-semibold transition-colors disabled:opacity-50"
                    >
                      {num}
                    </motion.button>
                  ))}
                  <div /> {/* Empty space */}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleNumberClick('0')}
                    disabled={isVerifying}
                    className="h-14 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-900 text-xl font-semibold transition-colors disabled:opacity-50"
                  >
                    0
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleDelete}
                    disabled={isVerifying}
                    className="h-14 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-900 text-lg font-semibold transition-colors disabled:opacity-50"
                  >
                    ⌫
                  </motion.button>
                </div>

                {/* Cancel Button */}
                <Button
                  onClick={handleClose}
                  variant="outline"
                  className="w-full mt-4"
                  disabled={isVerifying}
                >
                  Cancel
                </Button>

                {/* Security Note */}
                <p className="text-center text-gray-500 text-xs mt-4">
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

