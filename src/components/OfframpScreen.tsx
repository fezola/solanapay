import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { ArrowDownUp, Info, ChevronRight, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { quotesApi, payoutsApi } from '../services/api';
import { calculatePlatformFee } from '../config/fees';

interface OfframpScreenProps {
  balance: {
    usdcSolana: number;
    usdcBase: number;
    sol: number;
    usdtSolana: number;
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
}

type AssetId = 'usdc-solana' | 'usdc-base' | 'sol' | 'usdt-solana';

export function OfframpScreen({
  balance,
  bankAccounts,
  onNavigateToBankAccounts,
  onNavigateToKYC,
  onOfframpSuccess,
  kycTier,
  limits
}: OfframpScreenProps) {
  const [selectedAsset, setSelectedAsset] = useState<AssetId>('usdc-solana');
  const [amount, setAmount] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [quoteLockTime, setQuoteLockTime] = useState(120); // 120 seconds quote lock
  const [rates, setRates] = useState<Record<string, number>>({
    'usdc-solana': 1600,
    'usdc-base': 1600,
    'sol': 250000,
    'usdt-solana': 1600,
  });
  const [loadingRates, setLoadingRates] = useState(false);

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
  ];

  const currentAsset = assets.find(a => a.id === selectedAsset) || assets[0];
  const nairaAmount = amount ? parseFloat(amount) * currentAsset.rate : 0;

  // Calculate platform fee using centralized config
  const fee = calculatePlatformFee(nairaAmount);
  const youReceive = nairaAmount - fee;

  const dailyRemaining = limits.daily.limit - limits.daily.used;
  const exceedsLimit = youReceive > dailyRemaining;

  // Debug logging
  useEffect(() => {
    console.log('🔍 OfframpScreen Debug:', {
      kycTier,
      limits,
      dailyRemaining,
      youReceive,
      exceedsLimit,
    });
  }, [kycTier, limits, youReceive, exceedsLimit]);

  // Fetch rates from Bread on mount using quote endpoint (includes fees)
  useEffect(() => {
    const fetchRates = async () => {
      setLoadingRates(true);
      try {
        const API_URL = (import.meta as any).env?.VITE_API_URL || 'https://crypto-offramp-backend.onrender.com';

        // Fetch rates for all assets using quote endpoint (gives actual rate with fees)
        // Note: SOL removed - Bread Africa doesn't support SOL offramp
        const assetMappings = [
          { id: 'usdc-solana', breadAsset: 'solana:usdc', amount: 1 },
          { id: 'usdc-base', breadAsset: 'base:usdc', amount: 1 },
          { id: 'usdt-solana', breadAsset: 'solana:usdt', amount: 1 },
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
      } finally {
        setLoadingRates(false);
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

    if (exceedsLimit) {
      toast.error(`Transaction would exceed daily limit. Maximum: ₦${dailyRemaining.toLocaleString()}`);
      return;
    }

    if (!selectedBank) {
      toast.error('Please select a bank account');
      return;
    }

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

      // Step 2: Execute the offramp directly
      console.log('🔵 Executing offramp...', {
        asset: currentAsset.symbol,
        chain: currentAsset.network.toLowerCase(),
        amount: parseFloat(amount),
        beneficiaryId: selectedBank,
      });

      const payoutResponse = await payoutsApi.executeOfframp({
        asset: currentAsset.symbol,
        chain: currentAsset.network.toLowerCase(),
        amount: parseFloat(amount),
        beneficiary_id: selectedBank,
        currency: 'NGN',
      });

      console.log('✅ Offramp executed:', payoutResponse);

      // Step 3: Create transaction object for UI
      const bankAccount = bankAccounts.find(b => b.id === selectedBank);
      const transaction = {
        id: payoutResponse.payout.id,
        type: 'offramp',
        crypto: currentAsset.symbol,
        network: currentAsset.network,
        amount: parseFloat(amount),
        nairaAmount: youReceive,
        rate: currentAsset.rate,
        fee: fee,
        status: payoutResponse.payout.status,
        date: new Date().toISOString(),
        bankAccountId: selectedBank,
        bankAccount: bankAccount,
        confirmations: 0,
        requiredConfirmations: currentAsset.network === 'Solana' ? 1 : 12,
      };

      onOfframpSuccess(transaction);
      toast.success('Off-ramp executed successfully! Money is on the way to your bank.');
      setIsProcessing(false);
      setAmount('');
      setSelectedBank('');
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

  if (kycTier === 0) {
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

        <div className="px-6">
          <Card className="p-6 border border-yellow-100 bg-yellow-50">
            <div className="flex gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="text-yellow-900 mb-2">KYC Required</p>
                <p className="text-yellow-800 mb-4">
                  You need to complete KYC verification (Tier 1) to use off-ramp features.
                  This helps us comply with Nigerian financial regulations and keep your account secure.
                </p>
                <Button
                  onClick={onNavigateToKYC}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  Start KYC Verification
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

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
                            <img
                              src={asset.logo}
                              alt={asset.symbol}
                              className="w-6 h-6 rounded-full"
                            />
                            <span>{asset.name}</span>
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
                  <span className={`text-2xl font-semibold ${exceedsLimit ? 'text-red-600' : 'text-gray-900'}`}>
                    ₦{youReceive.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {exceedsLimit && (
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                  <div className="flex gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <div>
                      <p className="text-red-900 mb-1">Exceeds Daily Limit</p>
                      <p className="text-red-800">
                        Daily limit remaining: ₦{dailyRemaining.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Bank Account</Label>
                {bankAccounts.length === 0 ? (
                  <button
                    onClick={onNavigateToBankAccounts}
                    className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-colors flex items-center justify-between"
                  >
                    <span className="text-gray-600">Add a bank account</span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                ) : (
                  <Select value={selectedBank} onValueChange={setSelectedBank}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.bankName} - {account.accountNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="bg-blue-50 p-4 rounded-xl flex gap-3 border border-blue-100">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-900 mb-1">Processing Time</p>
                  <p className="text-blue-800">
                    • {currentAsset.network === 'Solana' ? '~30 seconds' : '~2 minutes'} for confirmation
                  </p>
                  <p className="text-blue-800">
                    • 5-10 minutes for Naira payout (business hours)
                  </p>
                </div>
              </div>

              <Button
                onClick={handleOfframp}
                disabled={
                  isProcessing || 
                  !amount || 
                  !selectedBank || 
                  parseFloat(amount) > currentAsset.balance ||
                  parseFloat(amount) < currentAsset.minAmount ||
                  exceedsLimit
                }
                className="w-full"
              >
                {isProcessing ? 'Processing...' : 'Off-ramp Now'}
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
