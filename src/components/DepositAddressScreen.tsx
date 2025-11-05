import { useState } from 'react';
import { motion } from 'motion/react';
import QRCode from 'react-qr-code';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { PageHeader } from './ui/page-header';
import { Copy, CheckCircle2, QrCode as QrCodeIcon, AlertTriangle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import type { CryptoAsset, NetworkOption } from './CryptoSelectionScreen';

interface DepositAddressScreenProps {
  crypto: CryptoAsset;
  network: NetworkOption;
  address: string;
  onBack: () => void;
}

export function DepositAddressScreen({
  crypto,
  network,
  address,
  onBack,
}: DepositAddressScreenProps) {
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const copyToClipboard = async () => {
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
      setCopiedAddress(true);
      toast.success('Address copied to clipboard!');
      setTimeout(() => setCopiedAddress(false), 2000);
    } else {
      toast.error('Failed to copy. Please copy manually.');
    }
  };

  return (
    <div className="pb-32 bg-white min-h-screen">
      <PageHeader
        title={`Deposit ${crypto.symbol}`}
        description={`Send ${crypto.symbol} on ${network.name}`}
        onBack={onBack}
      />

      <div className="px-6 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Asset Header */}
          <Card className="p-4 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 flex-shrink-0">
                <img
                  src={crypto.logo}
                  alt={crypto.symbol}
                  className="w-12 h-12 rounded-full object-contain"
                />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 flex-shrink-0">
                  <img
                    src={network.logo}
                    alt={network.name}
                    className="w-5 h-5 rounded-full border-2 border-white bg-white object-contain"
                  />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-gray-900 font-semibold text-lg mb-0.5">
                  {crypto.name}
                </h3>
                <p className="text-gray-600 text-sm">{network.name} Network</p>
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
                      value={address}
                      size={208}
                      level="H"
                      style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
                    />
                  </div>
                  <p className="text-center text-xs text-gray-600 mt-3">
                    Scan to get {crypto.symbol} deposit address
                  </p>
                </div>
              </motion.div>
            )}
          </Card>

          {/* Deposit Address */}
          <Card className="p-4 border border-gray-100">
            <p className="text-gray-600 text-sm mb-3 font-medium">Deposit Address</p>
            <div className="bg-gray-50 p-3 rounded-lg mb-3">
              <p className="text-gray-900 text-xs break-all font-mono leading-relaxed">
                {address}
              </p>
            </div>
            <Button
              onClick={copyToClipboard}
              className="w-full"
              variant={copiedAddress ? 'default' : 'outline'}
            >
              {copiedAddress ? (
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
              <p className="text-gray-900 font-semibold text-sm">
                {network.confirmations} block{network.confirmations > 1 ? 's' : ''}
              </p>
            </Card>
            <Card className="p-3 border border-gray-100">
              <p className="text-gray-600 text-xs mb-1">Est. Time</p>
              <p className="text-gray-900 font-semibold text-sm">{network.estimatedTime}</p>
            </Card>
          </div>

          <Card className="p-3 border border-gray-100">
            <p className="text-gray-600 text-xs mb-1">Minimum Deposit</p>
            <p className="text-gray-900 font-semibold text-sm">
              {network.minDeposit} {crypto.symbol}
            </p>
          </Card>

          {/* Warning */}
          <Card className="p-4 bg-yellow-50 border border-yellow-200">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-yellow-900 font-semibold mb-2 text-sm">⚠️ Important Warning</p>
                <p className="text-yellow-800 text-xs mb-2 leading-relaxed">
                  Only send <strong>{crypto.symbol}</strong> on the <strong>{network.name}</strong> network to this address.
                </p>
                <p className="text-yellow-800 text-xs leading-relaxed">
                  Sending incorrect assets or using the wrong network will result in permanent loss of funds.
                </p>
              </div>
            </div>
          </Card>

          {/* Explorer Link */}
          <Card className="p-3 border border-gray-100">
            <a
              href={`${network.explorerUrl}/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              <span className="text-sm font-medium">View on {network.name} Explorer</span>
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
                  <p className="text-gray-900 font-medium mb-1 text-xs">Send {crypto.symbol}</p>
                  <p className="text-gray-600 text-xs leading-relaxed">
                    Transfer {crypto.symbol} from your wallet to the address above on {network.name} network
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
                    Your deposit will appear after {network.confirmations} confirmation{network.confirmations > 1 ? 's' : ''} ({network.estimatedTime})
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

