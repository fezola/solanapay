# 💱 Rate & Quote API Documentation

## Overview

Your SolPay backend now has **two new endpoints** to fetch real-time exchange rates from Bread Africa:

1. **GET /api/payouts/rate** - Get current exchange rate (simple)
2. **POST /api/payouts/quote** - Get precise quote with fees (recommended for UX)

---

## 🎯 When to Use Each Endpoint

### Use `/rate` for:
- ✅ Displaying "today's rate" on dashboard
- ✅ Quick price checks
- ✅ Real-time rate updates in UI
- ✅ Showing approximate conversions

### Use `/quote` for:
- ✅ **Actual cash-out flow** (user presses "Cash out 50 USDC")
- ✅ Showing exact amount user will receive
- ✅ Displaying fees
- ✅ Time-limited quotes with expiry

---

## 📡 API Endpoints

### 1. GET /api/payouts/rate

Get the current exchange rate for crypto → NGN.

**Endpoint:**
```
GET /api/payouts/rate?asset=USDC&chain=solana&currency=NGN
```

**Query Parameters:**
| Parameter | Type | Required | Default | Options |
|-----------|------|----------|---------|---------|
| `asset` | string | No | `USDC` | `USDC`, `SOL`, `USDT`, `ETH` |
| `chain` | string | No | `solana` | `solana`, `base` |
| `currency` | string | No | `NGN` | `NGN` |

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Example Request:**
```bash
curl -X GET "http://localhost:3001/api/payouts/rate?asset=USDC&chain=solana&currency=NGN" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response (200):**
```json
{
  "asset": "USDC",
  "chain": "solana",
  "currency": "NGN",
  "rate": 1446.50,
  "provider": "bread",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Error Response (400/500):**
```json
{
  "error": "Failed to fetch rate",
  "message": "Asset not supported",
  "bread_error": {
    "code": "INVALID_ASSET",
    "details": "..."
  }
}
```

**Use Case:**
```javascript
// Display current rate on dashboard
const response = await fetch('/api/payouts/rate?asset=USDC&chain=solana');
const data = await response.json();

console.log(`1 USDC = ₦${data.rate.toLocaleString()}`);
// Output: "1 USDC = ₦1,446.50"
```

---

### 2. POST /api/payouts/quote

Get a precise quote for a specific amount with fees and expiry.

**Endpoint:**
```
POST /api/payouts/quote
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `asset` | string | Yes | Crypto asset (`USDC`, `SOL`, `USDT`, `ETH`) |
| `chain` | string | Yes | Blockchain (`solana`, `base`) |
| `amount` | number | Yes | Amount in crypto (must be positive) |
| `currency` | string | No | Fiat currency (default: `NGN`) |

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Example Request:**
```bash
curl -X POST "http://localhost:3001/api/payouts/quote" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "asset": "USDC",
    "chain": "solana",
    "amount": 50,
    "currency": "NGN"
  }'
```

**Success Response (200):**
```json
{
  "asset": "USDC",
  "chain": "solana",
  "currency": "NGN",
  "input_amount": 50,
  "rate": 1446.50,
  "output_amount": 72300.00,
  "fee": 25.00,
  "expiry": "2024-01-15T10:35:00.000Z",
  "provider": "bread",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "display": {
    "you_send": "50 USDC",
    "you_receive": "₦72,300.00",
    "rate_display": "1 USDC = ₦1,446.50",
    "fee_display": "₦25.00",
    "expires_in": "300s"
  }
}
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `input_amount` | number | Amount of crypto you're sending |
| `rate` | number | Exchange rate (NGN per crypto) |
| `output_amount` | number | Amount of NGN you'll receive (after fees) |
| `fee` | number | Bread's fee in NGN |
| `expiry` | string | ISO timestamp when quote expires |
| `display` | object | Pre-formatted strings for UI display |

**Error Response (400/500):**
```json
{
  "error": "Failed to get quote",
  "message": "Amount too low",
  "bread_error": {
    "code": "AMOUNT_TOO_LOW",
    "minimum": 10,
    "details": "Minimum amount is 10 USDC"
  }
}
```

**Use Case:**
```javascript
// User wants to cash out 50 USDC
const response = await fetch('/api/payouts/quote', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    asset: 'USDC',
    chain: 'solana',
    amount: 50,
  }),
});

const quote = await response.json();

// Show in UI:
console.log(quote.display.you_send);      // "50 USDC"
console.log(quote.display.you_receive);   // "₦72,300.00"
console.log(quote.display.rate_display);  // "1 USDC = ₦1,446.50"
console.log(quote.display.fee_display);   // "₦25.00"
console.log(quote.display.expires_in);    // "300s"
```

---

## 🎨 Frontend Integration Examples

### Example 1: Show Current Rate on Dashboard

