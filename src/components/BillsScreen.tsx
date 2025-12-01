import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Phone, Wifi, Loader2, CheckCircle, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { billsApi } from '../services/api';

interface BillsScreenProps {
  balance: {
    usdcSolana: number;
    usdcBase: number;
    usdcPolygon: number;
    usdtSolana: number;
    usdtBase: number;
    usdtPolygon: number;
  };
}

interface Operator {
  id: number;
  name: string;
  logo: string | null;
  supportsData: boolean;
  supportsAirtime: boolean;
  minAmount: number | null;
  maxAmount: number | null;
  fixedAmounts: number[];
}

type PaymentAsset = 'usdc-solana' | 'usdc-base' | 'usdc-polygon' | 'usdt-solana' | 'usdt-base' | 'usdt-polygon';

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

const PAYMENT_ASSETS = [
  { id: 'usdc-solana' as PaymentAsset, name: 'USDC', network: 'Solana', logo: '/usd-coin-usdc-logo.svg', networkLogo: '/solana-sol-logo.svg' },
  { id: 'usdc-base' as PaymentAsset, name: 'USDC', network: 'Base', logo: '/usd-coin-usdc-logo.svg', networkLogo: '/BASE.png' },
  { id: 'usdc-polygon' as PaymentAsset, name: 'USDC', network: 'Polygon', logo: '/usd-coin-usdc-logo.svg', networkLogo: '/polygon-matic-logo.svg' },
  { id: 'usdt-solana' as PaymentAsset, name: 'USDT', network: 'Solana', logo: '/tether-usdt-logo.svg', networkLogo: '/solana-sol-logo.svg' },
  { id: 'usdt-base' as PaymentAsset, name: 'USDT', network: 'Base', logo: '/tether-usdt-logo.svg', networkLogo: '/BASE.png' },
  { id: 'usdt-polygon' as PaymentAsset, name: 'USDT', network: 'Polygon', logo: '/tether-usdt-logo.svg', networkLogo: '/polygon-matic-logo.svg' },
];

// Nigerian network operator logos - using online URLs as fallback
const OPERATOR_LOGOS: Record<string, string> = {
  'MTN Nigeria': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/New-mtn-logo.svg/120px-New-mtn-logo.svg.png',
  'MTN': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/New-mtn-logo.svg/120px-New-mtn-logo.svg.png',
  'Airtel Nigeria': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Airtel_logo.svg/120px-Airtel_logo.svg.png',
  'Airtel': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Airtel_logo.svg/120px-Airtel_logo.svg.png',
  'Glo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Globacom_Limited_Logo.svg/120px-Globacom_Limited_Logo.svg.png',
  'Globacom Nigeria': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Globacom_Limited_Logo.svg/120px-Globacom_Limited_Logo.svg.png',
  '9mobile': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/9mobile_logo.svg/120px-9mobile_logo.svg.png',
  '9mobile (Etisalat)': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/9mobile_logo.svg/120px-9mobile_logo.svg.png',
};

// Get operator display name
const getOperatorDisplayName = (name: string): string => {
  if (name.toLowerCase().includes('mtn')) return 'MTN';
  if (name.toLowerCase().includes('airtel')) return 'Airtel';
  if (name.toLowerCase().includes('glo')) return 'Glo';
  if (name.toLowerCase().includes('9mobile') || name.toLowerCase().includes('etisalat')) return '9Mobile';
  return name;
};

// Get operator logo
const getOperatorLogo = (name: string, apiLogo: string | null): string => {
  // First try our predefined logos
  for (const [key, logo] of Object.entries(OPERATOR_LOGOS)) {
    if (name.toLowerCase().includes(key.toLowerCase().split(' ')[0])) {
      return logo;
    }
  }
  // Fall back to API logo
  return apiLogo || '';
};

