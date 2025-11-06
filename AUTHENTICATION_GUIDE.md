# 🔐 Authentication Guide - SolPay

## ✅ **YOUR AUTHENTICATION IS ALREADY SET UP!**

Your frontend already has a complete authentication system that works with your backend. Here's how to use it.

---

## 📱 **How Authentication Works**

### **Flow:**

```
1. User Signs Up/Logs In
   ↓
2. Backend Returns JWT Token
   ↓
3. Frontend Stores Token in localStorage
   ↓
4. All API Requests Include Token Automatically
   ↓
5. Backend Verifies Token
   ↓
6. Returns Protected Data
```

---

## 🔧 **Setup Instructions**

### **Step 1: Environment Variables**

I've created two environment files for you:

**`.env.local`** (for local development):
```env
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://xojmrgsyshjoddylwxti.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**`.env.production`** (for production deployment):
```env
VITE_API_URL=https://solanapay-xmli.onrender.com
VITE_SUPABASE_URL=https://xojmrgsyshjoddylwxti.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **Step 2: Using the API Client**

Your `src/services/api.ts` already handles authentication automatically!

---

## 📚 **API Usage Examples**

### **1. Authentication (No Token Required)**

```typescript
import { authApi } from './services/api';

// Sign Up
const { user, session } = await authApi.signup(
  'user@example.com',
  'password123',
  'John Doe'
);
// Token is automatically stored in localStorage

// Login
const { user, session } = await authApi.login(
  'user@example.com',
  'password123'
);
// Token is automatically stored in localStorage

// Logout
await authApi.logout();
// Token is automatically removed from localStorage
```

---

### **2. Quotes (Token Required)**

```typescript
import { quotesApi } from './services/api';

// Get exchange rate
const rate = await quotesApi.getRate('USDC', 'solana');
console.log(rate); // { rate: 1650.50, ... }

// Create quote
const quote = await quotesApi.createQuote({
  asset: 'USDC',
  chain: 'solana',
  crypto_amount: '10',
  fiat_currency: 'NGN'
});
console.log(quote); // { id: '...', crypto_amount: '10', fiat_amount: '16505', ... }
```

---

### **3. Deposits (Token Required)**

```typescript
import { depositsApi } from './services/api';

// Generate deposit address
const address = await depositsApi.generateAddress({
  asset: 'USDC',
  chain: 'solana',
  quote_id: 'quote-uuid-here'
});
console.log(address); // { address: 'ABC123...', qr_code: 'data:image/png;base64,...' }

// Get deposit status
const status = await depositsApi.getDepositStatus('deposit-uuid');
console.log(status); // { status: 'pending', confirmations: 0, ... }
```

---

### **4. Payouts (Token Required)**

```typescript
import { payoutsApi } from './services/api';

// Get list of banks
const banks = await payoutsApi.getBanks();
console.log(banks); // [{ code: '044', name: 'Access Bank', ... }, ...]

// Verify bank account
const verification = await payoutsApi.verifyAccount({
  account_number: '0123456789',
  bank_code: '044'
});
console.log(verification); // { account_name: 'John Doe', verified: true }

// Create beneficiary
const beneficiary = await payoutsApi.createBeneficiary({
  bank_code: '044',
  account_number: '0123456789',
  account_name: 'John Doe'
});

// Get beneficiaries
const beneficiaries = await payoutsApi.getBeneficiaries();

// Create payout
const payout = await payoutsApi.createPayout({
  quote_id: 'quote-uuid',
  beneficiary_id: 'beneficiary-uuid'
});
```

---

### **5. KYC (Token Required)**

```typescript
import { kycApi } from './services/api';

// Get Sumsub access token
const { token, applicantId } = await kycApi.getSumsubToken();

// Use token with Sumsub Web SDK
// (See KYC_INTEGRATION_GUIDE.md for full implementation)
```

---

### **6. Transactions (Token Required)**

```typescript
import { transactionsApi } from './services/api';

// Get all transactions
const { transactions } = await transactionsApi.getAll();

// Get deposits only
const { transactions } = await transactionsApi.getAll('deposit', 10);

// Get specific transaction
const { transaction } = await transactionsApi.getTransaction('tx-uuid');
```

---

## 🔒 **How Token Authentication Works**

### **Automatic Token Handling:**

The `apiRequest` function in `src/services/api.ts` automatically:

