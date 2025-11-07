import { useState, useEffect, useRef } from 'react';
import { Toaster } from './components/ui/sonner';
import { SplashScreen } from './components/SplashScreen';
import { AuthScreen } from './components/AuthScreen';
import { Dashboard } from './components/Dashboard';
import { OfframpScreen } from './components/OfframpScreen';
import { WalletScreen } from './components/WalletScreen';
import { BankAccountScreen } from './components/BankAccountScreen';
import { TransactionsScreen } from './components/TransactionsScreen';
import { TransactionDetailScreen } from './components/TransactionDetailScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { KYCScreen } from './components/KYCScreen';
import { LimitsScreen } from './components/LimitsScreen';
import { BottomNavigation } from './components/BottomNavigation';
import { PINSetupScreen } from './components/PINSetupScreen';
import { UserProfileScreen } from './components/UserProfileScreen';
import { authService, userService, bankAccountService } from './services/supabase';
import { NotificationListener } from './services/notifications';

interface BankAccount {
  id: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  isVerified?: boolean;
  logo?: string;
}

interface Transaction {
  id: string;
  type: 'deposit' | 'offramp';
  crypto?: string;
  amount: number;
  nairaAmount?: number;
  status: 'pending' | 'confirming' | 'quoting' | 'converting' | 'payout_pending' | 'completed' | 'failed';
  date: string;
  bankAccountId?: string;
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
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [needsPINSetup, setNeedsPINSetup] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [currentScreen, setCurrentScreen] = useState<string>('home');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Notification listener reference
  const notificationListenerRef = useRef<NotificationListener | null>(null);

  // KYC state
  const [kycTier, setKycTier] = useState(0);
  const [kycStatus, setKycStatus] = useState<'not_started' | 'pending' | 'approved' | 'rejected'>('not_started');

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  
  // User balances - Real values from Supabase (currently zero until deposits are made)
  const [balance, setBalance] = useState({
    usdcSolana: 0,
    usdcBase: 0,
    sol: 0,
    usdtSolana: 0,
    naira: 0,
  });

  // Deposit addresses for all supported assets (fetched from backend)
  const [depositAddresses, setDepositAddresses] = useState({
    usdcSolana: '',
    usdcBase: '',
    sol: '',
    usdtSolana: '',
  });