```typescript
// In your dashboard component
const [currentRate, setCurrentRate] = useState<number | null>(null);

useEffect(() => {
  async function fetchRate() {
    const response = await fetch('/api/payouts/rate?asset=USDC&chain=solana', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });
    
    const data = await response.json();
    setCurrentRate(data.rate);
  }

  fetchRate();
  
  // Update every 30 seconds
  const interval = setInterval(fetchRate, 30000);
  return () => clearInterval(interval);
}, []);

return (
  <div>
    <h3>Current Rate</h3>
    <p>1 USDC = ₦{currentRate?.toLocaleString('en-NG')}</p>
  </div>
);
```

### Example 2: Cash-Out Flow with Quote

```typescript
// In your cash-out screen
const [amount, setAmount] = useState<number>(0);
const [quote, setQuote] = useState<any>(null);
const [loading, setLoading] = useState(false);

async function getQuote() {
  if (amount <= 0) return;
  
  setLoading(true);
  
  try {
    const response = await fetch('/api/payouts/quote', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        asset: 'USDC',
        chain: 'solana',
        amount: amount,
      }),
    });
    
    const data = await response.json();
    setQuote(data);
  } catch (error) {
    console.error('Failed to get quote:', error);
  } finally {
    setLoading(false);
  }
}

return (
  <div>
    <input
      type="number"
      value={amount}
      onChange={(e) => setAmount(parseFloat(e.target.value))}
      placeholder="Enter amount in USDC"
    />
    
    <button onClick={getQuote} disabled={loading}>
      {loading ? 'Getting quote...' : 'Get Quote'}
    </button>
    
    {quote && (
      <div className="quote-summary">
        <h3>Quote Summary</h3>
        <p>You send: {quote.display.you_send}</p>
        <p>You receive: {quote.display.you_receive}</p>
        <p>Rate: {quote.display.rate_display}</p>
        <p>Fee: {quote.display.fee_display}</p>
        <p>Expires in: {quote.display.expires_in}</p>
        
        <button onClick={() => proceedWithCashout(quote)}>
          Confirm Cash Out
        </button>
      </div>
    )}
  </div>
);
```

---

## 🔍 Error Handling

Both endpoints return detailed error information from Bread:

```typescript
async function fetchQuote(amount: number) {
  try {
    const response = await fetch('/api/payouts/quote', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        asset: 'USDC',
        chain: 'solana',
        amount,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // Handle specific errors
      if (data.bread_error?.code === 'AMOUNT_TOO_LOW') {
        alert(`Minimum amount is ${data.bread_error.minimum} USDC`);
      } else if (data.bread_error?.code === 'ASSET_NOT_SUPPORTED') {
        alert('This asset is not supported');
      } else {
        alert(data.message || 'Failed to get quote');
      }
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Network error:', error);
    alert('Network error. Please try again.');
    return null;
  }
}
```

---

## 🧪 Testing

### Test with curl:

```bash
# 1. Get current rate
curl -X GET "http://localhost:3001/api/payouts/rate?asset=USDC&chain=solana" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Get quote for 50 USDC
curl -X POST "http://localhost:3001/api/payouts/quote" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"asset":"USDC","chain":"solana","amount":50}'
```

### Test with Node.js script:

```bash
# Run the test script
node backend/test-rate-endpoints.js YOUR_AUTH_TOKEN
```

---

## 📊 Supported Assets

| Asset | Chains | Bread Asset String |
|-------|--------|-------------------|
| USDC | solana | `solana:usdc` |
| USDC | base | `base:usdc` |
| SOL | solana | `solana:sol` |
| USDT | solana | `solana:usdt` |
| ETH | ethereum | `ethereum:eth` |

**Note:** Check your Bread dashboard to confirm which assets are enabled for your account.

---

## 🚀 Next Steps

1. ✅ **Test the endpoints** using the test script
2. ✅ **Integrate into your frontend** cash-out flow
3. ✅ **Show real-time rates** on your dashboard
4. ✅ **Display quote with expiry** before user confirms
5. ✅ **Handle errors gracefully** with user-friendly messages

---

## 💡 Best Practices

1. **Always use `/quote` for actual transactions** - It gives you exact amounts with fees
2. **Show expiry time** - Quotes expire (usually 60-300 seconds)
3. **Refresh quotes** - If user takes too long, get a new quote
4. **Handle errors** - Show Bread's error messages to help users
5. **Cache rates** - Don't fetch `/rate` on every render, use intervals
6. **Validate amounts** - Check minimum/maximum before calling quote

---

## 🔐 Security Notes

- ✅ Both endpoints require authentication (JWT token)
- ✅ Rates are fetched server-side (Bread API key is secure)
- ✅ No sensitive data exposed to frontend
- ✅ Errors include Bread's response for debugging (safe to show in dev mode)

