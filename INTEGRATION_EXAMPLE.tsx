// ============================================================================
// EXAMPLE: How to integrate Supabase services into your App.tsx
// ============================================================================
// This file shows you how to replace mock data with real Supabase data

import { useEffect, useState } from 'react';
import { 
  authService, 
  userService, 
  bankAccountService, 
  transactionService,
  depositAddressService,
  type User,
  type BankAccount,
  type Transaction,
  type DepositAddress
} from './services/supabase';
import { NotificationListener, notificationService } from './services/notifications';

// ============================================================================
// 1. AUTHENTICATION EXAMPLE
// ============================================================================

function AuthExample() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    checkUser();
  }, []);

  async function checkUser() {
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }

  async function handleSignUp(email: string, password: string, fullName: string) {
    try {
      const { user } = await authService.signUp(email, password, fullName);
      setUser(user);
      // ✅ User created in auth.users
      // ✅ Profile created in public.users
      // ✅ Notification shown
    } catch (error) {
      console.error('Sign up error:', error);
    }
  }

  async function handleSignIn(email: string, password: string) {
    try {
      const { user } = await authService.signIn(email, password);
      setUser(user);
      // ✅ User signed in
      // ✅ last_login_at updated
      // ✅ Notification shown
    } catch (error) {
      console.error('Sign in error:', error);
    }
  }

  async function handleSignOut() {
    try {
      await authService.signOut();
      setUser(null);
      // ✅ User signed out
      // ✅ Notification shown
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {user ? (
        <button onClick={handleSignOut}>Sign Out</button>
      ) : (
        <>
          <button onClick={() => handleSignUp('test@example.com', 'password123', 'Test User')}>
            Sign Up
          </button>
          <button onClick={() => handleSignIn('test@example.com', 'password123')}>
            Sign In
          </button>
        </>
      )}
    </div>
  );
}

// ============================================================================
// 2. USER PROFILE & KYC EXAMPLE
// ============================================================================

