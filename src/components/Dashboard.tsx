import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import {
  Bell,
  ChevronDown,
  ArrowDownLeft,
  Building2,
  ChevronRight,
  User,
  History
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { priceService } from '../services/priceService';

interface DashboardProps {
  userName: string;
  balance: {
    usdcSolana: number;
    usdcBase: number;
    sol: number;
    usdtSolana: number;
    naira: number;
  };
  onNavigate: (tab: string) => void;
  kycTier: number;
  kycStatus: 'not_started' | 'pending' | 'approved' | 'rejected';
  notifications?: any[]; // Add notifications prop
}

export function Dashboard({ userName, balance, onNavigate, kycTier, kycStatus, notifications = [] }: DashboardProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<'naira' | 'usd'>('naira');
  const [showNotifications, setShowNotifications] = useState(false);
  const [rates, setRates] = useState({
    usdcSolana: 1600,
    usdcBase: 1600,
    usdtSolana: 1600,
    sol: 250000,
  });

  const hasUnreadNotifications = notifications.length > 0;

  // Fetch exchange rates from Bread Africa on mount and every minute
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const freshRates = await priceService.getAllRates();
        setRates(freshRates);
        console.log('✅ Fetched exchange rates:', freshRates);
      } catch (error) {
        console.error('Failed to fetch rates:', error);
      }
    };

    fetchRates(); // Initial fetch

    // Refresh rates every minute
    const interval = setInterval(fetchRates, 60000);

    return () => clearInterval(interval);
  }, []);

  const totalInNaira = (balance.usdcSolana * rates.usdcSolana) + (balance.usdcBase * rates.usdcBase) + (balance.sol * rates.sol) + (balance.usdtSolana * rates.usdtSolana) + balance.naira;
  const totalInUSD = totalInNaira / rates.usdcSolana; // Use USDC rate as USD reference

  const displayBalance = selectedCurrency === 'naira'
    ? `₦${totalInNaira.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `$${totalInUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;



  // Calculate USD values for each asset using Bread rates
  const solPriceUSD = rates.sol / rates.usdcSolana; // Dynamic SOL price in USD

  const cryptoAssets = [
    {
      id: 'usdc-solana',
      name: 'USDC',
      symbol: 'USDC',
      amount: balance.usdcSolana,
      usdValue: balance.usdcSolana * (rates.usdcSolana / rates.usdcSolana), // USDC rate in USD
      ngnValue: balance.usdcSolana * rates.usdcSolana,
      logo: '/usd-coin-usdc-logo.svg',
      network: 'Solana',
      networkLogo: '/solana-sol-logo.svg',
    },
    {
      id: 'usdc-base',
      name: 'USDC',
      symbol: 'USDC',
      amount: balance.usdcBase,
      usdValue: balance.usdcBase * (rates.usdcBase / rates.usdcSolana), // USDC rate in USD
      ngnValue: balance.usdcBase * rates.usdcBase,
      logo: '/usd-coin-usdc-logo.svg',
      network: 'Base',
      networkLogo: '/BASE.png',
    },
    {
      id: 'sol',
      name: 'SOL',
      symbol: 'SOL',
      amount: balance.sol,
      usdValue: balance.sol * solPriceUSD,
      ngnValue: balance.sol * rates.sol,
      logo: '/solana-sol-logo.svg',
      network: 'Solana',
      networkLogo: '/solana-sol-logo.svg',
    },
    {
      id: 'usdt-solana',
      name: 'USDT',
      symbol: 'USDT',
      amount: balance.usdtSolana,
      usdValue: balance.usdtSolana * (rates.usdtSolana / rates.usdcSolana), // USDT rate in USD
      ngnValue: balance.usdtSolana * rates.usdtSolana,
      logo: '/tether-usdt-logo.svg',
      network: 'Solana',
      networkLogo: '/solana-sol-logo.svg',
    },
  ];

  return (
    <div className="pb-safe-nav bg-white min-h-screen">
      {/* Header with Background - Only greeting and balance */}
      <div
        className="px-6 pb-8 bg-cover bg-center bg-no-repeat rounded-b-3xl"
        style={{
          backgroundImage: 'url(/background.png)',
          paddingTop: `calc(3rem + env(safe-area-inset-top))`
        }}
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-start justify-between mb-8"
        >
          <div>
            <h2 className="text-white font-bold text-2xl mb-1 drop-shadow-md" style={{ fontFamily: 'Poppins, sans-serif' }}>Hi {userName}</h2>
            <p className="text-white font-medium text-sm drop-shadow" style={{ fontFamily: 'Poppins, sans-serif' }}>Welcome back!</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('profile')}
              className="relative p-2 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm"
            >
              <User className="w-6 h-6 text-white drop-shadow" />
            </button>

            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 hover:bg-white/20 rounded-full transition-colors backdrop-blur-sm"
            >
              <Bell className="w-6 h-6 text-white drop-shadow" />
              {hasUnreadNotifications && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
              )}
            </button>
          </div>
        </motion.div>

        {/* Notifications Panel */}
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="p-4 border border-white/20 bg-white/95 backdrop-blur-md">
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600 mb-1">No notifications</p>
                  <p className="text-gray-500 text-sm">You're all caught up!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-900 font-medium mb-1">{notification.title}</p>
                      <p className="text-gray-600 text-sm">{notification.message}</p>
                      <p className="text-gray-500 text-xs mt-1">{notification.time}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        )}

        {/* Balance Display */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-white font-bold mb-3 drop-shadow-lg" style={{ fontSize: '48px', lineHeight: '1.1', fontFamily: 'Poppins, sans-serif' }}>
            {displayBalance.split('.')[0]}.<span style={{ fontSize: '40px' }}>{displayBalance.split('.')[1]}</span>
          </h1>

          <button
            onClick={() => setSelectedCurrency(selectedCurrency === 'naira' ? 'usd' : 'naira')}
            className="flex items-center gap-2 text-white hover:text-white/90 transition-colors drop-shadow"
          >
            <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-xs font-bold">
              {selectedCurrency === 'naira' ? '₦' : '$'}
            </div>
            <span className="font-bold" style={{ fontFamily: 'Poppins, sans-serif' }}>{selectedCurrency === 'naira' ? 'NGN' : 'USD'}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </motion.div>
      </div>

      {/* Action Buttons - Below the background with proper spacing */}
      <div className="px-6 mt-6 mb-6">
        <div className="flex gap-3">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex-1"
          >
            <Button
              onClick={() => onNavigate('wallets')}
              className="w-full h-14 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl flex items-center justify-center gap-2 shadow-lg border-0 text-base font-semibold"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              <ArrowDownLeft className="w-5 h-5" />
              <span>Deposit</span>
            </Button>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="flex-1"
          >
            <Button
              onClick={() => onNavigate('banks')}
              className="w-full h-14 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl flex items-center justify-center gap-2 shadow-lg border-0 text-base font-semibold"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              <Building2 className="w-5 h-5" />
              <span>Bank Account</span>
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Crypto Assets */}
      <div className="px-6 pb-6">
        <p className="text-gray-500 mb-3 text-sm font-medium">Your crypto assets</p>

        <Card className="border border-gray-100 divide-y divide-gray-100 overflow-hidden">
          {cryptoAssets.map((asset, index) => (
            <motion.div
              key={asset.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 + (index * 0.05) }}
            >
              <button
                onClick={() => onNavigate('wallets')}
                className="w-full p-4 hover:bg-gray-50 transition-colors flex items-center gap-3"
              >
                <img
                  src={asset.logo}
                  alt={asset.symbol}
                  className="w-10 h-10 rounded-full flex-shrink-0"
                  onError={(e) => {
                    // Fallback if image fails to load
                    e.currentTarget.style.display = 'none';
                  }}
                />

                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-gray-900 font-semibold">{asset.name}</p>
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full">
                      <img
                        src={asset.networkLogo}
                        alt={asset.network}
                        className="w-3 h-3 rounded-full"
                      />
                      <span className="text-xs text-gray-600 font-medium">{asset.network}</span>
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm">
                    {asset.amount === 0 ? '0.00' : asset.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {asset.symbol}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="text-gray-900 font-semibold">
                    ${asset.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <ChevronRight className="w-5 h-5 text-gray-400 mt-1 ml-auto" />
                </div>
              </button>
            </motion.div>
          ))}
        </Card>

        {/* View All Transactions Button */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-4"
        >
          <Button
            onClick={() => onNavigate('transactions')}
            variant="outline"
            className="w-full h-12 rounded-2xl flex items-center justify-center gap-2 border-gray-200 hover:bg-gray-50"
          >
            <History className="w-5 h-5" />
            <span>View All Transactions</span>
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