1. **Gets token from localStorage**
2. **Adds it to Authorization header**
3. **Sends request to backend**
4. **Handles errors (401 = unauthorized)**

```typescript
// This happens automatically!
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken(); // Get from localStorage
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`; // Add token
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle errors
  if (!response.ok) {
    throw new ApiError(response.status, 'Request failed');
  }

  return response.json();
}
```

---

## 🚨 **Error Handling**

### **401 Unauthorized:**

If the token is invalid or expired, the API will return 401:

```typescript
try {
  const rate = await quotesApi.getRate('USDC', 'solana');
} catch (error) {
  if (error instanceof ApiError && error.status === 401) {
    // Token expired - redirect to login
    clearAuthToken();
    window.location.href = '/login';
  }
}
```

---

## 📊 **Complete API Endpoints**

| Endpoint | Method | Auth Required | Function |
|----------|--------|---------------|----------|
| `/api/auth/signup` | POST | ❌ No | `authApi.signup()` |
| `/api/auth/login` | POST | ❌ No | `authApi.login()` |
| `/api/auth/logout` | POST | ✅ Yes | `authApi.logout()` |
| `/api/auth/otp/send` | POST | ❌ No | `authApi.requestOTP()` |
| `/api/auth/otp/verify` | POST | ❌ No | `authApi.verifyOTP()` |
| `/api/quotes/rate` | GET | ✅ Yes | `quotesApi.getRate()` |
| `/api/quotes/create` | POST | ✅ Yes | `quotesApi.createQuote()` |
| `/api/deposits/address` | POST | ✅ Yes | `depositsApi.generateAddress()` |
| `/api/deposits/:id` | GET | ✅ Yes | `depositsApi.getDepositStatus()` |
| `/api/payouts/banks` | GET | ✅ Yes | `payoutsApi.getBanks()` |
| `/api/payouts/verify-account` | POST | ✅ Yes | `payoutsApi.verifyAccount()` |
| `/api/payouts/beneficiaries` | GET | ✅ Yes | `payoutsApi.getBeneficiaries()` |
| `/api/payouts/beneficiaries` | POST | ✅ Yes | `payoutsApi.createBeneficiary()` |
| `/api/payouts` | POST | ✅ Yes | `payoutsApi.createPayout()` |
| `/api/kyc/token` | POST | ✅ Yes | `kycApi.getSumsubToken()` |
| `/api/transactions` | GET | ✅ Yes | `transactionsApi.getAll()` |
| `/api/transactions/:id` | GET | ✅ Yes | `transactionsApi.getTransaction()` |

---

## ✅ **What's Already Working:**

- ✅ Authentication system (signup/login/logout)
- ✅ Automatic token storage in localStorage
- ✅ Automatic token inclusion in API requests
- ✅ Error handling for unauthorized requests
- ✅ Complete API client with all endpoints
- ✅ TypeScript types for all requests/responses

---

## 🚀 **Next Steps:**

1. **Test locally:**
   ```bash
   npm run dev
   ```
   - Frontend will use `http://localhost:3001` (local backend)

2. **Deploy to production:**
   ```bash
   npm run build
   ```
   - Frontend will use `https://solanapay-xmli.onrender.com` (live backend)

3. **Test authentication flow:**
   - Sign up a new user
   - Login
   - Make authenticated API calls
   - Check browser DevTools → Application → Local Storage → `auth_token`

---

## 🔍 **Debugging Tips:**

### **Check if user is authenticated:**

```typescript
import { getAuthToken } from './services/api';

const token = getAuthToken();
if (token) {
  console.log('User is authenticated');
} else {
  console.log('User is not authenticated');
}
```

### **View token in browser:**

1. Open DevTools (F12)
2. Go to **Application** tab
3. Click **Local Storage** → `http://localhost:5173`
4. Look for `auth_token`

### **Test API call:**

```typescript
import { quotesApi } from './services/api';

// This will fail if not authenticated
try {
  const rate = await quotesApi.getRate('USDC', 'solana');
  console.log('Success:', rate);
} catch (error) {
  console.error('Failed:', error);
}
```

---

## 📝 **Summary:**

✅ **Authentication is already set up**  
✅ **API client handles tokens automatically**  
✅ **All endpoints are ready to use**  
✅ **Just update environment variables and deploy**  

**You're ready to go!** 🎉

