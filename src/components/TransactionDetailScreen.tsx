import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ExternalLink,
  Copy,
  Download
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

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
const getAssetLogo = (crypto: string): string => {
  const cryptoUpper = crypto?.toUpperCase();

  if (cryptoUpper === 'USDC') return '/usd-coin-usdc-logo.svg';
  if (cryptoUpper === 'SOL') return '/solana-sol-logo.svg';
  if (cryptoUpper === 'USDT') return '/tether-usdt-logo.svg';
  if (cryptoUpper === 'ETH') return '/ethereum-eth-logo.svg';

  return '/usd-coin-usdc-logo.svg';
};

// Get network logo
const getNetworkLogo = (network?: string): string => {
  const networkLower = network?.toLowerCase();

  if (networkLower === 'solana') return '/solana-sol-logo.svg';
  if (networkLower === 'base') return '/BASE.png';
  if (networkLower === 'ethereum') return '/ethereum-eth-logo.svg';

  return '/solana-sol-logo.svg';
};

interface TransactionDetailScreenProps {
  transaction: {
    id: string;
    type: 'deposit' | 'offramp';
    crypto?: string;
    amount: number;
    nairaAmount?: number;
    status: 'pending' | 'confirming' | 'quoting' | 'converting' | 'payout_pending' | 'completed' | 'failed';
    date: string;
    txHash?: string;
    network?: string;
    fromAddress?: string;
    toAddress?: string;
    confirmations?: number;
    requiredConfirmations?: number;
    rate?: number;
    fee?: number;
    bankAccount?: {
      bankName: string;
      accountNumber: string;
      accountName: string;
    };
    payoutReference?: string;
    errorReason?: string;
  };
  onBack: () => void;
}

