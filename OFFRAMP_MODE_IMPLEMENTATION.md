# 🎯 Offramp Mode Implementation Guide

## ✅ COMPLETE! Both Automatic and Basic Modes Supported

Your app now supports **both offramp modes** with user choice!

---

## 🔄 The Two Modes

### **BASIC Mode (Manual/Recommended)** ⭐
```
User deposits USDC → Crypto stays in wallet → User sees balance → User clicks "Cash Out" → Converts to NGN
```

**Benefits:**
- ✅ Users can hold crypto
- ✅ See crypto balances in app
- ✅ More control over when to cash out
- ✅ Can batch multiple deposits
- ✅ Better for crypto-savvy users

### **AUTOMATIC Mode (Instant)**
```
User deposits USDC → Auto-converts to NGN → Sends to bank immediately
```

**Benefits:**
- ✅ Instant cashouts
- ✅ Simpler for non-crypto users
- ✅ No manual trigger needed
- ✅ Good for remittance

---

## 📊 What Was Implemented

### 1. Database Changes ✅

**Users Table:**
```sql
ALTER TABLE users 
ADD COLUMN offramp_mode VARCHAR(20) DEFAULT 'basic' 
CHECK (offramp_mode IN ('automatic', 'basic'));
```

**Deposit Addresses Table:**
```sql
ALTER TABLE deposit_addresses 
ADD COLUMN wallet_type VARCHAR(20) DEFAULT 'basic' 
CHECK (wallet_type IN ('automatic', 'basic'));

ADD COLUMN bread_wallet_id VARCHAR(255);
ADD COLUMN bread_wallet_type VARCHAR(20);
ADD COLUMN bread_synced_at TIMESTAMP WITH TIME ZONE;
```

### 2. Backend API Changes ✅

#### **Signup Endpoint** (`POST /api/auth/signup`)
```typescript
// Request
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "offrampMode": "basic"  // ← NEW! Optional, defaults to 'basic'
}

// Response
{
  "user": {...},
  "session": {...},
  "offrampMode": "basic"
}
```

#### **Update Offramp Mode** (`PATCH /api/auth/offramp-mode`)
```typescript
// Request
{
  "offrampMode": "automatic"  // or "basic"
}

// Response
{
  "message": "Offramp mode updated successfully",
  "offrampMode": "automatic"
}
```

#### **Get User Preferences** (`GET /api/auth/preferences`)
```typescript
// Response
{
  "offrampMode": "basic"
}
```

#### **Get Crypto Balances** (`GET /api/deposits/crypto-balances`)
```typescript
// Response (for basic mode users)
{
  "balances": {
    "usdc-solana": 100.5,
    "usdt-solana": 50.0,
    "usdc-base": 25.0
  }
}
```

### 3. Deposit Address Generation ✅

Now respects user's `offramp_mode` preference:

```typescript
// When user requests deposit address
GET /api/deposits/addresses

// Backend checks user.offramp_mode
// Creates wallet with matching wallet_type
// Returns address with walletType
{
  "addresses": [
    {
      "chain": "solana",
      "asset": "USDC",
      "address": "...",
      "walletType": "basic"  // ← NEW!
    }
  ]
}
```

### 4. Offramp Execution ✅

Already works for both modes!

**Basic Mode Flow:**
1. User deposits → Crypto stays in wallet
2. User sees balance via `/crypto-balances`
3. User clicks "Cash Out" → Calls `/payouts/execute`
4. Backend checks database balance
5. Calls Bread offramp API
6. Marks deposits as "swept"

**Automatic Mode Flow:**
1. User deposits → Bread auto-converts
2. Money sent to bank immediately
3. No manual trigger needed

---

## 🚀 How to Use (Frontend Integration)

### Step 1: Update Signup Screen

Add offramp mode selection during signup:

```typescript
// src/components/SignupScreen.tsx
const [offrampMode, setOfframpMode] = useState<'basic' | 'automatic'>('basic');

// In signup form
<View>
  <Text>How do you want to receive money?</Text>
  
  <TouchableOpacity 
    onPress={() => setOfframpMode('basic')}
    style={offrampMode === 'basic' ? styles.selected : styles.option}
  >
    <Text>💎 Hold Crypto (Recommended)</Text>
    <Text>Deposit crypto, cash out when you want</Text>
  </TouchableOpacity>
  
  <TouchableOpacity 
    onPress={() => setOfframpMode('automatic')}
    style={offrampMode === 'automatic' ? styles.selected : styles.option}
  >
    <Text>⚡ Instant Cashout</Text>
    <Text>Auto-convert to NGN immediately</Text>
  </TouchableOpacity>
</View>

// When calling signup
await authService.signUp(email, password, fullName, offrampMode);
```

