import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowDownUp, Info, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { payoutsApi } from '../services/api';
import { calculatePlatformFee } from '../config/fees';
import { PINVerificationModal } from './PINVerificationModal';
import { userService } from '../services/supabase';

interface OfframpScreenProps {
  balance: {
    usdcSolana: number;
    usdcBase: number;
    usdcPolygon: number;
    sol: number;
    usdtSolana: number;
    usdtBase: number;
    usdtPolygon: number;
    naira: number;
  };
  bankAccounts: Array<{
    id: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
  }>;
  onNavigateToBankAccounts: () => void;
  onNavigateToKYC: () => void;
  onOfframpSuccess: (transaction: any) => void;
  kycTier: number;
  limits: {
    daily: {
      limit: number;
      used: number;
    };
  };
  userId: string;
}

type AssetId = 'usdc-solana' | 'usdc-base' | 'usdc-polygon' | 'sol' | 'usdt-solana' | 'usdt-base' | 'usdt-polygon';

export function OfframpScreen({
  balance,
  bankAccounts,
  onNavigateToBankAccounts,
  onNavigateToKYC,
  onOfframpSuccess,
  kycTier,
  limits,
  userId
}: OfframpScreenProps) {
  const [selectedAsset, setSelectedAsset] = useState<AssetId>('usdc-solana');
  const [amount, setAmount] = useState('');
  const [selectedBankAccount, setSelectedBankAccount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [quoteLockTime, setQuoteLockTime] = useState(120); // 120 seconds quote lock
  const [rates, setRates] = useState<Record<string, number>>({
    'usdc-solana': 1600,
    'usdc-base': 1600,
    'usdc-polygon': 1600,
    'sol': 250000,
    'usdt-solana': 1600,
    'usdt-base': 1600,
    'usdt-polygon': 1600,
  });
  const [showPINModal, setShowPINModal] = useState(false);

  const assets = [
    {
      id: 'usdc-solana' as AssetId,
      name: 'USDC (Solana)',
      symbol: 'USDC',
      network: 'Solana',
      balance: balance.usdcSolana,
      rate: rates['usdc-solana'],
      minAmount: 1,
      logo: '/usd-coin-usdc-logo.svg',
      networkLogo: '/solana-sol-logo.svg',
      breadAsset: 'solana:usdc',
    },
    {
      id: 'usdc-base' as AssetId,
      name: 'USDC (Base)',
      symbol: 'USDC',
      network: 'Base',
      balance: balance.usdcBase,
      rate: rates['usdc-base'],
      minAmount: 1,
      logo: '/usd-coin-usdc-logo.svg',
      networkLogo: '/BASE.png',
      breadAsset: 'base:usdc',
    },
    {
      id: 'usdc-polygon' as AssetId,
      name: 'USDC (Polygon)',
      symbol: 'USDC',
      network: 'Polygon',
      balance: balance.usdcPolygon,
      rate: rates['usdc-polygon'],
      minAmount: 1,
      logo: '/usd-coin-usdc-logo.svg',
      networkLogo: '/polygon-matic-logo.svg',
      breadAsset: 'polygon:usdc',
    },
    // SOL removed - Bread Africa doesn't support SOL offramp
    // {
    //   id: 'sol' as AssetId,
    //   name: 'Solana',
    //   symbol: 'SOL',
    //   network: 'Solana',
    //   balance: balance.sol,
    //   rate: rates['sol'],
    //   minAmount: 0.01,
    //   logo: '/solana-sol-logo.svg',
    //   networkLogo: '/solana-sol-logo.svg',
    //   breadAsset: 'solana:sol',
    // },
    {
      id: 'usdt-solana' as AssetId,
      name: 'USDT (Solana)',
      symbol: 'USDT',
      network: 'Solana',
      balance: balance.usdtSolana,
      rate: rates['usdt-solana'],
      minAmount: 1,
      logo: '/tether-usdt-logo.svg',
      networkLogo: '/solana-sol-logo.svg',
      breadAsset: 'solana:usdt',
    },
    {
      id: 'usdt-base' as AssetId,
      name: 'USDT (Base)',
      symbol: 'USDT',
      network: 'Base',
      balance: balance.usdtBase,
      rate: rates['usdt-base'],
      minAmount: 1,
      logo: '/tether-usdt-logo.svg',
      networkLogo: '/BASE.png',
      breadAsset: 'base:usdt',
    },
    {
      id: 'usdt-polygon' as AssetId,
      name: 'USDT (Polygon)',
      symbol: 'USDT',
      network: 'Polygon',
      balance: balance.usdtPolygon,
      rate: rates['usdt-polygon'],
      minAmount: 1,
      logo: '/tether-usdt-logo.svg',
      networkLogo: '/polygon-matic-logo.svg',
      breadAsset: 'polygon:usdt',
    },
  ];

  const currentAsset = assets.find(a => a.id === selectedAsset) || assets[0];
  const nairaAmount = amount ? parseFloat(amount) * currentAsset.rate : 0;

  // Calculate platform fee using centralized config
  const fee = calculatePlatformFee(nairaAmount);
  const youReceive = nairaAmount - fee;

  // Daily limit check removed - no limits enforced for any users

  // Fetch rates from Bread on mount using quote endpoint (includes fees)
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const API_URL = (import.meta as any).env?.VITE_API_URL || 'https://crypto-offramp-backend.onrender.com';

        // Fetch rates for all assets using quote endpoint (gives actual rate with fees)
        // Note: SOL removed - Bread Africa doesn't support SOL offramp
        const assetMappings = [
          { id: 'usdc-solana', breadAsset: 'solana:usdc', amount: 1 },
          { id: 'usdc-base', breadAsset: 'base:usdc', amount: 1 },
          { id: 'usdc-polygon', breadAsset: 'polygon:usdc', amount: 1 },
          { id: 'usdt-solana', breadAsset: 'solana:usdt', amount: 1 },
          { id: 'usdt-base', breadAsset: 'base:usdt', amount: 1 },
          { id: 'usdt-polygon', breadAsset: 'polygon:usdt', amount: 1 },
        ];

        const ratePromises = assetMappings.map(async ({ id, breadAsset, amount }) => {
          try {
            const response = await fetch(`${API_URL}/api/rates/quote`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                asset: breadAsset,
                amount: amount,
                currency: 'NGN',
                is_exact_output: false,
              }),
            });
            if (response.ok) {
              const data = await response.json();
              // Calculate effective rate: output_amount / input_amount
              const effectiveRate = data.output_amount / data.input_amount;
              return { id, rate: effectiveRate };
            }
          } catch (error) {
            console.error(`Failed to fetch rate for ${breadAsset}:`, error);
          }
          return null;
        });

        const results = await Promise.all(ratePromises);
        const newRates: Record<string, number> = { ...rates };

        results.forEach(result => {
          if (result && result.rate) {
            newRates[result.id] = result.rate;
          }
        });

        setRates(newRates);
        console.log('✅ Fetched rates from Bread (with fees):', newRates);
      } catch (error) {
        console.error('Failed to fetch rates:', error);
        toast.error('Failed to fetch exchange rates');
      }
    };

    fetchRates();
    // Refresh rates every 30 seconds
    const interval = setInterval(fetchRates, 30000);
    return () => clearInterval(interval);
  }, []);

  // Quote countdown timer
  useEffect(() => {
    if (amount && parseFloat(amount) > 0 && quoteLockTime > 0) {
      const timer = setInterval(() => {
        setQuoteLockTime(prev => {
          if (prev <= 1) {
            toast.info('Quote expired. Rate refreshed.');
            return 120;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [amount, quoteLockTime]);

  const handleOfframp = async () => {
    // Validation checks
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter an amount');
      return;
    }

    if (parseFloat(amount) < currentAsset.minAmount) {
      toast.error(`Minimum amount is ${currentAsset.minAmount} ${currentAsset.symbol}`);
      return;
    }

    if (parseFloat(amount) > currentAsset.balance) {
      toast.error('Insufficient balance');
      return;
    }

    if (!selectedBankAccount) {
      toast.error('Please select a bank account');
      return;
    }

    // Daily limit check removed - no limits enforced

    // Show PIN verification modal
    setShowPINModal(true);
  };

  const executeOfframp = async () => {
    setIsProcessing(true);

    try {
      // Step 1: Get quote from Bread API (working endpoint)
      console.log('🔵 Getting quote from Bread...', {
        asset: currentAsset.symbol,
        chain: currentAsset.network.toLowerCase(),
        amount: parseFloat(amount),
      });

      const quoteResponse = await payoutsApi.getQuote(
        currentAsset.symbol,
        currentAsset.network.toLowerCase(),
        parseFloat(amount),
        'NGN'
      );

      console.log('✅ Quote received:', quoteResponse);

      // Step 2: Execute the offramp directly (credits NGN wallet)
      console.log('🔵 Executing offramp to NGN wallet...', {
        asset: currentAsset.symbol,
        chain: currentAsset.network.toLowerCase(),
        amount: parseFloat(amount),
      });

      const payoutResponse = await payoutsApi.executeOfframp({
        asset: currentAsset.symbol,
        chain: currentAsset.network.toLowerCase(),
        amount: parseFloat(amount),
        currency: 'NGN',
        beneficiary_id: selectedBankAccount,
      });

      console.log('✅ Offramp executed:', payoutResponse);

      // Get selected bank account details for display
      const selectedBank = bankAccounts.find(acc => acc.id === selectedBankAccount);

      // Step 3: Create transaction object for UI
      console.log('📝 Creating transaction object:', {
        payoutId: payoutResponse.payout.id,
        amount: parseFloat(amount),
        nairaAmount: youReceive,
        destination: selectedBank?.bankName,
      });

      const transaction = {
        id: payoutResponse.payout.id,
        type: 'offramp' as const,
        crypto: currentAsset.symbol,
        network: currentAsset.network,
        amount: parseFloat(amount),
        nairaAmount: youReceive,
        rate: currentAsset.rate,
        fee: fee,
        status: payoutResponse.payout.status,
        date: new Date().toISOString(),
        confirmations: 0,
        requiredConfirmations: currentAsset.network === 'Solana' ? 1 : 12,
        bankAccountId: selectedBankAccount,
      };

      console.log('✅ Transaction object created:', transaction);

      // Show success notification - money goes directly to bank account
      toast.success(`₦${youReceive.toLocaleString()} sent to ${selectedBank?.bankName}!`, {
        description: `Account: ${selectedBank?.accountNumber}`,
      });

      // Call parent success handler
      onOfframpSuccess(transaction);

      setIsProcessing(false);
      setAmount('');
      setQuoteLockTime(120);
    } catch (error: any) {
      console.error('❌ Offramp failed:', error);

      // Show detailed error message
      const errorMessage = error.response?.data?.message ||
                          error.response?.data?.error ||
                          error.message ||
                          'Failed to execute offramp. Please try again.';

      toast.error(errorMessage);
      setIsProcessing(false);
    }
  };

  const handlePINVerify = async (pin: string): Promise<boolean> => {
    try {
      // Verify PIN
      const isValid = await userService.verifyTransactionPIN(userId, pin);

      if (isValid) {
        // PIN verified - execute the offramp
        setShowPINModal(false);
        await executeOfframp();
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('PIN verification error:', error);
      return false;
    }
  };

  // KYC check removed - offramp is now open for all users
  // Users can create beneficiaries and execute offramps without KYC verification

  return (
    <div className="pb-safe-nav bg-white min-h-screen">
      <div className="px-6 pb-6" style={{ paddingTop: `calc(3rem + env(safe-area-inset-top))` }}>
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <h1 className="text-gray-900 mb-2">Off-ramp Crypto</h1>
          <p className="text-gray-500">Convert your crypto to Naira</p>
        </motion.div>
      </div>

      <div className="px-6 space-y-6">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <Card className="p-6 border border-gray-100">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Asset</Label>
                <Select value={selectedAsset} onValueChange={(value: AssetId) => {
                  setSelectedAsset(value);
                  setAmount('');
                  setQuoteLockTime(120);
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        <div className="flex items-center justify-between w-full gap-3">
                          <div className="flex items-center gap-2">
                            {/* Token and Network logos side by side */}
                            <div className="flex items-center -space-x-2">
                              <img
                                src={asset.logo}
                                alt={asset.symbol}
                                className="w-6 h-6 rounded-full border-2 border-white z-10"
                              />
                              <img
                                src={asset.networkLogo}
                                alt={asset.network}
                                className="w-6 h-6 rounded-full border-2 border-white"
                              />
                            </div>
                            <span>{asset.symbol}/{asset.network}</span>
                          </div>
                          <span className="text-gray-500 ml-4">
                            {asset.balance} {asset.symbol}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-between">
                  <p className="text-gray-500">Available balance</p>
                  <p className="text-gray-700">{currentAsset.balance} {currentAsset.symbol}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Amount</Label>
                  <button
                    onClick={() => {
                      setAmount(currentAsset.balance.toString());
                      setQuoteLockTime(120);
                    }}
                    className="text-gray-900 hover:underline"
                  >
                    Max: {currentAsset.balance}
                  </button>
                </div>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setQuoteLockTime(120);
                  }}
                  step="0.01"
                />
                <div className="flex items-center justify-between">
                  <p className="text-gray-500">
                    Rate: 1 {currentAsset.symbol} = ₦{currentAsset.rate.toLocaleString()}
                  </p>
                  {amount && parseFloat(amount) > 0 && (
                    <div className="flex items-center gap-1 text-gray-700">
                      <Clock className="w-4 h-4" />
                      <span>{Math.floor(quoteLockTime / 60)}:{(quoteLockTime % 60).toString().padStart(2, '0')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-center py-2">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <ArrowDownUp className="w-5 h-5 text-gray-600" />
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">You get</span>
                  <span className="text-gray-900">₦{nairaAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {fee > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Platform fee</span>
                    <span className="text-gray-900">-₦{fee.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex items-center justify-between">
                  <span className="font-medium">You receive</span>
                  <span className="text-2xl font-semibold text-gray-900">
                    ₦{youReceive.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Bank Account Selection */}
              <div className="space-y-2">
                <Label>Bank Account</Label>
                {bankAccounts.length === 0 ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 mb-2">
                      No bank accounts added yet.
                    </p>
                    <Button
                      onClick={onNavigateToBankAccounts}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      Add Bank Account
                    </Button>
                  </div>
                ) : (
                  <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                    <SelectTrigger>
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

              {/* Daily limit warning removed - no limits enforced */}

              <div className="bg-blue-50 p-4 rounded-xl flex gap-3 border border-blue-100">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-900 font-semibold mb-1">Direct Bank Transfer</p>
                  <p className="text-blue-800 text-sm">
                    • Money sent directly to your bank account
                  </p>
                  <p className="text-blue-800 text-sm">
                    • Typically arrives within minutes
                  </p>
                </div>
              </div>

              <Button
                onClick={handleOfframp}
                disabled={
                  isProcessing ||
                  !amount ||
                  !selectedBankAccount ||
                  parseFloat(amount) > currentAsset.balance ||
                  parseFloat(amount) < currentAsset.minAmount ||
                  bankAccounts.length === 0
                }
                className="w-full"
              >
                {isProcessing ? 'Processing...' : 'Convert to NGN'}
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* PIN Verification Modal */}
      <PINVerificationModal
        isOpen={showPINModal}
        onClose={() => setShowPINModal(false)}
        onVerify={handlePINVerify}
        title="Confirm Transaction"
        description="Enter your PIN to authorize this off-ramp"
      />
    </div>
  );
}
