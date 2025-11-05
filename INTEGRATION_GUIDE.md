# Frontend-Backend Integration Guide

This guide shows how to connect the existing frontend components to the backend API.

## 🔧 Setup

### 1. Install Frontend Dependencies

The API client uses `fetch` which is built-in, but you may want to add these for better UX:

```bash
npm install @tanstack/react-query  # For data fetching and caching
npm install zustand                # For state management (optional)
```

### 2. Configure Environment

Create `.env` in the frontend root:

```env
VITE_API_URL=http://localhost:3001
```

### 3. Start Both Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
npm run dev
```

## 📝 Integration Examples

### Example 1: AuthScreen.tsx

Replace mock authentication with real API calls:

```typescript
import { authApi } from '../services/api';

// In your login handler:
const handleLogin = async (email: string, password: string) => {
  try {
    setLoading(true);
    const { user, session } = await authApi.login(email, password);
    
    // Store user data
    setUser(user);
    
    // Navigate to dashboard
    navigate('/dashboard');
  } catch (error) {
    console.error('Login failed:', error);
    toast.error(error.message || 'Login failed');
  } finally {
    setLoading(false);
  }
};

// In your signup handler:
const handleSignup = async (email: string, password: string) => {
  try {
    setLoading(true);
    const { user, session } = await authApi.signup(email, password);
    
    setUser(user);
    navigate('/dashboard');
  } catch (error) {
    console.error('Signup failed:', error);
    toast.error(error.message || 'Signup failed');
  } finally {
    setLoading(false);
  }
};
```

### Example 2: Dashboard.tsx

Fetch real balances and user data:

```typescript
import { depositsApi, transactionsApi } from '../services/api';
import { useEffect, useState } from 'react';

