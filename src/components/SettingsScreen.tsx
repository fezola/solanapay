import { motion } from 'motion/react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import {
  User,
  Shield,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  Mail,
  Wallet
} from 'lucide-react';

interface SettingsScreenProps {
  userName: string;
  userEmail: string;
  onLogout: () => void;
  onNavigate?: (screen: string) => void;
  kycTier?: number;
}

export function SettingsScreen({ userName, userEmail, onLogout, onNavigate, kycTier = 0 }: SettingsScreenProps) {
  const menuItems = [
    {
      icon: User,
      label: 'Profile',
      description: 'Manage your personal information',
      action: () => onNavigate ? onNavigate('profile') : alert('Profile - Coming soon!'),
    },
    {
      icon: Shield,
      label: 'KYC & Verification',
      description: `Tier ${kycTier} - ${kycTier === 0 ? 'Get verified' : 'Manage verification'}`,
      action: () => onNavigate ? onNavigate('kyc') : alert('KYC - Coming soon!'),
    },
    {
      icon: Wallet,
      label: 'Transaction Limits',
      description: 'View your daily and monthly limits',
      action: () => onNavigate ? onNavigate('limits') : alert('Limits - Coming soon!'),
    },

    {
      icon: Bell,
      label: 'Notifications',
      description: 'Manage notification preferences',
      action: () => alert('Notification settings - Coming soon!'),
    },
    {
      icon: HelpCircle,
      label: 'Help & Support',
      description: 'Get help or contact support',
      action: () => alert('Support - Coming soon!'),
    },
  ];

  return (
    <div className="pb-24 bg-white min-h-screen">
      <div className="px-6 pt-12 pb-6">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <h1 className="text-gray-900 mb-6">Settings</h1>
          
          <Card className="p-6 border border-gray-100">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="bg-gray-900 text-white text-xl">
                  {userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-gray-900 mb-1">{userName}</h3>
                <div className="flex items-center gap-2 text-gray-600 mb-1">
                  <Mail className="w-4 h-4" />
                  <p>{userEmail}</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      <div className="px-6 space-y-6">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-2 border border-gray-100">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={index}
                  onClick={item.action}
                  className="w-full p-4 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-4"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <Icon className="w-5 h-5 text-gray-700" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="mb-1">{item.label}</p>
                    <p className="text-gray-600">{item.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              );
            })}
          </Card>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 border border-gray-100">
            <h3 className="mb-2">App Information</h3>
            <div className="space-y-2 text-gray-600">
              <p>Version 1.0.0</p>
              <p>© 2025 CryptoRamp</p>
            </div>
          </Card>
        </motion.div>

        <Button
          onClick={onLogout}
          variant="outline"
          className="w-full text-red-600 border-red-600 hover:bg-red-50"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}
