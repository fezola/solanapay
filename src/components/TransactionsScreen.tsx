import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface Transaction {
  id: string;
  type: 'deposit' | 'offramp';
  crypto?: string;
  amount: number;
  nairaAmount?: number;
  status: 'completed' | 'processing' | 'failed';
  date: string;
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

  const TransactionCard = ({ transaction, index }: { transaction: Transaction; index: number }) => (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card 
        className="p-4 border border-gray-100 cursor-pointer hover:border-gray-200 transition-colors"
        onClick={() => onViewTransaction && onViewTransaction(transaction)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              transaction.type === 'deposit' ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              {transaction.type === 'deposit' ? (
                <ArrowDownLeft className={`w-5 h-5 ${
                  transaction.type === 'deposit' ? 'text-green-600' : 'text-gray-700'
                }`} />
              ) : (
                <ArrowUpRight className="w-5 h-5 text-gray-700" />
              )}
            </div>
            <div>
              <p className="mb-1">
                {transaction.type === 'deposit' ? 'Deposit' : 'Off-ramp'} {transaction.crypto}
              </p>
              <p className="text-gray-600">{formatDate(transaction.date)}</p>
              <p className="text-gray-500 mt-1">ID: {transaction.id}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={transaction.type === 'deposit' ? 'text-green-600' : 'text-gray-900'}>
              {transaction.type === 'deposit' ? '+' : ''}{transaction.amount} {transaction.crypto}
            </p>
            {transaction.nairaAmount && (
              <p className="text-gray-600 mt-1">
                ≈ ₦{transaction.nairaAmount.toLocaleString()}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`${getStatusColor(transaction.status)} flex items-center gap-1`}>
            {getStatusIcon(transaction.status)}
            {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
          </Badge>
        </div>
      </Card>
    </motion.div>
  );

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