function Dashboard() {
  const [balances, setBalances] = useState({
    usdcSolana: 0,
    usdcBase: 0,
    sol: 0,
    usdtSolana: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch balances
      const { balances: fetchedBalances } = await depositsApi.getBalances();
      setBalances(fetchedBalances);
      
      // Fetch recent transactions
      const { transactions } = await transactionsApi.getAll(undefined, 5);
      setRecentTransactions(transactions);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate total in NGN
  const totalNGN = 
    balances.usdcSolana * 1600 +
    balances.usdcBase * 1600 +
    balances.sol * 200 * 1600 +
    balances.usdtSolana * 1600;

  return (
    <div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="balance-card">
            <h2>Total Balance</h2>
            <p className="text-3xl">₦{totalNGN.toLocaleString()}</p>
          </div>
          
          <div className="assets">
            <AssetCard name="USDC (Solana)" amount={balances.usdcSolana} />
            <AssetCard name="USDC (Base)" amount={balances.usdcBase} />
            <AssetCard name="SOL" amount={balances.sol} />
            <AssetCard name="USDT" amount={balances.usdtSolana} />
          </div>
          
          <div className="recent-transactions">
            {recentTransactions.map(tx => (
              <TransactionItem key={tx.id} transaction={tx} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

### Example 3: DepositScreen.tsx

Get real deposit addresses:

```typescript
import { depositsApi } from '../services/api';
import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';

function DepositScreen() {
  const [addresses, setAddresses] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState('USDC');
  const [selectedChain, setSelectedChain] = useState('solana');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const { addresses: fetchedAddresses } = await depositsApi.getAddresses();
      setAddresses(fetchedAddresses);
    } catch (error) {
      console.error('Failed to load addresses:', error);
      toast.error('Failed to load deposit addresses');
    } finally {
      setLoading(false);
    }
  };

  const currentAddress = addresses.find(
    addr => addr.asset === selectedAsset && addr.chain === selectedChain
  );

  return (
    <div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div className="asset-selector">
            <button onClick={() => setSelectedAsset('USDC')}>USDC</button>
            <button onClick={() => setSelectedAsset('SOL')}>SOL</button>
            <button onClick={() => setSelectedAsset('USDT')}>USDT</button>
          </div>
          
          {selectedAsset === 'USDC' && (
            <div className="chain-selector">
              <button onClick={() => setSelectedChain('solana')}>Solana</button>
              <button onClick={() => setSelectedChain('base')}>Base</button>
            </div>
          )}
          
          {currentAddress && (
            <div className="address-display">
              <QRCode value={currentAddress.address} />
              <p className="address">{currentAddress.address}</p>
              <button onClick={() => navigator.clipboard.writeText(currentAddress.address)}>
                Copy Address
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

### Example 4: OfframpScreen.tsx

Create quotes and execute payouts:

```typescript
import { quotesApi, payoutsApi } from '../services/api';
import { useState } from 'react';

function OfframpScreen() {
  const [step, setStep] = useState(1); // 1: amount, 2: quote, 3: bank, 4: confirm
  const [amount, setAmount] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('USDC');
  const [selectedChain, setSelectedChain] = useState('base');
  const [quote, setQuote] = useState(null);
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCreateQuote = async () => {
    try {
      setLoading(true);
      const response = await quotesApi.createQuote({
        asset: selectedAsset,
        chain: selectedChain,
        crypto_amount: parseFloat(amount),
      });
      
      setQuote(response.quote);
      setStep(2);
    } catch (error) {
      console.error('Failed to create quote:', error);
      toast.error(error.message || 'Failed to create quote');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadBeneficiaries = async () => {
    try {
      const { beneficiaries: fetchedBeneficiaries } = await payoutsApi.getBeneficiaries();
      setBeneficiaries(fetchedBeneficiaries);
      setStep(3);
    } catch (error) {
      console.error('Failed to load beneficiaries:', error);
      toast.error('Failed to load bank accounts');
    }
  };

  const handleConfirmPayout = async () => {
    try {
      setLoading(true);
      const response = await payoutsApi.confirmPayout(
        quote.id,
        selectedBeneficiary.id
      );
      
      toast.success('Payout initiated successfully!');
      navigate('/transactions');
    } catch (error) {
      console.error('Payout failed:', error);
      toast.error(error.message || 'Payout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {step === 1 && (
        <div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
          />
          <button onClick={handleCreateQuote} disabled={!amount || loading}>
            Get Quote
          </button>
        </div>
      )}
      
      {step === 2 && quote && (
        <div>
          <h3>Quote Preview</h3>
          <p>You send: {quote.crypto_amount} {quote.asset}</p>
          <p>You receive: ₦{parseFloat(quote.fiat_amount).toLocaleString()}</p>
          <p>Rate: ₦{parseFloat(quote.spot_price).toLocaleString()}</p>
          <p>Fee: ₦{parseFloat(quote.total_fee).toLocaleString()}</p>
          <button onClick={handleLoadBeneficiaries}>Continue</button>
        </div>
      )}
      
      {step === 3 && (
        <div>
          <h3>Select Bank Account</h3>
          {beneficiaries.map(ben => (
            <div
              key={ben.id}
              onClick={() => {
                setSelectedBeneficiary(ben);
                setStep(4);
              }}
            >
              <p>{ben.bank_name}</p>
              <p>{ben.account_number} - {ben.account_name}</p>
            </div>
          ))}
        </div>
      )}
      
      {step === 4 && (
        <div>
          <h3>Confirm Payout</h3>
          <p>Amount: ₦{parseFloat(quote.fiat_amount).toLocaleString()}</p>
          <p>To: {selectedBeneficiary.account_name}</p>
          <p>Bank: {selectedBeneficiary.bank_name}</p>
          <button onClick={handleConfirmPayout} disabled={loading}>
            Confirm Payout
          </button>
        </div>
      )}
    </div>
  );
}
```

### Example 5: KYCScreen.tsx

Submit KYC information:

```typescript
import { kycApi } from '../services/api';
import { useState, useEffect } from 'react';

function KYCScreen() {
  const [kycStatus, setKycStatus] = useState(null);
  const [step, setStep] = useState(1);
  const [bvn, setBvn] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadKYCStatus();
  }, []);

  const loadKYCStatus = async () => {
    try {
      const status = await kycApi.getStatus();
      setKycStatus(status);
    } catch (error) {
      console.error('Failed to load KYC status:', error);
    }
  };

  const handleStartKYC = async () => {
    try {
      setLoading(true);
      await kycApi.startKYC(1); // Start Tier 1
      setStep(2);
    } catch (error) {
      console.error('Failed to start KYC:', error);
      toast.error('Failed to start KYC');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBVN = async () => {
    try {
      setLoading(true);
      await kycApi.submitBVN(bvn, dateOfBirth);
      setStep(3);
    } catch (error) {
      console.error('BVN submission failed:', error);
      toast.error('BVN verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteKYC = async () => {
    try {
      setLoading(true);
      const result = await kycApi.completeKYC();
      toast.success(`KYC approved! You are now Tier ${result.kyc_tier}`);
      loadKYCStatus();
    } catch (error) {
      console.error('KYC completion failed:', error);
      toast.error('KYC completion failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {kycStatus?.kyc_status === 'approved' ? (
        <div>
          <h2>KYC Verified ✓</h2>
          <p>Tier: {kycStatus.kyc_tier}</p>
        </div>
      ) : (
        <>
          {step === 1 && (
            <button onClick={handleStartKYC}>Start KYC Verification</button>
          )}
          
          {step === 2 && (
            <div>
              <input
                type="text"
                value={bvn}
                onChange={(e) => setBvn(e.target.value)}
                placeholder="Enter BVN"
                maxLength={11}
              />
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
              <button onClick={handleSubmitBVN} disabled={loading}>
                Submit BVN
              </button>
            </div>
          )}
          
          {step === 3 && (
            <div>
              <p>BVN submitted successfully!</p>
              <button onClick={handleCompleteKYC} disabled={loading}>
                Complete Verification
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

## 🔄 Using React Query (Recommended)

For better data fetching, caching, and state management:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { depositsApi } from '../services/api';

function Dashboard() {
  const queryClient = useQueryClient();

  // Fetch balances with auto-refetch
  const { data: balances, isLoading } = useQuery({
    queryKey: ['balances'],
    queryFn: () => depositsApi.getBalances(),
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Fetch transactions
  const { data: transactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => transactionsApi.getAll(undefined, 10),
  });

  return (
    <div>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div>
          <p>Total: ₦{calculateTotal(balances.balances)}</p>
        </div>
      )}
    </div>
  );
}
```

## 🎯 Next Steps

1. **Update App.tsx** to handle authentication state
2. **Add loading states** to all components
3. **Add error boundaries** for better error handling
4. **Test each flow** end-to-end
5. **Add optimistic updates** for better UX
6. **Implement real-time updates** using polling or WebSockets

## 🐛 Debugging Tips

1. **Check browser console** for API errors
2. **Check backend logs**: `cd backend && npm run dev | pino-pretty`
3. **Use browser DevTools** Network tab to inspect requests
4. **Check authentication**: Make sure token is being sent
5. **Verify CORS**: Check that frontend URL is in backend CORS_ORIGIN

## ✅ Testing Checklist

- [ ] User can sign up
- [ ] User can login
- [ ] User can see deposit addresses
- [ ] User can see balances
- [ ] User can create quotes
- [ ] User can add bank accounts
- [ ] User can execute payouts
- [ ] User can complete KYC
- [ ] User can view transaction history
- [ ] Admin can view dashboard
- [ ] Webhooks are processed correctly

Happy integrating! 🚀

