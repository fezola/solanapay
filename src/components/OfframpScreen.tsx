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

  const assets = [
    {
      id: 'usdc-solana' as AssetId,
      name: 'USDC (Solana)',
      symbol: 'USDC',
      network: 'Solana',
      balance: balance.usdcSolana,
      rate: 1600,
      minAmount: 1,
      logo: '/usd-coin-usdc-logo.svg',
      networkLogo: '/solana-sol-logo.svg',
    },
    {
      id: 'usdc-base' as AssetId,
      name: 'USDC (Base)',
      symbol: 'USDC',
      network: 'Base',
      balance: balance.usdcBase,
      rate: 1600,
      minAmount: 1,
      logo: '/usd-coin-usdc-logo.svg',
      networkLogo: '/BASE.png',
    },
    {
      id: 'sol' as AssetId,
      name: 'Solana',
      symbol: 'SOL',
      network: 'Solana',
      balance: balance.sol,
      rate: 250000,
      minAmount: 0.01,
      logo: '/solana-sol-logo.svg',
      networkLogo: '/solana-sol-logo.svg',
    },
    {
      id: 'usdt-solana' as AssetId,
      name: 'USDT (Solana)',
      symbol: 'USDT',
      network: 'Solana',
      balance: balance.usdtSolana,
      rate: 1600,
      minAmount: 1,
      logo: '/tether-usdt-logo.svg',
      networkLogo: '/solana-sol-logo.svg',
    },
  ];

  const currentAsset = assets.find(a => a.id === selectedAsset) || assets[0];
  const nairaAmount = amount ? parseFloat(amount) * currentAsset.rate : 0;
  const feeBps = kycTier >= 2 ? 0.008 : 0.01; // 0.8% for tier 2, 1% otherwise
  const fee = nairaAmount * feeBps;
  const youReceive = nairaAmount - fee;

  const dailyRemaining = limits.daily.limit - limits.daily.used;
  const exceedsLimit = youReceive > dailyRemaining;

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

    // Simulate processing
    setTimeout(() => {
      const bankAccount = bankAccounts.find(b => b.id === selectedBank);
      const transaction = {
        id: `TXN${Date.now()}`,
        type: 'offramp',
        crypto: currentAsset.symbol,
        network: currentAsset.network,
        amount: parseFloat(amount),
        nairaAmount: youReceive,
        rate: currentAsset.rate,
        fee: fee,
        status: 'processing',
        date: new Date().toISOString(),
        bankAccountId: selectedBank,
        bankAccount: bankAccount,
        confirmations: 0,
        requiredConfirmations: currentAsset.network === 'Solana' ? 1 : 12,
      };

      onOfframpSuccess(transaction);
      toast.success('Off-ramp initiated successfully!');
      setIsProcessing(false);
      setAmount('');
      setSelectedBank('');
      setQuoteLockTime(120);
    }, 2000);
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
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">You get</span>
                  <span className="text-gray-900">₦{nairaAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Fee ({(feeBps * 100).toFixed(1)}%)</span>
                  <span className="text-gray-900">-₦{fee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t pt-2 flex items-center justify-between">
                  <span>You receive</span>
                  <span className={exceedsLimit ? 'text-red-600' : ''}>
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