  // Bank accounts
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  // Limits
  const [limits, setLimits] = useState({
    daily: {
      limit: kycTier === 1 ? 5000000 : kycTier === 2 ? 10000000 : 0,
      used: 0,
      resets: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
    },
    weekly: {
      limit: kycTier === 1 ? 25000000 : kycTier === 2 ? 50000000 : 0,
      used: 0,
      resets: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    monthly: {
      limit: kycTier === 1 ? 50000000 : kycTier === 2 ? 100000000 : 0,
      used: 0,
      resets: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    },
  });

  // Transactions - Real data from Supabase (currently empty until user makes transactions)
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Load user balance from backend
  const loadBalance = async () => {
    if (!isAuthenticated || !userId) return;

    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/deposits/balances`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Loaded balance from backend:', data.balances);

        setBalance({
          usdcSolana: data.balances.usdcSolana || 0,
          usdcBase: data.balances.usdcBase || 0,
          sol: data.balances.sol || 0,
          usdtSolana: data.balances.usdtSolana || 0,
          naira: 0,
        });
      }
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const session = await authService.getSession();
      if (session?.user) {
        const profile = await userService.getProfile(session.user.id);
        if (profile) {
          setUserName(profile.full_name || session.user.email?.split('@')[0] || 'User');
          setUserEmail(session.user.email || '');
          setUserId(session.user.id);
          setUserPhone(profile.phone_number || '');
          setKycTier(profile.kyc_tier);
          setKycStatus(profile.kyc_status);

          // Check if user needs to set up PIN
          const hasPIN = await userService.hasPIN(session.user.id);
          if (!hasPIN) {
            setNeedsPINSetup(true);
          }

          setIsAuthenticated(true);
        }
      }
    };
    checkSession();
  }, []);

  // Load bank accounts, limits, and deposit addresses when user is authenticated
  useEffect(() => {
    const loadBankAccounts = async () => {
      if (isAuthenticated && userId) {
        try {
          const accounts = await bankAccountService.getBankAccounts(userId);
          // Transform Supabase data to match BankAccount interface
          const transformedAccounts = accounts.map((account: any) => ({
            id: account.id,
            bankName: account.bank_name,
            bankCode: account.bank_code,
            accountNumber: account.account_number,
            accountName: account.account_name,
            isVerified: account.is_verified,
            logo: undefined, // Will be populated by BankAccountScreen
          }));
          setBankAccounts(transformedAccounts);
          console.log('✅ Loaded bank accounts:', transformedAccounts.length);
        } catch (error) {
          console.error('Failed to load bank accounts:', error);
        }
      }
    };

    const loadLimits = async () => {
      if (isAuthenticated && userId) {
        try {
          const session = await authService.getSession();
          const token = session?.access_token;
          if (!token) return;

          const API_URL = (import.meta as any).env?.VITE_API_URL || 'https://crypto-offramp-backend.onrender.com';
          const response = await fetch(`${API_URL}/api/kyc/limits`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.limits && data.limits.length > 0) {
              const daily = data.limits.find((l: any) => l.period === 'daily');
              const weekly = data.limits.find((l: any) => l.period === 'weekly');
              const monthly = data.limits.find((l: any) => l.period === 'monthly');

              setLimits({
                daily: {
                  limit: daily ? parseFloat(daily.limit_amount) : 0,
                  used: daily ? parseFloat(daily.used_amount) : 0,
                  resets: daily?.period_end || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                },
                weekly: {
                  limit: weekly ? parseFloat(weekly.limit_amount) : 0,
                  used: weekly ? parseFloat(weekly.used_amount) : 0,
                  resets: weekly?.period_end || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                },
                monthly: {
                  limit: monthly ? parseFloat(monthly.limit_amount) : 0,
                  used: monthly ? parseFloat(monthly.used_amount) : 0,
                  resets: monthly?.period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                },
              });
              console.log('✅ Loaded limits from backend');
            }
          }
        } catch (error) {
          console.error('Failed to load limits:', error);
        }
      }
    };

    const loadDepositAddresses = async () => {
      if (isAuthenticated && userId) {
        try {
          const session = await authService.getSession();
          const token = session?.access_token;
          if (!token) return;

          const API_URL = (import.meta as any).env?.VITE_API_URL || 'https://crypto-offramp-backend.onrender.com';
          const response = await fetch(`${API_URL}/api/deposits/addresses`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.addresses && data.addresses.length > 0) {
              const newAddresses: any = {};

              data.addresses.forEach((addr: any) => {
                if (addr.asset === 'USDC' && addr.chain === 'solana') {
                  newAddresses.usdcSolana = addr.address;
                } else if (addr.asset === 'USDC' && addr.chain === 'base') {
                  newAddresses.usdcBase = addr.address;
                } else if (addr.asset === 'SOL' && addr.chain === 'solana') {
                  newAddresses.sol = addr.address;
                } else if (addr.asset === 'USDT' && addr.chain === 'solana') {
                  newAddresses.usdtSolana = addr.address;
                }
              });

              setDepositAddresses(newAddresses);
              console.log('✅ Loaded deposit addresses from backend');
            }
          }
        } catch (error) {
          console.error('Failed to load deposit addresses:', error);
        }
      }
    };

    loadBankAccounts();
    loadLimits();
    loadDepositAddresses();
    loadBalance();
  }, [isAuthenticated, userId]);

  // Start/stop real-time notification listener when user is authenticated
  useEffect(() => {
    if (isAuthenticated && userId && !needsPINSetup) {
      // Start listening for real-time notifications
      notificationListenerRef.current = new NotificationListener(userId);
      notificationListenerRef.current.start();

      console.log('✅ Real-time notifications started for user:', userId);

      // Cleanup on unmount or when user logs out
      return () => {
        if (notificationListenerRef.current) {
          notificationListenerRef.current.stop();
          notificationListenerRef.current = null;
          console.log('🛑 Real-time notifications stopped');
        }
      };
    }
  }, [isAuthenticated, userId, needsPINSetup]);

  const handleAuth = async (userData: { name: string; email: string; userId: string }) => {
    setUserName(userData.name);
    setUserEmail(userData.email);
    setUserId(userData.userId);

    // Load user profile data
    const profile = await userService.getProfile(userData.userId);
    if (profile) {
      setKycTier(profile.kyc_tier);
      setKycStatus(profile.kyc_status);
      setUserPhone(profile.phone_number || '');

      // Check if user needs to set up PIN
      const hasPIN = await userService.hasPIN(userData.userId);
      if (!hasPIN) {
        setNeedsPINSetup(true);
      }
    }

    setIsAuthenticated(true);
  };

  const handlePINSetupComplete = async (pin: string) => {
    try {
      await userService.setTransactionPIN(userId, pin);
      setNeedsPINSetup(false);
    } catch (error) {
      console.error('Failed to set PIN:', error);
    }
  };

  const handleUpdateProfile = async (data: { name: string; phone?: string }) => {
    try {
      await userService.updateProfile(userId, {
        full_name: data.name,
        phone_number: data.phone,
      });
      setUserName(data.name);
      setUserPhone(data.phone || '');
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  };

  const handleLogout = async () => {
    // Stop notification listener before logging out
    if (notificationListenerRef.current) {
      notificationListenerRef.current.stop();
      notificationListenerRef.current = null;
    }

    await authService.signOut();
    setIsAuthenticated(false);
    setUserName('');
    setUserEmail('');
    setUserId('');
    setActiveTab('home');
    setCurrentScreen('home');
    setKycTier(0);
    setKycStatus('not_started');
    setNotifications([]);
  };

  const handleAddBankAccount = (account: Omit<BankAccount, 'id'>) => {
    const newAccount = {
      ...account,
      id: `BANK${Date.now()}`,
    };
    setBankAccounts([...bankAccounts, newAccount]);
  };

  const handleDeleteBankAccount = (id: string) => {
    setBankAccounts(bankAccounts.filter(account => account.id !== id));
  };

  const handleOfframpSuccess = (transaction: Transaction) => {
    // Deduct from balance based on asset
    const newBalance = { ...balance };
    if (transaction.crypto === 'USDC') {
      if (transaction.network === 'Solana') {
        newBalance.usdcSolana = balance.usdcSolana - transaction.amount;
      } else if (transaction.network === 'Base') {
        newBalance.usdcBase = balance.usdcBase - transaction.amount;
      }
    } else if (transaction.crypto === 'SOL') {
      newBalance.sol = balance.sol - transaction.amount;
    } else if (transaction.crypto === 'USDT') {
      newBalance.usdtSolana = balance.usdtSolana - transaction.amount;
    }
    setBalance(newBalance);

    // Add transaction
    setTransactions([transaction, ...transactions]);

    // Update limits
    const nairaAmount = transaction.nairaAmount || 0;
    setLimits({
      ...limits,
      daily: { ...limits.daily, used: limits.daily.used + nairaAmount },
      weekly: { ...limits.weekly, used: limits.weekly.used + nairaAmount },
      monthly: { ...limits.monthly, used: limits.monthly.used + nairaAmount },
    });

    // Navigate to transactions tab
    setActiveTab('transactions');
  };

  const handleNavigate = (screen: string) => {
    if (screen === 'kyc' || screen === 'limits' || screen === 'transaction-detail' || screen === 'banks') {
      setCurrentScreen(screen);
    } else {
      setActiveTab(screen);
      setCurrentScreen(screen);
    }
  };

  const handleBack = () => {
    // Navigate back to the appropriate screen based on current screen
    if (currentScreen === 'kyc' || currentScreen === 'limits') {
      setCurrentScreen('settings');
      setActiveTab('settings');
    } else if (currentScreen === 'banks') {
      setCurrentScreen('offramp');
      setActiveTab('offramp');
    } else if (currentScreen === 'transaction-detail') {
      setCurrentScreen('transactions');
      setActiveTab('transactions');
    } else {
      setCurrentScreen('home');
      setActiveTab('home');
    }
  };

  const handleViewTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setCurrentScreen('transaction-detail');
  };

  const handleKYCComplete = () => {
    setKycStatus('pending');
    setCurrentScreen('home');
    setActiveTab('home');
  };

  const handleKYCUpgrade = () => {
    setCurrentScreen('kyc');
  };

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (!isAuthenticated) {
    return (
      <>
        <AuthScreen onAuth={handleAuth} />
        <Toaster />
      </>
    );
  }

  // Show PIN setup screen after authentication if user hasn't set up PIN
  if (needsPINSetup) {
    return (
      <>
        <PINSetupScreen userName={userName} onComplete={handlePINSetupComplete} />
        <Toaster />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto bg-white min-h-screen relative">
        {currentScreen === 'home' && (
          <Dashboard
            userName={userName}
            balance={balance}
            onNavigate={handleNavigate}
            kycTier={kycTier}
            kycStatus={kycStatus}
            notifications={notifications}
          />
        )}
        
        {currentScreen === 'offramp' && (
          <OfframpScreen
            balance={balance}
            bankAccounts={bankAccounts}
            onNavigateToBankAccounts={() => handleNavigate('banks')}
            onNavigateToKYC={() => handleNavigate('kyc')}
            onOfframpSuccess={handleOfframpSuccess}
            kycTier={kycTier}
            limits={limits}
          />
        )}
        
        {currentScreen === 'wallets' && (
          <WalletScreen depositAddresses={depositAddresses} />
        )}

        {currentScreen === 'banks' && (
          <BankAccountScreen
            userId={userId}
            bankAccounts={bankAccounts}
            onAddAccount={handleAddBankAccount}
            onDeleteAccount={handleDeleteBankAccount}
            onBack={handleBack}
          />
        )}
        
        {currentScreen === 'transactions' && (
          <TransactionsScreen 
            transactions={transactions}
            onViewTransaction={handleViewTransaction}
          />
        )}

        {currentScreen === 'transaction-detail' && selectedTransaction && (
          <TransactionDetailScreen
            transaction={selectedTransaction}
            onBack={() => {
              setCurrentScreen('transactions');
              setActiveTab('transactions');
            }}
          />
        )}

        {currentScreen === 'kyc' && (
          <KYCScreen
            currentTier={kycTier}
            kycStatus={kycStatus}
            onComplete={handleKYCComplete}
            onBack={handleBack}
          />
        )}

        {currentScreen === 'limits' && (
          <LimitsScreen
            currentTier={kycTier}
            limits={limits}
            onUpgrade={handleKYCUpgrade}
            onBack={handleBack}
          />
        )}
        
        {currentScreen === 'settings' && (
          <SettingsScreen
            userName={userName}
            userEmail={userEmail}
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            kycTier={kycTier}
          />
        )}

        {currentScreen === 'profile' && (
          <UserProfileScreen
            userName={userName}
            userEmail={userEmail}
            userPhone={userPhone}
            onBack={handleBack}
            onUpdateProfile={handleUpdateProfile}
          />
        )}

        <BottomNavigation activeTab={activeTab} onTabChange={handleNavigate} />
      </div>
      <Toaster />
    </div>
  );
}
