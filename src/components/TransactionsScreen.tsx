import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, XCircle, Wallet } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

// Helper to format crypto amounts properly (no scientific notation)
const formatCryptoAmount = (amount: number, symbol: string): string => {
  if (amount === 0) return '0.00';

  // For very small amounts (< 0.0001), show more decimals
  if (amount < 0.0001) {
    return amount.toFixed(8).replace(/\.?0+$/, '');
  }

  // For normal amounts, show appropriate decimals
  if (amount < 1) {
    return amount.toFixed(6).replace(/\.?0+$/, '');
  }

  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  });
};

// Get asset logo
const getAssetLogo = (crypto: string, network?: string): string => {
  const cryptoUpper = crypto?.toUpperCase();

  if (cryptoUpper === 'USDC') {
    return '/usd-coin-usdc-logo.svg';
  } else if (cryptoUpper === 'SOL') {
    return '/solana-sol-logo.svg';
  } else if (cryptoUpper === 'USDT') {
    return '/tether-usdt-logo.svg';
  } else if (cryptoUpper === 'ETH') {
    return '/ethereum-eth-logo.svg';
  }

  return '/usd-coin-usdc-logo.svg'; // Fallback
};

// Get network logo
const getNetworkLogo = (network?: string): string => {
  const networkLower = network?.toLowerCase();

  if (networkLower === 'solana') {
    return '/solana-sol-logo.svg';
  } else if (networkLower === 'base') {
    return '/BASE.png';
  } else if (networkLower === 'ethereum') {
    return '/ethereum-eth-logo.svg';
  }

  return '/solana-sol-logo.svg'; // Fallback
};

interface Transaction {
  id: string;
  type: 'deposit' | 'offramp';
  crypto?: string;
  amount: number;
  nairaAmount?: number;
  status: 'pending' | 'confirming' | 'quoting' | 'converting' | 'payout_pending' | 'completed' | 'failed';
  date: string;
  bankAccountId?: string;
  network?: string;
  hash?: string;
}

interface TransactionsScreenProps {
  transactions: Transaction[];
  onViewTransaction?: (transaction: Transaction) => void;
}

export function TransactionsScreen({ transactions, onViewTransaction }: TransactionsScreenProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'pending':
      case 'confirming':
      case 'quoting':
      case 'converting':
      case 'payout_pending':
      case 'processing':
        return <Clock className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'pending':
      case 'confirming':
      case 'quoting':
      case 'converting':
      case 'payout_pending':
      case 'processing':
        return 'bg-yellow-100 text-yellow-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const allTransactions = transactions.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const deposits = allTransactions.filter(t => t.type === 'deposit');
  const offramps = allTransactions.filter(t => t.type === 'offramp');

  const TransactionCard = ({ transaction, index }: { transaction: Transaction; index: number }) => {
    const isDeposit = transaction.type === 'deposit';
    const assetLogo = getAssetLogo(transaction.crypto || 'USDC', transaction.network);
    const networkLogo = getNetworkLogo(transaction.network);

    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: index * 0.05 }}
      >
        <Card
          className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all cursor-pointer"
          onClick={() => onViewTransaction && onViewTransaction(transaction)}
          style={{
            background: isDeposit
              ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
              : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent pointer-events-none" />

          <div className="relative p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                <div className="relative">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                    isDeposit ? 'bg-green-500' : 'bg-yellow-500'
                  }`}>
                    <img
                      src={assetLogo}
                      alt={transaction.crypto}
                      className="w-7 h-7 rounded-full"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                  {transaction.network && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100">
                      <img src={networkLogo} alt={transaction.network} className="w-3 h-3 rounded-full" />
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-gray-900 font-bold text-base mb-0.5">
                    {isDeposit ? 'Deposit' : 'Off-ramp'} {transaction.crypto}
                  </p>
                  <p className="text-gray-600 text-sm font-medium">{formatDate(transaction.date)}</p>
                  <p className="text-gray-400 text-xs mt-1 font-mono">
                    ID: {transaction.id.substring(0, 8)}...{transaction.id.substring(transaction.id.length - 8)}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className={`font-bold text-lg mb-1 ${isDeposit ? 'text-green-700' : 'text-yellow-800'}`}>
                  {isDeposit ? '+' : ''}{formatCryptoAmount(transaction.amount, transaction.crypto || 'USDC')} {transaction.crypto}
                </p>
                {transaction.nairaAmount && (
                  <p className="text-gray-700 text-sm font-semibold">
                    ₦{transaction.nairaAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Badge className={`${getStatusColor(transaction.status)} flex items-center gap-1.5 px-3 py-1 font-semibold`}>
                {getStatusIcon(transaction.status)}
                {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1).replace('_', ' ')}
              </Badge>

              {transaction.network && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/60 rounded-full">
                  <img src={networkLogo} alt={transaction.network} className="w-3.5 h-3.5 rounded-full" />
                  <span className="text-xs font-semibold text-gray-700 capitalize">{transaction.network}</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="pb-safe-nav bg-white min-h-screen">
      <div className="px-6 pb-6" style={{ paddingTop: `calc(3rem + env(safe-area-inset-top))` }}>
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <h1 className="text-gray-900 mb-2">Transactions</h1>
          <p className="text-gray-500">Your transaction history</p>
        </motion.div>
      </div>

      <div className="px-6">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="deposits">Deposits</TabsTrigger>
            <TabsTrigger value="offramps">Off-ramps</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3">
            {allTransactions.length === 0 ? (
              <Card className="p-8 text-center border border-gray-100">
                <p className="text-gray-600 mb-1">No transactions yet</p>
                <p className="text-gray-500">Your transactions will appear here</p>
              </Card>
            ) : (
              allTransactions.map((transaction, index) => (
                <TransactionCard key={transaction.id} transaction={transaction} index={index} />
              ))
            )}
          </TabsContent>

          <TabsContent value="deposits" className="space-y-3">
            {deposits.length === 0 ? (
              <Card className="p-8 text-center border border-gray-100">
                <p className="text-gray-600 mb-1">No deposits yet</p>
                <p className="text-gray-500">Deposit crypto to get started</p>
              </Card>
            ) : (
              deposits.map((transaction, index) => (
                <TransactionCard key={transaction.id} transaction={transaction} index={index} />
              ))
            )}
          </TabsContent>

          <TabsContent value="offramps" className="space-y-3">
            {offramps.length === 0 ? (
              <Card className="p-8 text-center border border-gray-100">
                <p className="text-gray-600 mb-1">No off-ramps yet</p>
                <p className="text-gray-500">Convert your crypto to Naira</p>
              </Card>
            ) : (
              offramps.map((transaction, index) => (
                <TransactionCard key={transaction.id} transaction={transaction} index={index} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