export function BillsScreen({ balance }: BillsScreenProps) {
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedOperator, setSelectedOperator] = useState<number | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedPaymentAsset, setSelectedPaymentAsset] = useState<PaymentAsset>('usdc-solana');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOperators, setIsLoadingOperators] = useState(true);
  const [isDetectingOperator, setIsDetectingOperator] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [billType, setBillType] = useState<'airtime' | 'data'>('airtime');

  // Fetch operators on mount
  useEffect(() => {
    const fetchOperators = async () => {
      try {
        const response = await billsApi.getOperators();
        setOperators(response.operators);
      } catch (error) {
        console.error('Failed to fetch operators:', error);
        toast.error('Failed to load network operators');
      } finally {
        setIsLoadingOperators(false);
      }
    };
    fetchOperators();
  }, []);

  // Auto-detect operator when phone number is complete
  useEffect(() => {
    const detectOperator = async () => {
      if (phoneNumber.length >= 11) {
        setIsDetectingOperator(true);
        try {
          const result = await billsApi.detectOperator(phoneNumber);
          setSelectedOperator(result.operator_id);
          toast.success(`Detected: ${result.name}`);
        } catch (error) {
          console.error('Failed to detect operator:', error);
        } finally {
          setIsDetectingOperator(false);
        }
      }
    };
    detectOperator();
  }, [phoneNumber]);

  const getBalance = (assetId: PaymentAsset): number => {
    const balanceMap: Record<PaymentAsset, number> = {
      'usdc-solana': balance.usdcSolana,
      'usdc-base': balance.usdcBase,
      'usdc-polygon': balance.usdcPolygon,
      'usdt-solana': balance.usdtSolana,
      'usdt-base': balance.usdtBase,
      'usdt-polygon': balance.usdtPolygon,
    };
    return balanceMap[assetId] || 0;
  };

  const handlePurchase = async () => {
    if (!selectedOperator || !phoneNumber || !amount) {
      toast.error('Please fill in all fields');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 50) {
      toast.error('Minimum amount is ₦50');
      return;
    }

    setIsLoading(true);
    setPurchaseStatus('processing');

    try {
      const [asset, chain] = selectedPaymentAsset.split('-');
      const result = await billsApi.purchaseAirtime({
        phone_number: phoneNumber,
        amount_ngn: amountNum,
        operator_id: selectedOperator,
        crypto_asset: asset.toUpperCase() as 'USDC' | 'USDT',
        crypto_chain: chain as 'solana' | 'base' | 'polygon',
      });

      setPurchaseStatus('success');
      toast.success(`Airtime sent to ${phoneNumber}!`);
      
      // Reset form after success
      setTimeout(() => {
        setPhoneNumber('');
        setAmount('');
        setPurchaseStatus('idle');
      }, 3000);
    } catch (error: any) {
      setPurchaseStatus('error');
      toast.error(error.message || 'Failed to purchase airtime');
    } finally {
      setIsLoading(false);
    }
  };

  const currentPaymentAsset = PAYMENT_ASSETS.find(a => a.id === selectedPaymentAsset)!;
  const currentBalance = getBalance(selectedPaymentAsset);
  const usdRate = 1600; // NGN per USD
  const cryptoAmount = amount ? parseFloat(amount) / usdRate : 0;

  if (purchaseStatus === 'success') {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-16 px-6">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Airtime Sent!</h2>
        <p className="text-gray-600 mb-4">₦{amount} airtime sent to {phoneNumber}</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-4 py-6 space-y-5">
      {/* Header */}
      <div className="text-center pt-2">
        <h1 className="text-xl font-bold text-gray-900">Buy Airtime & Data</h1>
        <p className="text-gray-500 text-sm mt-1">Pay with crypto, receive instantly</p>
      </div>

      {/* Bill Type Toggle - Compact */}
      <div className="flex p-1 bg-gray-100 rounded-xl">
        <button
          onClick={() => setBillType('airtime')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${billType === 'airtime' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
        >
          <Phone className="w-4 h-4" />
          <span>Airtime</span>
        </button>
        <button
          onClick={() => setBillType('data')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${billType === 'data' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500'}`}
        >
          <Wifi className="w-4 h-4" />
          <span>Data</span>
        </button>
      </div>

      <Card className="p-5 space-y-5 border-0 shadow-sm">
        {/* Phone Number */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Phone Number</Label>
          <div className="relative">
            <Input
              type="tel"
              placeholder="08012345678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
              className="h-12 text-base pl-4 pr-12 rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
            />
            {isDetectingOperator && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-gray-400" />
            )}
          </div>
        </div>

        {/* Network Operator */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">Network</Label>
          {isLoadingOperators ? (
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {operators.slice(0, 4).map((op) => {
                const isSelected = selectedOperator === op.id;
                const logoUrl = getOperatorLogo(op.name, op.logo);
                const displayName = getOperatorDisplayName(op.name);

                return (
                  <button
                    key={op.id}
                    onClick={() => setSelectedOperator(op.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                        : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                    }`}
                  >
                    <div className="w-10 h-10 flex items-center justify-center mb-1.5">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={displayName}
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-xs font-bold">
                          {displayName.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className={`text-xs font-medium ${isSelected ? 'text-indigo-600' : 'text-gray-600'}`}>
                      {displayName}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Amount */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">Amount (₦)</Label>
          <Input
            type="number"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-12 text-base rounded-xl border-gray-200 focus:border-indigo-500 focus:ring-indigo-500"
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => setAmount(amt.toString())}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  amount === amt.toString()
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                ₦{amt.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Asset */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Pay with</Label>
          <Select value={selectedPaymentAsset} onValueChange={(v) => setSelectedPaymentAsset(v as PaymentAsset)}>
            <SelectTrigger className="h-14 rounded-xl border-gray-200 px-4">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="relative w-8 h-8 flex-shrink-0">
                    <img src={currentPaymentAsset.logo} alt="" className="w-8 h-8 rounded-full" />
                    <img src={currentPaymentAsset.networkLogo} alt="" className="w-3.5 h-3.5 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-white bg-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">{currentPaymentAsset.name} ({currentPaymentAsset.network})</p>
                    <p className="text-xs text-gray-500">Balance: {currentBalance.toFixed(2)}</p>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-xl overflow-hidden">
              {PAYMENT_ASSETS.map((asset) => (
                <SelectItem
                  key={asset.id}
                  value={asset.id}
                  className="py-3 px-4 cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-8 h-8 flex-shrink-0">
                      <img src={asset.logo} alt="" className="w-8 h-8 rounded-full" />
                      <img src={asset.networkLogo} alt="" className="w-3.5 h-3.5 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-white bg-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{asset.name} ({asset.network})</p>
                      <p className="text-xs text-gray-500">{getBalance(asset.id).toFixed(2)} available</p>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        {amount && parseFloat(amount) > 0 && (
          <div className="bg-indigo-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">You pay</span>
              <span className="font-semibold text-gray-900">~{cryptoAmount.toFixed(4)} {currentPaymentAsset.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Recipient gets</span>
              <span className="font-semibold text-gray-900">₦{parseFloat(amount).toLocaleString()} {billType}</span>
            </div>
          </div>
        )}

        {/* Purchase Button */}
        <button
          onClick={handlePurchase}
          disabled={isLoading || !selectedOperator || !phoneNumber || !amount || cryptoAmount > currentBalance}
          className="w-full h-12 text-base font-semibold rounded-xl text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: (isLoading || !selectedOperator || !phoneNumber || !amount || cryptoAmount > currentBalance) ? '#9CA3AF' : '#4F46E5' }}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : cryptoAmount > currentBalance ? (
            'Insufficient Balance'
          ) : !selectedOperator ? (
            'Select a network'
          ) : (
            `Buy ₦${amount || '0'} ${billType === 'airtime' ? 'Airtime' : 'Data'}`
          )}
        </button>
      </Card>
    </motion.div>
  );
}

