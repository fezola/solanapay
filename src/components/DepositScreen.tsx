import { useState } from 'react';
import { motion } from 'motion/react';
import QRCode from 'react-qr-code';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { PageHeader } from './ui/page-header';
import { Copy, CheckCircle2, QrCode as QrCodeIcon, AlertTriangle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface DepositScreenProps {
  depositAddresses: {
    usdcSolana: string;
    usdcBase: string;
    sol: string;
    usdtSolana: string;
  };
  onBack: () => void;
}

export function DepositScreen({ depositAddresses, onBack }: DepositScreenProps) {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState('usdc-solana');

  const assets = [
    {
      id: 'usdc-solana',
      name: 'USDC',
      network: 'Solana',
      symbol: 'USDC',
      address: depositAddresses.usdcSolana,
      logo: '/usd-coin-usdc-logo.svg',
      networkLogo: '/solana-sol-logo.svg',
      confirmations: 1,
      minDeposit: 1,
      estimatedTime: '~30 seconds',
      warning: 'Only send USDC on Solana network (SPL token)',
      explorerUrl: 'https://solscan.io',
    },
    {
      id: 'usdc-base',
      name: 'USDC',
      network: 'Base',
      symbol: 'USDC',
      address: depositAddresses.usdcBase,
      logo: '/usd-coin-usdc-logo.svg',
      networkLogo: '/BASE.png',
      confirmations: 12,
      minDeposit: 1,
      estimatedTime: '~2 minutes',
      warning: 'Only send USDC on Base network (not Ethereum mainnet)',
      explorerUrl: 'https://basescan.org',
    },
    {
      id: 'sol',
      name: 'Solana',
      network: 'Solana',
      symbol: 'SOL',
      address: depositAddresses.sol,
      logo: '/solana-sol-logo.svg',
      networkLogo: '/solana-sol-logo.svg',
      confirmations: 1,
      minDeposit: 0.01,
      estimatedTime: '~30 seconds',
      warning: 'Only send SOL to this address',
      explorerUrl: 'https://solscan.io',
    },
    {
      id: 'usdt-solana',
      name: 'USDT',
      network: 'Solana',
      symbol: 'USDT',
      address: depositAddresses.usdtSolana,
      logo: '/tether-usdt-logo.svg',
      networkLogo: '/solana-sol-logo.svg',
      confirmations: 1,
      minDeposit: 1,
      estimatedTime: '~30 seconds',
      warning: 'Only send USDT on Solana network (SPL token)',
      explorerUrl: 'https://solscan.io',
    },
  ];

  const currentAsset = assets.find(a => a.id === selectedAsset) || assets[0];

  const copyToClipboard = async (address: string, assetId: string) => {
    let success = false;
    
    try {
      await navigator.clipboard.writeText(address);
      success = true;
    } catch (err) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = address;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) success = true;
      } catch (fallbackErr) {
        console.error('Copy failed');
      }
    }
    
    if (success) {
      setCopiedAddress(assetId);
      toast.success('Address copied to clipboard!');
      setTimeout(() => setCopiedAddress(null), 2000);
    } else {
      toast.error('Failed to copy. Please copy manually.');
    }
  };

  return (
    <div className="pb-24 bg-white min-h-screen">
      <PageHeader
        title="Deposit Crypto"
        description="Send crypto to your deposit addresses"
        onBack={onBack}
      />

      <div className="px-6 pb-6">
        {/* Asset Selection */}
        <div className="mb-6">
          <p className="text-gray-600 text-sm mb-3">Select Asset</p>
          <div className="grid grid-cols-4 gap-2">
            {assets.map((asset) => (
              <button
                key={asset.id}
                onClick={() => setSelectedAsset(asset.id)}
                className={`p-3 rounded-xl border-2 transition-all ${
                  selectedAsset === asset.id
                    ? 'border-gray-900 bg-gray-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <img
                      src={asset.logo}
                      alt={asset.symbol}
                      className="w-8 h-8 rounded-full"
                    />
                    <img
                      src={asset.networkLogo}
                      alt={asset.network}
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-white"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium text-gray-900">{asset.symbol}</p>
                    <p className="text-xs text-gray-500">{asset.network}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Asset Content */}
        <motion.div
          key={selectedAsset}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Asset Header */}
          <Card className="p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={currentAsset.logo}
                  alt={currentAsset.symbol}
                  className="w-12 h-12 rounded-full"
                />
                <img
                  src={currentAsset.networkLogo}
                  alt={currentAsset.network}
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white bg-white"
                />
              </div>
              <div className="flex-1">
                <h3 className="text-gray-900 font-semibold text-lg mb-0.5">{currentAsset.name}</h3>
                <p className="text-gray-600 text-sm">{currentAsset.network} Network</p>
              </div>
            </div>
          </Card>

          {/* QR Code Section */}
          <Card className="border border-gray-100 overflow-hidden">
            <button
              onClick={() => setShowQR(!showQR)}
              className="w-full p-4 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <QrCodeIcon className="w-5 h-5 text-gray-700" />
              <p className="text-gray-900 font-medium text-sm">
                {showQR ? 'Hide QR Code' : 'Show QR Code'}
              </p>
            </button>

            {showQR && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-gray-100"
              >
                <div className="p-6 bg-gray-50">
                  <div className="w-full max-w-[240px] mx-auto bg-white rounded-xl p-4 border-2 border-gray-200">
                    <QRCode
                      value={currentAsset.address}
                      size={208}
                      level="H"
                      style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    />
                  </div>
                  <p className="text-center text-xs text-gray-600 mt-3">
                    Scan to get {currentAsset.symbol} deposit address
                  </p>
                </div>
              </motion.div>
            )}
          </Card>

          {/* Deposit Address */}
          <Card className="p-4 border border-gray-100">
            <p className="text-gray-600 text-sm mb-3 font-medium">Deposit Address</p>
            <div className="bg-gray-50 p-3 rounded-lg mb-3">
              <p className="text-gray-900 text-xs break-all font-mono leading-relaxed">{currentAsset.address}</p>
            </div>
            <Button
              onClick={() => copyToClipboard(currentAsset.address, currentAsset.id)}
              className="w-full"
              variant={copiedAddress === currentAsset.id ? 'default' : 'outline'}
            >
              {copiedAddress === currentAsset.id ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Address
                </>
              )}
            </Button>
          </Card>

          {/* Network Info Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3 border border-gray-100">
              <p className="text-gray-600 text-xs mb-1">Confirmations</p>
              <p className="text-gray-900 font-semibold text-sm">{currentAsset.confirmations} block{currentAsset.confirmations > 1 ? 's' : ''}</p>
            </Card>
            <Card className="p-3 border border-gray-100">
              <p className="text-gray-600 text-xs mb-1">Est. Time</p>
              <p className="text-gray-900 font-semibold text-sm">{currentAsset.estimatedTime}</p>
            </Card>
          </div>

          <Card className="p-3 border border-gray-100">
            <p className="text-gray-600 text-xs mb-1">Minimum Deposit</p>
            <p className="text-gray-900 font-semibold text-sm">{currentAsset.minDeposit} {currentAsset.symbol}</p>
          </Card>

          {/* Warning */}
          <Card className="p-4 bg-yellow-50 border border-yellow-200">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-yellow-900 font-semibold mb-2 text-sm">⚠️ Important Warning</p>
                <p className="text-yellow-800 text-xs mb-2 leading-relaxed">{currentAsset.warning}</p>
                <p className="text-yellow-800 text-xs leading-relaxed">
                  Sending incorrect assets or using wrong network will result in permanent loss.
                </p>
              </div>
            </div>
          </Card>

          {/* Explorer Link */}
          <Card className="p-3 border border-gray-100">
            <a
              href={`${currentAsset.explorerUrl}/address/${currentAsset.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              <span className="text-sm font-medium">View on Explorer</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </Card>

          {/* How it works */}
          <Card className="p-4 border border-gray-100 bg-gray-50">
            <h3 className="text-gray-900 font-semibold mb-4 text-sm">How Deposits Work</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold">
                  1
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 font-medium mb-1 text-xs">Send {currentAsset.symbol}</p>
                  <p className="text-gray-600 text-xs leading-relaxed">
                    Transfer {currentAsset.symbol} from your wallet to the address above on {currentAsset.network} network
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold">
                  2
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 font-medium mb-1 text-xs">Wait for confirmations</p>
                  <p className="text-gray-600 text-xs leading-relaxed">
                    Your deposit will appear after {currentAsset.confirmations} confirmation{currentAsset.confirmations > 1 ? 's' : ''} ({currentAsset.estimatedTime})
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold">
                  3
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 font-medium mb-1 text-xs">Off-ramp to NGN</p>
                  <p className="text-gray-600 text-xs leading-relaxed">
                    Once confirmed, you can convert your crypto to Naira and receive it in your bank account
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