function ProfileExample({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<User | null>(null);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  async function loadProfile() {
    const data = await userService.getProfile(userId);
    setProfile(data);
  }

  async function handleUpdateProfile(updates: Partial<User>) {
    try {
      await userService.updateProfile(userId, updates);
      await loadProfile(); // Reload profile
      // ✅ Profile updated
      // ✅ Notification shown
    } catch (error) {
      console.error('Update profile error:', error);
    }
  }

  async function handleSubmitKYC() {
    try {
      await userService.submitKYC(userId, {
        bvn: '12345678901',
        document_type: 'nin',
        document_number: 'NIN123456789',
        full_name: 'John Doe',
        phone_number: '+234 123 456 7890',
      });
      await loadProfile(); // Reload profile
      // ✅ KYC submitted
      // ✅ kyc_status = 'pending'
      // ✅ kyc_submitted_at set
      // ✅ Notification shown
    } catch (error) {
      console.error('Submit KYC error:', error);
    }
  }

  return (
    <div>
      <h2>Profile</h2>
      {profile && (
        <div>
          <p>Email: {profile.email}</p>
          <p>Name: {profile.full_name}</p>
          <p>KYC Tier: {profile.kyc_tier}</p>
          <p>KYC Status: {profile.kyc_status}</p>
          <button onClick={handleSubmitKYC}>Submit KYC</button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 3. BANK ACCOUNTS EXAMPLE
// ============================================================================

function BankAccountsExample({ userId }: { userId: string }) {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);

  useEffect(() => {
    loadBankAccounts();
  }, [userId]);

  async function loadBankAccounts() {
    const data = await bankAccountService.getBankAccounts(userId);
    setAccounts(data);
  }

  async function handleAddAccount() {
    try {
      await bankAccountService.addBankAccount(userId, {
        bank_name: 'Access Bank',
        bank_code: '044',
        account_number: '0123456789',
        account_name: 'John Doe',
      });
      await loadBankAccounts(); // Reload accounts
      // ✅ Account added to database
      // ✅ Notification shown
    } catch (error) {
      console.error('Add account error:', error);
    }
  }

  async function handleDeleteAccount(accountId: string) {
    try {
      await bankAccountService.deleteBankAccount(accountId);
      await loadBankAccounts(); // Reload accounts
      // ✅ Account deleted from database
      // ✅ Notification shown
    } catch (error) {
      console.error('Delete account error:', error);
    }
  }

  async function handleSetDefault(accountId: string) {
    try {
      await bankAccountService.setDefaultAccount(userId, accountId);
      await loadBankAccounts(); // Reload accounts
      // ✅ Default account updated
      // ✅ Notification shown
    } catch (error) {
      console.error('Set default error:', error);
    }
  }

  return (
    <div>
      <h2>Bank Accounts</h2>
      <button onClick={handleAddAccount}>Add Account</button>
      {accounts.map((account) => (
        <div key={account.id}>
          <p>{account.bank_name} - {account.account_number}</p>
          <p>{account.account_name}</p>
          {account.is_default && <span>Default</span>}
          <button onClick={() => handleSetDefault(account.id)}>Set Default</button>
          <button onClick={() => handleDeleteAccount(account.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// 4. TRANSACTIONS EXAMPLE
// ============================================================================

function TransactionsExample({ userId }: { userId: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    loadTransactions();
  }, [userId]);

  async function loadTransactions() {
    const data = await transactionService.getTransactions(userId);
    setTransactions(data);
    // ✅ Returns all transactions sorted by created_at (newest first)
  }

  return (
    <div>
      <h2>Transactions</h2>
      {transactions.map((tx) => (
        <div key={tx.id}>
          <p>Type: {tx.type}</p>
          <p>Status: {tx.status}</p>
          <p>Amount: {tx.crypto_amount} {tx.crypto_asset}</p>
          {tx.fiat_amount && <p>Fiat: ₦{tx.fiat_amount.toLocaleString()}</p>}
          <p>Created: {new Date(tx.created_at).toLocaleString()}</p>
          {tx.completed_at && (
            <p>Completed: {new Date(tx.completed_at).toLocaleString()}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// 5. DEPOSIT ADDRESSES EXAMPLE
// ============================================================================

function DepositAddressesExample({ userId }: { userId: string }) {
  const [addresses, setAddresses] = useState<DepositAddress[]>([]);

  useEffect(() => {
    loadAddresses();
  }, [userId]);

  async function loadAddresses() {
    const data = await depositAddressService.getDepositAddresses(userId);
    setAddresses(data);
  }

  async function getSpecificAddress() {
    const address = await depositAddressService.getDepositAddress(
      userId,
      'USDC',
      'solana'
    );
    console.log('USDC Solana address:', address?.address);
  }

  return (
    <div>
      <h2>Deposit Addresses</h2>
      {addresses.map((addr) => (
        <div key={addr.id}>
          <p>{addr.asset_symbol} on {addr.network}</p>
          <p>{addr.address}</p>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// 6. REAL-TIME NOTIFICATIONS EXAMPLE
// ============================================================================

function AppWithNotifications({ userId }: { userId: string }) {
  useEffect(() => {
    // Start listening for real-time updates
    const listener = new NotificationListener(userId);
    listener.start();

    // Cleanup on unmount
    return () => {
      listener.stop();
    };
  }, [userId]);

  return (
    <div>
      {/* Your app content */}
      {/* Notifications will appear automatically when: */}
      {/* - Transaction status changes */}
      {/* - KYC status changes */}
      {/* - Deposits are detected */}
      {/* - Payouts complete */}
    </div>
  );
}

// ============================================================================
// 7. COMPLETE APP EXAMPLE
// ============================================================================

function CompleteAppExample() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  async function initializeApp() {
    // Check if user is logged in
    const currentUser = await authService.getCurrentUser();
    
    if (currentUser) {
      setUser(currentUser);
      
      // Load user profile
      const userProfile = await userService.getProfile(currentUser.id);
      setProfile(userProfile);
      
      // Start real-time notifications
      const listener = new NotificationListener(currentUser.id);
      listener.start();
    }
    
    setLoading(false);
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return (
      <div>
        {/* Show login/signup screen */}
        <AuthExample />
      </div>
    );
  }

  return (
    <div>
      {/* User is logged in */}
      <AppWithNotifications userId={user.id} />
      
      {/* Show different screens based on navigation */}
      <ProfileExample userId={user.id} />
      <BankAccountsExample userId={user.id} />
      <TransactionsExample userId={user.id} />
      <DepositAddressesExample userId={user.id} />
    </div>
  );
}

export default CompleteAppExample;

