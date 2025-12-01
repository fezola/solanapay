import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Phone, Smartphone, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
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

// Nigerian network operator logos
const OPERATOR_LOGOS: Record<string, string> = {
  'MTN Nigeria': '/mtn-logo.png',
  'Airtel Nigeria': '/airtel-logo.png',
  'Glo': '/glo-logo.png',
  '9mobile': '/9mobile-logo.png',
  '9mobile (Etisalat)': '/9mobile-logo.png',
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
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-16">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Airtime Sent!</h2>
        <p className="text-gray-600 mb-4">₦{amount} airtime sent to {phoneNumber}</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Buy Airtime & Data</h1>
        <p className="text-gray-600 mt-1">Pay with crypto, receive instantly</p>
      </div>

      {/* Bill Type Toggle */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
        <button
          onClick={() => setBillType('airtime')}
          className={`flex-1 py-3 rounded-lg font-medium transition-all ${billType === 'airtime' ? 'bg-white shadow text-indigo-600' : 'text-gray-600'}`}
        >
          <Phone className="w-4 h-4 inline mr-2" />
          Airtime
        </button>
        <button
          onClick={() => setBillType('data')}
          className={`flex-1 py-3 rounded-lg font-medium transition-all ${billType === 'data' ? 'bg-white shadow text-indigo-600' : 'text-gray-600'}`}
        >
          <Smartphone className="w-4 h-4 inline mr-2" />
          Data
        </button>
      </div>

      <Card className="p-6 space-y-5">
        {/* Phone Number */}
        <div className="space-y-2">
          <Label>Phone Number</Label>
          <div className="relative">
            <Input
              type="tel"
              placeholder="08012345678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
              className="h-14 text-lg pl-4 pr-12"
            />
            {isDetectingOperator && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-gray-400" />
            )}
          </div>
        </div>

        {/* Network Operator */}
        <div className="space-y-2">
          <Label>Network</Label>
          {isLoadingOperators ? (
            <div className="h-14 bg-gray-100 rounded-xl animate-pulse" />
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {operators.filter(op => op.supportsAirtime).slice(0, 4).map((op) => (
                <button
                  key={op.id}
                  onClick={() => setSelectedOperator(op.id)}
                  className={`p-3 rounded-xl border-2 transition-all ${selectedOperator === op.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <img src={OPERATOR_LOGOS[op.name] || op.logo || '/placeholder.png'} alt={op.name} className="w-10 h-10 mx-auto object-contain" />
                  <p className="text-xs text-center mt-1 font-medium truncate">{op.name.replace(' Nigeria', '')}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <Label>Amount (₦)</Label>
          <Input
            type="number"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-14 text-lg"
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => setAmount(amt.toString())}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${amount === amt.toString() ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                ₦{amt.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Asset */}
        <div className="space-y-2">
          <Label>Pay with</Label>
          <Select value={selectedPaymentAsset} onValueChange={(v) => setSelectedPaymentAsset(v as PaymentAsset)}>
            <SelectTrigger className="h-16 rounded-xl">
              <SelectValue>
                <div className="flex items-center gap-4">
                  <div className="relative w-10 h-10 flex-shrink-0">
                    <img src={currentPaymentAsset.logo} className="w-10 h-10 rounded-full" />
                    <img src={currentPaymentAsset.networkLogo} className="w-4 h-4 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">{currentPaymentAsset.name} ({currentPaymentAsset.network})</p>
                    <p className="text-sm text-gray-500">Balance: {currentBalance.toFixed(2)}</p>
                  </div>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-xl p-2 min-w-[320px]">
              {PAYMENT_ASSETS.map((asset) => (
                <SelectItem key={asset.id} value={asset.id} className="rounded-lg py-3 px-3">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <img src={asset.logo} className="w-8 h-8 rounded-full" />
                      <img src={asset.networkLogo} className="w-4 h-4 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-white" />
                    </div>
                    <div>
                      <p className="font-medium">{asset.name} ({asset.network})</p>
                      <p className="text-sm text-gray-500">{getBalance(asset.id).toFixed(2)} available</p>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary */}
        {amount && parseFloat(amount) > 0 && (
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">You pay</span>
              <span className="font-medium">~{cryptoAmount.toFixed(4)} {currentPaymentAsset.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Recipient gets</span>
              <span className="font-medium">₦{parseFloat(amount).toLocaleString()} airtime</span>
            </div>
          </div>
        )}

        {/* Purchase Button */}
        <Button
          onClick={handlePurchase}
          disabled={isLoading || !selectedOperator || !phoneNumber || !amount || cryptoAmount > currentBalance}
          className="w-full h-14 text-lg font-semibold bg-indigo-600 hover:bg-indigo-700"
        >
          {isLoading ? (
            <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Processing...</>
          ) : cryptoAmount > currentBalance ? (
            'Insufficient Balance'
          ) : (
            `Buy ₦${amount || '0'} Airtime`
          )}
        </Button>
      </Card>
    </motion.div>
  );
}