### Step 2: Update Auth Service

```typescript
// src/services/supabase.ts
async signUp(
  email: string, 
  password: string, 
  fullName?: string,
  offrampMode?: 'automatic' | 'basic'
) {
  const response = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      email, 
      password, 
      name: fullName,
      offrampMode: offrampMode || 'basic'
    }),
  });
  
  const data = await response.json();
  return data;
}
```

### Step 3: Show Crypto Balance (Basic Mode Only)

```typescript
// src/components/HomeScreen.tsx
const [cryptoBalances, setCryptoBalances] = useState({});
const [offrampMode, setOfframpMode] = useState('basic');

useEffect(() => {
  // Get user preference
  fetch(`${API_URL}/auth/preferences`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  .then(res => res.json())
  .then(data => setOfframpMode(data.offrampMode));
  
  // If basic mode, show crypto balances
  if (offrampMode === 'basic') {
    fetch(`${API_URL}/deposits/crypto-balances`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setCryptoBalances(data.balances));
  }
}, [offrampMode]);

// In render
{offrampMode === 'basic' && (
  <View>
    <Text>Your Crypto</Text>
    <Text>{cryptoBalances['usdc-solana']} USDC (Solana)</Text>
    <Text>{cryptoBalances['usdt-solana']} USDT (Solana)</Text>
    <Text>{cryptoBalances['usdc-base']} USDC (Base)</Text>
  </View>
)}
```

### Step 4: Add Settings to Change Mode

```typescript
// src/components/SettingsScreen.tsx
const updateOfframpMode = async (mode: 'automatic' | 'basic') => {
  const response = await fetch(`${API_URL}/auth/offramp-mode`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ offrampMode: mode }),
  });
  
  if (response.ok) {
    toast.success('Offramp mode updated!');
    setOfframpMode(mode);
  }
};
```

---

## 🧪 Testing

### Test Basic Mode (Recommended)

1. **Sign up with basic mode:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "password123",
       "name": "Test User",
       "offrampMode": "basic"
     }'
   ```

2. **Get deposit address:**
   ```bash
   curl http://localhost:3001/api/deposits/addresses \
     -H "Authorization: Bearer <token>"
   ```

3. **Deposit 0.5 USDC** to the address

4. **Check crypto balance:**
   ```bash
   curl http://localhost:3001/api/deposits/crypto-balances \
     -H "Authorization: Bearer <token>"
   ```
   
   Expected:
   ```json
   {
     "balances": {
       "usdc-solana": 0.5
     }
   }
   ```

5. **Cash out:**
   - Get quote
   - Execute offramp
   - Money sent to bank!

### Test Automatic Mode

1. **Sign up with automatic mode:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test2@example.com",
       "password": "password123",
       "name": "Test User 2",
       "offrampMode": "automatic"
     }'
   ```

2. **Add bank account first** (required for automatic mode)

3. **Deposit USDC** → Should auto-convert and send to bank

---

## 📝 Migration for Existing Users

All existing users are set to **basic mode** by default (safer):

```sql
UPDATE users 
SET offramp_mode = 'basic' 
WHERE offramp_mode IS NULL;
```

They can change to automatic mode in settings if they want.

---

## 🎯 Recommendation

**Default to BASIC mode** because:
1. ✅ More flexible
2. ✅ Users can hold crypto
3. ✅ Better user experience
4. ✅ More control
5. ✅ Can always switch to automatic later

---

## 📊 Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Database schema | ✅ Complete | Added offramp_mode and wallet_type |
| Signup with mode | ✅ Complete | Optional parameter, defaults to 'basic' |
| Update mode API | ✅ Complete | Users can change preference |
| Get preferences API | ✅ Complete | Fetch current mode |
| Crypto balance API | ✅ Complete | For basic mode users |
| Deposit generation | ✅ Complete | Respects user preference |
| Offramp execution | ✅ Complete | Works for both modes |
| Migration script | ✅ Complete | Existing users → basic mode |

**Everything is ready! Just update your frontend to support mode selection.** 🎉


