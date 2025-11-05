import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import {
  Bell,
  ChevronDown,
  ArrowDownLeft,
  Building2,
  ChevronRight,
  User
} from 'lucide-react';
import { useState } from 'react';

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

  const hasUnreadNotifications = notifications.length > 0;

  const totalInNaira = (balance.usdcSolana * 1600) + (balance.usdcBase * 1600) + (balance.sol * 250000) + (balance.usdtSolana * 1600) + balance.naira;
  const totalInUSD = totalInNaira / 1600;

  const displayBalance = selectedCurrency === 'naira' 
    ? `₦${totalInNaira.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
    : `$${totalInUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;



  const cryptoAssets = [
    {
      id: 'usdc-solana',
      name: 'USDC',
      symbol: 'USDC',
      amount: balance.usdcSolana,
      logo: '/usd-coin-usdc-logo.svg',
      network: 'Solana',
      networkLogo: '/solana-sol-logo.svg',
    },
    {
      id: 'usdc-base',
      name: 'USDC',
      symbol: 'USDC',
      amount: balance.usdcBase,
      logo: '/usd-coin-usdc-logo.svg',
      network: 'Base',
      networkLogo: '/BASE.png',
    },
    {
      id: 'sol',
      name: 'SOL',
      symbol: 'SOL',
      amount: balance.sol,
      logo: '/solana-sol-logo.svg',
      network: 'Solana',
      networkLogo: '/solana-sol-logo.svg',
    },
    {
      id: 'usdt-solana',
      name: 'USDT',
      symbol: 'USDT',
      amount: balance.usdtSolana,
      logo: '/tether-usdt-logo.svg',
      network: 'Solana',
      networkLogo: '/solana-sol-logo.svg',
    },
  ];

  return (
    <div className="pb-24 bg-white min-h-screen">
      {/* Header */}
      <div className="px-6 pt-12 pb-6">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-start justify-between mb-8"
        >
          <div>
            <h2 className="text-gray-900 font-bold text-2xl mb-1">Hi {userName}</h2>
            <p className="text-gray-500 text-sm">Welcome back!</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('profile')}
              className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <User className="w-6 h-6 text-gray-700" />
            </button>

            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Bell className="w-6 h-6 text-gray-700" />
              {hasUnreadNotifications && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
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
            <Card className="p-4 border border-gray-100">
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
          <h1 className="text-gray-900 mb-3" style={{ fontSize: '48px', lineHeight: '1.1' }}>
            {displayBalance.split('.')[0]}.<span style={{ fontSize: '40px' }}>{displayBalance.split('.')[1]}</span>
          </h1>
          
          <button 
            onClick={() => setSelectedCurrency(selectedCurrency === 'naira' ? 'usd' : 'naira')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center text-white text-xs">
              {selectedCurrency === 'naira' ? '₦' : '$'}
            </div>
            <span>{selectedCurrency === 'naira' ? 'NGN' : 'USD'}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </motion.div>
      </div>

      {/* Action Buttons */}
      <div className="px-6 mb-8">
        <p className="text-gray-500 mb-4">Quick actions</p>

        <div className="flex gap-3">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex-1"
          >
            <Button
              onClick={() => onNavigate('wallets')}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center gap-2"
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
              className="w-full h-14 bg-green-600 hover:bg-green-700 text-white rounded-xl flex items-center justify-center gap-2"
            >
              <Building2 className="w-5 h-5" />
              <span>Bank Account</span>
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Crypto Assets */}
      <div className="px-6">
        <p className="text-gray-500 mb-4">Your crypto assets</p>

        <Card className="border border-gray-100 divide-y divide-gray-100">
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
                  className="w-8 h-8 rounded-full flex-shrink-0"
                  onError={(e) => {
                    // Fallback if image fails to load
                    e.currentTarget.style.display = 'none';
                  }}
                />

                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-gray-900 font-medium">{asset.name}</p>
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full">
                      <img
                        src={asset.networkLogo}
                        alt={asset.network}
                        className="w-3 h-3 rounded-full"
                      />
                      <span className="text-xs text-gray-600">{asset.network}</span>
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm">
                    {asset.amount === 0 ? '0.00' : asset.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} {asset.symbol}
                  </p>
                </div>

                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
              </button>
            </motion.div>
          ))}
        </Card>
      </div>
    </div>
  );
}
