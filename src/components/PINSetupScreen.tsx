import { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Lock, Check, X } from 'lucide-react';

interface PINSetupScreenProps {
  onComplete: (pin: string) => void;
  userName: string;
}

export function PINSetupScreen({ onComplete, userName }: PINSetupScreenProps) {
  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  const handleNumberClick = (num: string) => {
    setError('');
    
    if (step === 'create') {
      if (pin.length < 6) {
        setPin(pin + num);
      }
    } else {
      if (confirmPin.length < 6) {
        const newConfirmPin = confirmPin + num;
        setConfirmPin(newConfirmPin);
        
        // Auto-verify when 6 digits entered
        if (newConfirmPin.length === 6) {
          if (newConfirmPin === pin) {
            onComplete(pin);
          } else {
            setError('PINs do not match');
            setTimeout(() => {
              setConfirmPin('');
              setError('');
            }, 1500);
          }
        }
      }
    }
  };

  const handleDelete = () => {
    setError('');
    if (step === 'create') {
      setPin(pin.slice(0, -1));
    } else {
      setConfirmPin(confirmPin.slice(0, -1));
    }
  };

  const handleContinue = () => {
    if (pin.length === 6) {
      setStep('confirm');
    }
  };

  const currentPin = step === 'create' ? pin : confirmPin;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {step === 'create' ? 'Create Your PIN' : 'Confirm Your PIN'}
          </h1>
          <p className="text-gray-600">
            {step === 'create' 
              ? `Hi ${userName}, set up a 6-digit PIN to secure your transactions`
              : 'Re-enter your PIN to confirm'
            }
          </p>
        </div>

        {/* PIN Display */}
        <div className="flex justify-center gap-3 mb-8">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <motion.div
              key={index}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center ${
                currentPin.length > index
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              {currentPin.length > index && (
                <div className="w-3 h-3 bg-blue-600 rounded-full" />
              )}
            </motion.div>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2"
          >
            <X className="w-5 h-5 text-red-600" />
            <p className="text-red-600 text-sm">{error}</p>
          </motion.div>
        )}

        {/* Success Message */}
        {step === 'confirm' && confirmPin.length === 6 && confirmPin === pin && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2"
          >
            <Check className="w-5 h-5 text-green-600" />
            <p className="text-green-600 text-sm">PIN confirmed successfully!</p>
          </motion.div>
        )}

        {/* Number Pad */}
        <Card className="p-6 border border-gray-100">
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <motion.button
                key={num}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleNumberClick(num.toString())}
                className="h-16 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-900 text-2xl font-semibold transition-colors"
              >
                {num}
              </motion.button>
            ))}
            <div /> {/* Empty space */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleNumberClick('0')}
              className="h-16 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-900 text-2xl font-semibold transition-colors"
            >
              0
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleDelete}
              className="h-16 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-900 text-lg font-semibold transition-colors"
            >
              ⌫
            </motion.button>
          </div>

          {/* Continue Button (only for create step) */}
          {step === 'create' && (
            <Button
              onClick={handleContinue}
              disabled={pin.length !== 6}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-200 disabled:text-gray-400"
            >
              Continue
            </Button>
          )}
        </Card>

        {/* Security Note */}
        <p className="text-center text-gray-500 text-sm mt-6">
          🔒 Your PIN is encrypted and stored securely. Never share it with anyone.
        </p>
      </motion.div>
    </div>
  );
}

