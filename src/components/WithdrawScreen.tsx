import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowLeft, Wallet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { PINVerificationModal } from './PINVerificationModal';
import { authService, userService } from '../services/supabase';

interface WithdrawScreenProps {
  nairaBalance: number;
  bankAccounts: Array<{
    id: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
  }>;
  onBack: () => void;
  onWithdrawSuccess: () => void;
  userId: string;
}

export function WithdrawScreen({
  nairaBalance,
  bankAccounts,
  onBack,
  onWithdrawSuccess,
  userId,
}: WithdrawScreenProps) {
  const [amount, setAmount] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPINModal, setShowPINModal] = useState(false);

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const handleMaxClick = () => {
    setAmount(nairaBalance.toString());
  };

  const handleWithdrawClick = () => {
    // Validation
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (parseFloat(amount) > nairaBalance) {
      toast.error('Insufficient balance');
      return;
    }

    if (!selectedBank) {
      toast.error('Please select a bank account');
      return;
    }

    // Show PIN modal
    setShowPINModal(true);
  };

  const executeWithdrawal = async () => {
    setIsProcessing(true);

    try {
      const API_URL = (import.meta as any).env?.VITE_API_URL || 'https://crypto-offramp-backend.onrender.com';

      // Get auth token
      const session = await authService.getSession();
      const token = session?.access_token;

      if (!token) {
        toast.error('Authentication required');
        return;
      }

      console.log('🏦 Initiating withdrawal:', {
        amount: parseFloat(amount),
        beneficiaryId: selectedBank,
      });

      const response = await fetch(`${API_URL}/api/wallet/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          beneficiaryId: selectedBank,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Withdrawal failed');
      }

      console.log('✅ Withdrawal successful:', data);

      // Show success message with bank details
      const bankAccount = bankAccounts.find(b => b.id === selectedBank);
      toast.success(`₦${parseFloat(amount).toLocaleString()} sent to ${bankAccount?.bankName} (${bankAccount?.accountNumber})!`);

      // Reset form
      setAmount('');
      setSelectedBank('');

      // Call success callback
      onWithdrawSuccess();

      // Navigate back after a short delay
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (error: any) {
      console.error('❌ Withdrawal failed:', error);
      toast.error(error.message || 'Failed to process withdrawal. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePINVerify = async (pin: string): Promise<boolean> => {
    try {
      // Verify PIN
      const isValid = await userService.verifyTransactionPIN(userId, pin);

      if (isValid) {
        // PIN verified - execute the withdrawal
        setShowPINModal(false);
        await executeWithdrawal();
        return true;
      } else {
        toast.error('Invalid PIN');
        return false;
      }
    } catch (error) {
      console.error('PIN verification failed:', error);
      toast.error('PIN verification failed');
      return false;
    }
  };

  return (
    <>
      <div className="pb-safe-nav min-h-screen overflow-y-auto" style={{ backgroundColor: 'white' }}>
        {/* Header - Black gradient with title */}
        <div
          className="px-6 pb-6"
          style={{
            background: 'linear-gradient(to bottom right, #111827, #1f2937)',
            paddingTop: `calc(2rem + env(safe-area-inset-top))`,
            minHeight: '180px'
          }}
        >
          <button
            onClick={onBack}
            style={{ color: 'white' }}
            className="mb-4 hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
            >
              <Wallet className="w-6 h-6" style={{ color: 'white' }} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: 'white' }}>Withdraw to Bank</h1>
          </div>
          <p className="text-sm" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
            Send money from your NGN wallet to your bank account
          </p>
        </div>

        {/* Content - continues white background */}
        <div className="px-6 space-y-6 pb-8">
          {/* Available Balance */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-5 h-5 text-gray-700" />
              <p className="text-sm text-gray-600 font-medium">Available Balance</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              ₦{nairaBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="amount" className="text-gray-700 font-semibold">
                Amount (NGN)
              </Label>
              <button
                onClick={handleMaxClick}
                className="px-2 py-1 text-xs font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                disabled={isProcessing}
              >
                Use Max
              </button>
            </div>
            <div className="relative">
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="h-14 text-lg"
                disabled={isProcessing}
              />
            </div>
            {amount && parseFloat(amount) > nairaBalance && (
              <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>Insufficient balance</span>
              </div>
            )}
          </div>

          {/* Bank Account Selection */}
          <div>
            <Label htmlFor="bank" className="text-gray-700 font-semibold mb-2 block">
              Bank Account
            </Label>
            {bankAccounts.length === 0 ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  No bank accounts added yet. Please add a bank account first.
                </p>
              </div>
            ) : (
              <Select value={selectedBank} onValueChange={setSelectedBank} disabled={isProcessing}>
                <SelectTrigger className="h-14">
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex flex-col">
                        <span className="font-semibold">{account.bankName}</span>
                        <span className="text-sm text-gray-500">
                          {account.accountNumber} - {account.accountName}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Summary */}
          {amount && selectedBank && parseFloat(amount) <= nairaBalance && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-gray-700" />
                <p className="text-sm font-semibold text-gray-900">Withdrawal Summary</p>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Amount</span>
                <span className="font-semibold text-gray-900">
                  ₦{parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Bank</span>
                <span className="font-semibold text-gray-900">
                  {bankAccounts.find(b => b.id === selectedBank)?.bankName}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Account</span>
                <span className="font-semibold text-gray-900">
                  {bankAccounts.find(b => b.id === selectedBank)?.accountNumber}
                </span>
              </div>
            </div>
          )}

          {/* Withdraw Button */}
          <div>
            <Button
              onClick={handleWithdrawClick}
              disabled={
                isProcessing ||
                !amount ||
                parseFloat(amount) <= 0 ||
                parseFloat(amount) > nairaBalance ||
                !selectedBank ||
                bankAccounts.length === 0
              }
              className="w-full h-14 bg-gray-900 hover:bg-black text-white text-lg font-semibold rounded-xl"
            >
              {isProcessing ? 'Processing...' : 'Withdraw to Bank'}
            </Button>
          </div>
        </div>
      </div>

      {/* PIN Verification Modal */}
      <PINVerificationModal
        isOpen={showPINModal}
        onClose={() => setShowPINModal(false)}
        onVerify={handlePINVerify}
        title="Verify Withdrawal"
        description={`Enter your PIN to withdraw ₦${parseFloat(amount || '0').toLocaleString()} to ${bankAccounts.find(b => b.id === selectedBank)?.bankName}`}
      />
    </>
  );
}

