import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, XCircle, Wallet } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

// Helper to format crypto amounts properly (no scientific notation)
const formatCryptoAmount = (amount: number, symbol: string): string => {
  if (!amount || amount === 0 || isNaN(amount)) return '0.00';

  // For very small amounts (< 0.0001), show more decimals
  if (amount < 0.0001) {
    const formatted = amount.toFixed(8).replace(/\.?0+$/, '');
    return formatted === '0' ? '0.00' : formatted;
  }

  // For normal amounts, show appropriate decimals
  if (amount < 1) {
    const formatted = amount.toFixed(6).replace(/\.?0+$/, '');
    return formatted === '0' ? '0.00' : formatted;
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
  console.log('📊 TransactionsScreen - All transactions:', transactions);
  console.log('📊 Total transactions:', transactions.length);
  console.log('📊 Deposits:', transactions.filter(t => t.type === 'deposit').length);
  console.log('📊 Offramps:', transactions.filter(t => t.type === 'offramp').length);

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

    console.log('Transaction card data:', {
      id: transaction.id,
      type: transaction.type,
      crypto: transaction.crypto,
      amount: transaction.amount,
      nairaAmount: transaction.nairaAmount
    });

    return (
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: index * 0.05 }}
      >
        <Card
          className="relative overflow-hidden border border-gray-200 hover:border-gray-300 transition-all cursor-pointer bg-white"
          onClick={() => onViewTransaction && onViewTransaction(transaction)}
        >
          <div className="p-4">
            <div className="flex items-center justify-between">
              {/* Left side: Icon + Info */}
              <div className="flex items-center gap-3">
                {/* Asset Icon - SMALLER */}
                <div className="relative flex-shrink-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isDeposit
                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                      : 'bg-gradient-to-br from-purple-500 to-purple-600'
                  }`}>
                    <img
                      src={assetLogo}
                      alt={transaction.crypto}
                      className="w-5 h-5"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                  {/* Network badge - SMALLER */}
                  {transaction.network && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-200">
                      <img src={networkLogo} alt={transaction.network} className="w-2.5 h-2.5" />
                    </div>
                  )}
                </div>

                {/* Transaction Info */}
                <div>
                  <p className="text-gray-900 font-semibold text-sm mb-0.5">
                    {isDeposit ? 'Deposit' : 'Off-ramp'} {transaction.crypto}
                  </p>
                  <p className="text-gray-500 text-xs">{formatDate(transaction.date)}</p>
                </div>
              </div>

              {/* Right side: Amount + Status */}
              <div className="text-right">
                <p className={`font-bold text-sm mb-1 ${
                  isDeposit ? 'text-emerald-600' : 'text-purple-600'
                }`}>
                  {isDeposit ? '+' : '-'}{formatCryptoAmount(transaction.amount, transaction.crypto || 'USDC')} {transaction.crypto}
                </p>
                {transaction.nairaAmount && (
                  <p className="text-gray-600 text-xs">
                    ₦{transaction.nairaAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <Badge className={`${getStatusColor(transaction.status)} flex items-center gap-1.5 px-2.5 py-0.5 text-xs`}>
                {getStatusIcon(transaction.status)}
                {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1).replace('_', ' ')}
              </Badge>

              {transaction.network && (
                <span className="text-xs text-gray-500 capitalize">{transaction.network}</span>
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
