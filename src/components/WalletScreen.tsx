import { motion } from 'motion/react';
import { Button } from './ui/button';
import { ArrowDownLeft } from 'lucide-react';
import { useState } from 'react';
import { CryptoSelectionScreen, type CryptoAsset, type NetworkOption } from './CryptoSelectionScreen';
import { NetworkSelectionModal } from './NetworkSelectionModal';
import { DepositAddressScreen } from './DepositAddressScreen';

interface WalletScreenProps {
  depositAddresses: {
    usdcSolana: string;
    usdcBase: string;
    sol: string;
    usdtSolana: string;
  };
}

type DepositFlow = 'main' | 'crypto-selection' | 'deposit-address';

export function WalletScreen({ depositAddresses }: WalletScreenProps) {
  const [depositFlow, setDepositFlow] = useState<DepositFlow>('main');
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoAsset | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<NetworkOption | null>(null);
  const [showNetworkModal, setShowNetworkModal] = useState(false);

  // Get the deposit address based on crypto and network
  const getDepositAddress = (cryptoId: string, networkId: string): string => {
    if (cryptoId === 'usdc' && networkId === 'solana') return depositAddresses.usdcSolana;
    if (cryptoId === 'usdc' && networkId === 'base') return depositAddresses.usdcBase;
    if (cryptoId === 'sol' && networkId === 'solana') return depositAddresses.sol;
    if (cryptoId === 'usdt' && networkId === 'solana') return depositAddresses.usdtSolana;
    // For other networks, return placeholder (will be implemented later)
    return 'Coming soon - Address will be generated';
  };

  const handleSelectCrypto = (crypto: CryptoAsset) => {
    setSelectedCrypto(crypto);

    // If crypto has only one network, go directly to deposit address
    if (crypto.networks.length === 1) {
      setSelectedNetwork(crypto.networks[0]);
      setDepositFlow('deposit-address');
    } else {
      // Show network selection modal
      setShowNetworkModal(true);
    }
  };

  const handleSelectNetwork = (network: NetworkOption) => {
    setSelectedNetwork(network);
    setDepositFlow('deposit-address');
  };

  const handleBackFromCryptoSelection = () => {
    setDepositFlow('main');
    setSelectedCrypto(null);
    setSelectedNetwork(null);
  };

  const handleBackFromDepositAddress = () => {
    setDepositFlow('crypto-selection');
    setSelectedNetwork(null);
  };

  // Show crypto selection screen
  if (depositFlow === 'crypto-selection') {
    return (
      <>
        <CryptoSelectionScreen
          onBack={handleBackFromCryptoSelection}
          onSelectCrypto={handleSelectCrypto}
        />
        {/* Network selection modal - Show when crypto with multiple networks is selected */}
        {selectedCrypto && (
          <NetworkSelectionModal
            isOpen={showNetworkModal}
            onClose={() => setShowNetworkModal(false)}
            crypto={selectedCrypto}
            onSelectNetwork={handleSelectNetwork}
          />
        )}
      </>
    );
  }

  // Show deposit address screen
  if (depositFlow === 'deposit-address' && selectedCrypto && selectedNetwork) {
    const address = getDepositAddress(selectedCrypto.id, selectedNetwork.id);
    return (
      <DepositAddressScreen
        crypto={selectedCrypto}
        network={selectedNetwork}
        address={address}
        onBack={handleBackFromDepositAddress}
      />
    );
  }

  // Main wallet screen - just shows deposit button
  return (
    <>
      <div className="pb-safe-nav bg-white min-h-screen">
        {/* Header */}
        <div className="px-6 pb-6 mb-6" style={{ paddingTop: `calc(3rem + env(safe-area-inset-top))` }}>
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <h1 className="text-gray-900 mb-2">My Wallets</h1>
            <p className="text-gray-500 mb-6">Deposit crypto to your account</p>

            {/* Deposit Button */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Button
                onClick={() => setDepositFlow('crypto-selection')}
                className="w-full h-16 text-lg font-semibold bg-gray-900 hover:bg-gray-800 text-white rounded-2xl shadow-lg"
                size="lg"
              >
                <ArrowDownLeft className="w-6 h-6 mr-2" />
                Deposit Crypto
              </Button>
            </motion.div>
          </motion.div>
        </div>

        {/* Main Content */}
        <div className="px-6 space-y-6">
          {/* Supported Cryptocurrencies - No heading, just icons with proper spacing */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200"
          >
            <div className="grid grid-cols-4 gap-6">
              {[
                { name: 'USDC', logo: '/usd-coin-usdc-logo.svg' },
                { name: 'USDT', logo: '/tether-usdt-logo.svg' },
                { name: 'SOL', logo: '/solana-sol-logo.svg' },
                { name: 'ETH', logo: '/ethereum-eth-logo.svg' },
              ].map((crypto, index) => (
                <motion.div
                  key={crypto.name}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 + (index * 0.05) }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <img
                      src={crypto.logo}
                      alt={crypto.name}
                      className="w-8 h-8 rounded-full object-contain"
                    />
                  </div>
                  <p className="text-xs text-gray-700 font-semibold">{crypto.name}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Supported Networks */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 mb-6"
          >
            <h3 className="text-gray-900 font-semibold mb-5 text-base">Supported Networks</h3>
            <div className="space-y-3">
              {[
                { name: 'Solana', logo: '/solana-sol-logo.svg' },
                { name: 'Base', logo: '/BASE.png' },
                { name: 'Ethereum', logo: '/ethereum-eth-logo.svg' },
                { name: 'Polygon', logo: '/polygon-matic-logo.svg' },
                { name: 'Arbitrum', logo: '/arbitrum-arb-logo.svg' },
                { name: 'Optimism', logo: '/optimism-ethereum-op-logo.svg' },
              ].map((network, index) => (
                <motion.div
                  key={network.name}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 + (index * 0.05) }}
                  className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-all"
                >
                  <div className="w-10 h-10 flex-shrink-0 bg-gray-50 rounded-full flex items-center justify-center border border-gray-200">
                    <img
                      src={network.logo}
                      alt={network.name}
                      className="w-6 h-6 rounded-full object-contain"
                    />
                  </div>
                  <p className="text-sm text-gray-900 font-semibold">{network.name}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Network selection modal */}
      {selectedCrypto && (
        <NetworkSelectionModal
          isOpen={showNetworkModal}
          onClose={() => setShowNetworkModal(false)}
          crypto={selectedCrypto}
          onSelectNetwork={handleSelectNetwork}
        />
      )}
    </>
  );
}
