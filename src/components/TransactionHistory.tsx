/**
 * Transaction History Component
 * Displays all deposits with status, amount, and timestamp
 */

import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { ArrowLeft, ExternalLink, Clock, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useState, useEffect } from 'react';
import { depositsApi } from '../services/api';

interface Deposit {
  id: string;
  chain: string;
  asset: string;
  amount: string;
  tx_hash: string;
  status: 'detected' | 'confirming' | 'confirmed' | 'swept' | 'failed';
  detected_at: string;
  confirmed_at: string | null;
  swept_at: string | null;
  confirmations: number;
  required_confirmations: number;
  from_address: string | null;
}

interface TransactionHistoryProps {
  onBack: () => void;
}

export function TransactionHistory({ onBack }: TransactionHistoryProps) {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await depositsApi.getHistory();
      setDeposits(response.deposits);
    } catch (err: any) {
      console.error('Failed to load transaction history:', err);
      setError(err.message || 'Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'swept':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'confirming':
      case 'detected':
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'detected':
        return 'Detected';
      case 'confirming':
        return 'Confirming';
      case 'confirmed':
        return 'Confirmed';
      case 'swept':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'swept':
        return 'text-green-600 bg-green-50';
      case 'confirming':
      case 'detected':
        return 'text-blue-600 bg-blue-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getExplorerUrl = (chain: string, txHash: string) => {
    if (chain === 'solana') {
      return `https://solscan.io/tx/${txHash}`;
    } else if (chain === 'base') {
      return `https://basescan.org/tx/${txHash}`;
    }
    return '#';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const getAssetLogo = (asset: string) => {
    switch (asset.toUpperCase()) {
      case 'USDC':
        return '/usd-coin-usdc-logo.svg';
      case 'USDT':
        return '/tether-usdt-logo.svg';
      case 'SOL':
        return '/solana-sol-logo.svg';
      case 'ETH':
        return '/ethereum-eth-logo.svg';
      default:
        return '/usd-coin-usdc-logo.svg';
    }
  };

  const getNetworkLogo = (chain: string) => {
    switch (chain.toLowerCase()) {
      case 'solana':
        return '/solana-sol-logo.svg';
      case 'base':
        return '/BASE.png';
      default:
        return '/solana-sol-logo.svg';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold text-gray-900">Transaction History</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        )}

        {error && (
          <Card className="p-4 bg-red-50 border-red-200">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm">{error}</p>
            </div>
            <Button
              onClick={loadHistory}
              className="mt-3 w-full"
              variant="outline"
            >
              Retry
            </Button>
          </Card>
        )}

        {!loading && !error && deposits.length === 0 && (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <Clock className="w-12 h-12 text-gray-300" />
              <p className="text-gray-500">No transactions yet</p>
              <p className="text-sm text-gray-400">
                Your deposit history will appear here
              </p>
            </div>
          </Card>
        )}

        {!loading && !error && deposits.map((deposit) => (
          <motion.div
            key={deposit.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                {/* Asset Icon */}
                <div className="relative flex-shrink-0">
                  <img
                    src={getAssetLogo(deposit.asset)}
                    alt={deposit.asset}
                    className="w-10 h-10 rounded-full"
                  />
                  <img
                    src={getNetworkLogo(deposit.chain)}
                    alt={deposit.chain}
                    className="w-5 h-5 rounded-full absolute -bottom-1 -right-1 border-2 border-white"
                  />
                </div>

                {/* Transaction Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">
                        Deposit {deposit.asset}
                      </p>
                      <p className="text-sm text-gray-500 capitalize">
                        {deposit.chain} Network
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        +{parseFloat(deposit.amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 6,
                        })} {deposit.asset}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(deposit.detected_at)}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(deposit.status)}`}>
                      {getStatusIcon(deposit.status)}
                      {getStatusText(deposit.status)}
                    </span>
                    {deposit.status === 'confirming' && (
                      <span className="text-xs text-gray-500">
                        {deposit.confirmations}/{deposit.required_confirmations} confirmations
                      </span>
                    )}
                  </div>

                  {/* Transaction Hash */}
                  <div className="mt-2">
                    <a
                      href={getExplorerUrl(deposit.chain, deposit.tx_hash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                    >
                      <span className="font-mono">
                        {deposit.tx_hash.slice(0, 8)}...{deposit.tx_hash.slice(-8)}
                      </span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

