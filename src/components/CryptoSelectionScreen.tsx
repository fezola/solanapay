import { motion } from 'motion/react';
import { Card } from './ui/card';
import { PageHeader } from './ui/page-header';
import { ChevronRight } from 'lucide-react';

interface CryptoSelectionScreenProps {
  onBack: () => void;
  onSelectCrypto: (crypto: CryptoAsset) => void;
}

export interface CryptoAsset {
  id: string;
  name: string;
  symbol: string;
  logo: string;
  description: string;
  networks: NetworkOption[];
}

export interface NetworkOption {
  id: string;
  name: string;
  chainId?: string;
  logo: string;
  confirmations: number;
  minDeposit: number;
  estimatedTime: string;
  explorerUrl: string;
}

export function CryptoSelectionScreen({ onBack, onSelectCrypto }: CryptoSelectionScreenProps) {
  const cryptoAssets: CryptoAsset[] = [
    {
      id: 'usdc',
      name: 'USD Coin',
      symbol: 'USDC',
      logo: '/usd-coin-usdc-logo.svg',
      description: 'Stablecoin pegged to USD',
      networks: [
        {
          id: 'solana',
          name: 'Solana',
          logo: '/solana-sol-logo.svg',
          confirmations: 1,
          minDeposit: 1,
          estimatedTime: '~30 seconds',
          explorerUrl: 'https://solscan.io',
        },
        {
          id: 'base',
          name: 'Base',
          logo: '/BASE.png',
          confirmations: 12,
          minDeposit: 1,
          estimatedTime: '~2 minutes',
          explorerUrl: 'https://basescan.org',
        },
        {
          id: 'ethereum',
          name: 'Ethereum',
          logo: '/ethereum-eth-logo.svg',
          confirmations: 12,
          minDeposit: 10,
          estimatedTime: '~3 minutes',
          explorerUrl: 'https://etherscan.io',
        },
        {
          id: 'polygon',
          name: 'Polygon',
          logo: '/polygon-matic-logo.svg',
          confirmations: 128,
          minDeposit: 1,
          estimatedTime: '~2 minutes',
          explorerUrl: 'https://polygonscan.com',
        },
        {
          id: 'arbitrum',
          name: 'Arbitrum',
          logo: '/arbitrum-arb-logo.svg',
          confirmations: 12,
          minDeposit: 1,
          estimatedTime: '~1 minute',
          explorerUrl: 'https://arbiscan.io',
        },
        {
          id: 'optimism',
          name: 'Optimism',
          logo: '/optimism-ethereum-op-logo.svg',
          confirmations: 12,
          minDeposit: 1,
          estimatedTime: '~1 minute',
          explorerUrl: 'https://optimistic.etherscan.io',
        },
      ],
    },
    {
      id: 'usdt',
      name: 'Tether',
      symbol: 'USDT',
      logo: '/tether-usdt-logo.svg',
      description: 'Stablecoin pegged to USD',
      networks: [
        {
          id: 'solana',
          name: 'Solana',
          logo: '/solana-sol-logo.svg',
          confirmations: 1,
          minDeposit: 1,
          estimatedTime: '~30 seconds',
          explorerUrl: 'https://solscan.io',
        },
        {
          id: 'ethereum',
          name: 'Ethereum',
          logo: '/ethereum-eth-logo.svg',
          confirmations: 12,
          minDeposit: 10,
          estimatedTime: '~3 minutes',
          explorerUrl: 'https://etherscan.io',
        },
        {
          id: 'polygon',
          name: 'Polygon',
          logo: '/polygon-matic-logo.svg',
          confirmations: 128,
          minDeposit: 1,
          estimatedTime: '~2 minutes',
          explorerUrl: 'https://polygonscan.com',
        },
      ],
    },
    {
      id: 'sol',
      name: 'Solana',
      symbol: 'SOL',
      logo: '/solana-sol-logo.svg',
      description: 'Native Solana token',
      networks: [
        {
          id: 'solana',
          name: 'Solana',
          logo: '/solana-sol-logo.svg',
          confirmations: 1,
          minDeposit: 0.01,
          estimatedTime: '~30 seconds',
          explorerUrl: 'https://solscan.io',
        },
      ],
    },
    {
      id: 'eth',
      name: 'Ethereum',
      symbol: 'ETH',
      logo: '/ethereum-eth-logo.svg',
      description: 'Native Ethereum token',
      networks: [
        {
          id: 'ethereum',
          name: 'Ethereum',
          logo: '/ethereum-eth-logo.svg',
          confirmations: 12,
          minDeposit: 0.001,
          estimatedTime: '~3 minutes',
          explorerUrl: 'https://etherscan.io',
        },
        {
          id: 'base',
          name: 'Base',
          logo: '/BASE.png',
          confirmations: 12,
          minDeposit: 0.001,
          estimatedTime: '~2 minutes',
          explorerUrl: 'https://basescan.org',
        },
        {
          id: 'arbitrum',
          name: 'Arbitrum',
          logo: '/arbitrum-arb-logo.svg',
          confirmations: 12,
          minDeposit: 0.001,
          estimatedTime: '~1 minute',
          explorerUrl: 'https://arbiscan.io',
        },
        {
          id: 'optimism',
          name: 'Optimism',
          logo: '/optimism-ethereum-op-logo.svg',
          confirmations: 12,
          minDeposit: 0.001,
          estimatedTime: '~1 minute',
          explorerUrl: 'https://optimistic.etherscan.io',
        },
      ],
    },
  ];

  return (
    <div className="pb-safe-nav bg-white min-h-screen overflow-hidden">
      <PageHeader
        title="Select Cryptocurrency"
        description="Choose the crypto you want to deposit"
        onBack={onBack}
      />

      <div className="px-6 pb-8 space-y-3">
        {cryptoAssets.map((crypto, index) => (
          <motion.button
            key={crypto.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.05 * index }}
            onClick={() => onSelectCrypto(crypto)}
            className="w-full text-left"
            type="button"
          >
            <Card className="p-4 border border-gray-100 hover:border-gray-900 hover:shadow-md transition-all active:scale-[0.98]">
              <div className="flex items-center gap-3">
                {/* Crypto Icon with Background - Smaller */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
                    <img
                      src={crypto.logo}
                      alt={crypto.symbol}
                      className="w-6 h-6 rounded-full object-contain"
                    />
                  </div>
                  {crypto.networks.length > 1 && (
                    <div className="absolute -bottom-0.5 -right-0.5 bg-gray-900 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold border-2 border-white">
                      {crypto.networks.length}
                    </div>
                  )}
                </div>

                {/* Crypto Info - Only Name */}
                <div className="flex-1 min-w-0 text-left">
                  <h3 className="text-gray-900 font-semibold text-base">
                    {crypto.name}
                  </h3>
                </div>

                {/* Network Badges or Arrow - Smaller */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {crypto.networks.length === 1 ? (
                    <div className="w-5 h-5 flex-shrink-0">
                      <img
                        src={crypto.networks[0].logo}
                        alt={crypto.networks[0].name}
                        className="w-5 h-5 rounded-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex -space-x-1.5">
                      {crypto.networks.slice(0, 3).map((network) => (
                        <div key={network.id} className="w-5 h-5 flex-shrink-0">
                          <img
                            src={network.logo}
                            alt={network.name}
                            className="w-5 h-5 rounded-full border-2 border-white object-contain"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </Card>
          </motion.button>
        ))}
      </div>

      {/* Info Card */}
      <div className="px-6 mt-6 mb-8">
        <Card className="p-4 bg-blue-50 border border-blue-200">
          <p className="text-blue-900 text-sm font-medium mb-2">💡 Multi-Chain Support</p>
          <p className="text-blue-800 text-xs leading-relaxed">
            Some cryptocurrencies support multiple networks. Choose the network that matches where you're sending from to avoid losing funds.
          </p>
        </Card>
      </div>
    </div>
  );
}