export function TransactionDetailScreen({ transaction, onBack }: TransactionDetailScreenProps) {
  const getStatusInfo = () => {
    switch (transaction.status) {
      case 'pending':
        return {
          icon: Clock,
          color: 'bg-gray-100 text-gray-700',
          label: 'Pending',
          description: 'Transaction initiated',
        };
      case 'confirming':
        return {
          icon: Clock,
          color: 'bg-blue-100 text-blue-700',
          label: 'Confirming',
          description: `Waiting for ${transaction.requiredConfirmations} confirmations`,
        };
      case 'quoting':
        return {
          icon: Clock,
          color: 'bg-blue-100 text-blue-700',
          label: 'Quoting',
          description: 'Getting best exchange rate',
        };
      case 'converting':
        return {
          icon: Clock,
          color: 'bg-blue-100 text-blue-700',
          label: 'Converting',
          description: 'Converting crypto to Naira',
        };
      case 'payout_pending':
        return {
          icon: Clock,
          color: 'bg-yellow-100 text-yellow-700',
          label: 'Payout Pending',
          description: 'Processing bank transfer',
        };
      case 'completed':
        return {
          icon: CheckCircle2,
          color: 'bg-green-100 text-green-700',
          label: 'Completed',
          description: 'Transaction successful',
        };
      case 'failed':
        return {
          icon: XCircle,
          color: 'bg-red-100 text-red-700',
          label: 'Failed',
          description: transaction.errorReason || 'Transaction failed',
        };
      default:
        return {
          icon: Clock,
          color: 'bg-gray-100 text-gray-700',
          label: 'Unknown',
          description: 'Processing',
        };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied!`);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const timeline = [
    {
      label: 'Initiated',
      completed: true,
      time: formatDate(transaction.date),
    },
    {
      label: 'Confirming',
      completed: ['confirming', 'quoting', 'converting', 'payout_pending', 'completed'].includes(transaction.status),
      time: transaction.confirmations ? `${transaction.confirmations}/${transaction.requiredConfirmations} confirmations` : '',
    },
    {
      label: 'Converting',
      completed: ['converting', 'payout_pending', 'completed'].includes(transaction.status),
      time: '',
    },
    {
      label: 'Payout',
      completed: ['completed'].includes(transaction.status),
      time: transaction.status === 'completed' ? 'Paid' : '',
    },
  ];

  return (
    <div className="pb-safe-nav bg-white min-h-screen">
      <div className="px-6 pb-6" style={{ paddingTop: `calc(3rem + env(safe-area-inset-top))` }}>
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h1 className="text-gray-900 mb-2">Transaction Details</h1>
          <p className="text-gray-500">ID: {transaction.id}</p>
        </motion.div>
      </div>

      <div className="px-6 space-y-4">
        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${statusInfo.color}`}>
                  <StatusIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="mb-1">{statusInfo.label}</h3>
                  <p className="text-gray-600">{statusInfo.description}</p>
                </div>
              </div>
            </div>

            {transaction.status === 'confirming' && transaction.confirmations !== undefined && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-600">Confirmations</p>
                  <p className="text-gray-900">{transaction.confirmations}/{transaction.requiredConfirmations}</p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(transaction.confirmations / (transaction.requiredConfirmations || 1)) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </Card>
        </motion.div>

        {/* Timeline */}
        {transaction.type === 'offramp' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6 border border-gray-100">
              <h3 className="mb-4">Progress</h3>
              <div className="space-y-4">
                {timeline.map((step, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        step.completed ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        {step.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <div className="w-2 h-2 bg-gray-400 rounded-full" />
                        )}
                      </div>
                      {index < timeline.length - 1 && (
                        <div className={`w-0.5 h-8 ${step.completed ? 'bg-green-200' : 'bg-gray-200'}`} />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className={`mb-1 ${step.completed ? 'text-gray-900' : 'text-gray-500'}`}>
                        {step.label}
                      </p>
                      {step.time && (
                        <p className="text-gray-600">{step.time}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Amount Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border border-gray-200 bg-white">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  transaction.type === 'deposit'
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                    : 'bg-gradient-to-br from-purple-500 to-purple-600'
                }`}>
                  <img
                    src={getAssetLogo(transaction.crypto || 'USDC')}
                    alt={transaction.crypto}
                    className="w-6 h-6"
                  />
                </div>
                <div>
                  <h3 className="text-gray-900 font-bold text-lg">Amount Details</h3>
                  <p className="text-gray-600 text-sm">Transaction breakdown</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-600 text-sm">Crypto Amount</p>
                  <p className="text-gray-900 font-bold">
                    {formatCryptoAmount(transaction.amount, transaction.crypto || 'USDC')} {transaction.crypto}
                  </p>
                </div>

                {transaction.rate && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-600 text-sm">Exchange Rate</p>
                    <p className="text-gray-900 font-semibold">
                      ₦{transaction.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                )}

                {transaction.nairaAmount && (
                  <>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-600 text-sm">Naira Amount</p>
                      <p className="text-gray-900 font-bold">
                        ₦{transaction.nairaAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    {transaction.fee && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <p className="text-gray-600 text-sm">Platform Fee</p>
                        <p className="text-gray-900 font-semibold">
                          -₦{transaction.fee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg mt-4">
                      <p className="text-white font-semibold">You Receive</p>
                      <p className="text-white font-bold text-lg">
                        ₦{((transaction.nairaAmount || 0) - (transaction.fee || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Transaction Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-6 border-0 shadow-md bg-white">
            <h3 className="mb-4 text-gray-900 font-bold">Transaction Information</h3>
            <div className="space-y-4">
              <div>
                <p className="text-gray-600 mb-2 font-semibold text-sm">Transaction ID</p>
                <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-xl border border-gray-200">
                  <p className="text-gray-900 break-all font-mono text-sm">{transaction.id}</p>
                  <button
                    onClick={() => copyToClipboard(transaction.id, 'Transaction ID')}
                    className="ml-2 text-gray-600 hover:text-gray-900 p-2 hover:bg-white rounded-lg transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {transaction.txHash && (
                <div>
                  <p className="text-gray-600 mb-2 font-semibold text-sm">Transaction Hash</p>
                  <div className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-xl border border-gray-200">
                    <p className="text-gray-900 break-all font-mono text-xs">{transaction.txHash}</p>
                    <div className="flex items-center gap-2 ml-2">
                      <button
                        onClick={() => copyToClipboard(transaction.txHash!, 'Transaction hash')}
                        className="text-gray-600 hover:text-gray-900 p-2 hover:bg-white rounded-lg transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <a
                        href={`https://${transaction.network === 'solana' ? 'solscan.io' : 'basescan.org'}/tx/${transaction.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-600 hover:text-gray-900 p-2 hover:bg-white rounded-lg transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-gray-600 mb-2 font-semibold text-sm">Network</p>
                  <div className="flex items-center gap-2">
                    <img
                      src={getNetworkLogo(transaction.network)}
                      alt={transaction.network}
                      className="w-5 h-5 rounded-full"
                    />
                    <p className="text-gray-900 font-bold capitalize">{transaction.network}</p>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100">
                  <p className="text-gray-600 mb-2 font-semibold text-sm">Date</p>
                  <p className="text-gray-900 font-bold">{new Date(transaction.date).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Bank Details */}
        {transaction.bankAccount && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="p-6 border border-gray-100">
              <h3 className="mb-4">Bank Account</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-gray-600">Bank Name</p>
                  <p className="text-gray-900">{transaction.bankAccount.bankName}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-gray-600">Account Number</p>
                  <p className="text-gray-900">{transaction.bankAccount.accountNumber}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-gray-600">Account Name</p>
                  <p className="text-gray-900">{transaction.bankAccount.accountName}</p>
                </div>
                {transaction.payoutReference && (
                  <div>
                    <p className="text-gray-600 mb-1">Payout Reference</p>
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <p className="text-gray-900">{transaction.payoutReference}</p>
                      <button
                        onClick={() => copyToClipboard(transaction.payoutReference!, 'Reference')}
                        className="ml-2 text-gray-600 hover:text-gray-900"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Error Info */}
        {transaction.status === 'failed' && transaction.errorReason && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="p-6 border border-red-100 bg-red-50">
              <div className="flex gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                <div>
                  <p className="text-red-900 mb-1">Transaction Failed</p>
                  <p className="text-red-800">{transaction.errorReason}</p>
                  <Button variant="outline" className="mt-3 border-red-600 text-red-600">
                    Contact Support
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Actions */}
        {transaction.status === 'completed' && (
          <Button className="w-full" variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download Receipt
          </Button>
        )}
      </div>
    </div>
  );
}
