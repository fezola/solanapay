# 🎨 Frontend Rate Integration Guide

## Overview

This guide shows you how to integrate the new rate and quote APIs into your SolPay frontend to display real-time exchange rates and precise quotes.

---

## 📦 Available API Functions

The `payoutsApi` service now has two new functions:

```typescript
import { payoutsApi } from './services/api';

// 1. Get current exchange rate
const rateData = await payoutsApi.getRate('USDC', 'solana', 'NGN');

// 2. Get precise quote with fees
const quoteData = await payoutsApi.getQuote('USDC', 'solana', 50, 'NGN');
```

---

## 🎯 Use Case 1: Display Current Rate on Dashboard

Add a live rate ticker to your dashboard that updates every 30 seconds.

### Example Component: `RateTicker.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { payoutsApi } from '../services/api';

interface RateTickerProps {
  asset?: string;
  chain?: string;
}

export function RateTicker({ asset = 'USDC', chain = 'solana' }: RateTickerProps) {
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRate() {
      try {
        setLoading(true);
        const data = await payoutsApi.getRate(asset, chain);
        setRate(data.rate);
        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch rate:', err);
        setError(err.message || 'Failed to fetch rate');
      } finally {
        setLoading(false);
      }
    }

    // Fetch immediately
    fetchRate();

    // Update every 30 seconds
    const interval = setInterval(fetchRate, 30000);

    return () => clearInterval(interval);
  }, [asset, chain]);

  if (loading && !rate) {
    return (
      <div className="rate-ticker loading">
        <span>Loading rate...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rate-ticker error">
        <span>Rate unavailable</span>
      </div>
    );
  }

  return (
    <div className="rate-ticker">
      <div className="rate-label">Current Rate</div>
      <div className="rate-value">
        1 {asset} = ₦{rate?.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div className="rate-chain">{chain}</div>
    </div>
  );
}
```

### Usage:

```tsx
import { RateTicker } from './components/RateTicker';

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <RateTicker asset="USDC" chain="solana" />
    </div>
  );
}
```

---

## 🎯 Use Case 2: Cash-Out Flow with Quote

Show users exactly how much NGN they'll receive when cashing out crypto.

### Example Component: `CashOutQuote.tsx`

```typescript
import React, { useState } from 'react';
import { payoutsApi } from '../services/api';

interface QuoteData {
  asset: string;
  chain: string;
  input_amount: number;
  rate: number;
  output_amount: number;
  fee: number;
  expiry: string;
  display: {
    you_send: string;
    you_receive: string;
    rate_display: string;
    fee_display: string;
    expires_in: string;
  };
}

export function CashOutQuote() {
  const [amount, setAmount] = useState<string>('');
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGetQuote() {
    const numAmount = parseFloat(amount);

    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await payoutsApi.getQuote('USDC', 'solana', numAmount);
      setQuote(data);
    } catch (err: any) {
      console.error('Failed to get quote:', err);
      setError(err.message || 'Failed to get quote');
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }

  function handleProceed() {
    if (!quote) return;
    
    // Navigate to bank selection or next step
    console.log('Proceeding with quote:', quote);
    // navigation.navigate('SelectBank', { quote });
  }

  return (
    <div className="cash-out-quote">
      <h2>Cash Out</h2>

      <div className="input-group">
        <label>Amount (USDC)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          min="0"
          step="0.01"
        />
      </div>

      <button
        onClick={handleGetQuote}
        disabled={loading || !amount}
        className="btn-primary"
      >
        {loading ? 'Getting quote...' : 'Get Quote'}
      </button>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {quote && (
        <div className="quote-summary">
          <h3>Quote Summary</h3>

          <div className="quote-row">
            <span className="label">You send:</span>
            <span className="value">{quote.display.you_send}</span>
          </div>

          <div className="quote-row highlight">
            <span className="label">You receive:</span>
            <span className="value">{quote.display.you_receive}</span>
          </div>

          <div className="quote-row">
            <span className="label">Exchange rate:</span>
            <span className="value">{quote.display.rate_display}</span>
          </div>

          <div className="quote-row">
            <span className="label">Fee:</span>
            <span className="value">{quote.display.fee_display}</span>
          </div>

          <div className="quote-row expires">
            <span className="label">Expires in:</span>
            <span className="value">{quote.display.expires_in}</span>
          </div>

          <button
            onClick={handleProceed}
            className="btn-success"
          >
            Proceed to Bank Selection
          </button>
        </div>
      )}
    </div>
  );
}
```

### Usage:

```tsx
import { CashOutQuote } from './components/CashOutQuote';

function CashOutScreen() {
  return (
    <div>
      <CashOutQuote />
    </div>
  );
}
```

---

## 🎯 Use Case 3: Real-Time Amount Converter

Show live conversion as user types the amount.

### Example Component: `AmountConverter.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { payoutsApi } from '../services/api';

export function AmountConverter() {
  const [cryptoAmount, setCryptoAmount] = useState<string>('');
  const [ngnAmount, setNgnAmount] = useState<string>('');
  const [rate, setRate] = useState<number | null>(null);

  // Fetch rate on mount and every 30 seconds
  useEffect(() => {
    async function fetchRate() {
      try {
        const data = await payoutsApi.getRate('USDC', 'solana');
        setRate(data.rate);
      } catch (err) {
        console.error('Failed to fetch rate:', err);
      }
    }

    fetchRate();
    const interval = setInterval(fetchRate, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update NGN amount when crypto amount or rate changes
  useEffect(() => {
    if (cryptoAmount && rate) {
      const crypto = parseFloat(cryptoAmount);
      if (!isNaN(crypto)) {
        const ngn = crypto * rate;
        setNgnAmount(ngn.toFixed(2));
      }
    } else {
      setNgnAmount('');
    }
  }, [cryptoAmount, rate]);

  return (
    <div className="amount-converter">
      <div className="input-group">
        <label>USDC Amount</label>
        <input
          type="number"
          value={cryptoAmount}
          onChange={(e) => setCryptoAmount(e.target.value)}
          placeholder="0.00"
          min="0"
          step="0.01"
        />
      </div>

      <div className="conversion-arrow">↓</div>

      <div className="input-group">
        <label>NGN Amount (Approximate)</label>
        <input
          type="text"
          value={ngnAmount ? `₦${parseFloat(ngnAmount).toLocaleString('en-NG')}` : ''}
          readOnly
          placeholder="₦0.00"
        />
      </div>

      {rate && (
        <div className="rate-info">
          Rate: 1 USDC = ₦{rate.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
        </div>
      )}
    </div>
  );
}
```

---

## 🎯 Use Case 4: Multi-Asset Rate Comparison

Show rates for different assets side-by-side.

### Example Component: `RateComparison.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { payoutsApi } from '../services/api';

interface AssetRate {
  asset: string;
  chain: string;
  rate: number | null;
  loading: boolean;
  error: string | null;
}

export function RateComparison() {
  const [rates, setRates] = useState<AssetRate[]>([
    { asset: 'USDC', chain: 'solana', rate: null, loading: true, error: null },
    { asset: 'USDC', chain: 'base', rate: null, loading: true, error: null },
    { asset: 'SOL', chain: 'solana', rate: null, loading: true, error: null },
  ]);

  useEffect(() => {
    async function fetchRates() {
      const updatedRates = await Promise.all(
        rates.map(async (assetRate) => {
          try {
            const data = await payoutsApi.getRate(assetRate.asset, assetRate.chain);
            return { ...assetRate, rate: data.rate, loading: false, error: null };
          } catch (err: any) {
            return { ...assetRate, rate: null, loading: false, error: err.message };
          }
        })
      );

      setRates(updatedRates);
    }

    fetchRates();
    const interval = setInterval(fetchRates, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rate-comparison">
      <h3>Current Rates</h3>
      <div className="rates-grid">
        {rates.map((assetRate, index) => (
          <div key={index} className="rate-card">
            <div className="asset-name">
              {assetRate.asset}
              <span className="chain-badge">{assetRate.chain}</span>
            </div>
            {assetRate.loading ? (
              <div className="loading">Loading...</div>
            ) : assetRate.error ? (
              <div className="error">N/A</div>
            ) : (
              <div className="rate-value">
                ₦{assetRate.rate?.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🎨 Styling Examples

### CSS for Rate Ticker:

```css
.rate-ticker {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 16px;
  border-radius: 12px;
  text-align: center;
}

.rate-label {
  font-size: 12px;
  opacity: 0.8;
  margin-bottom: 4px;
}

.rate-value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 4px;
}

.rate-chain {
  font-size: 10px;
  opacity: 0.6;
  text-transform: uppercase;
}
```

### CSS for Quote Summary:

```css
.quote-summary {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  margin-top: 20px;
}

.quote-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid #e0e0e0;
}

.quote-row.highlight {
  background: #e8f5e9;
  padding: 16px;
  margin: 8px -20px;
  border-radius: 8px;
  font-size: 18px;
  font-weight: bold;
}

.quote-row.expires {
  color: #ff6b6b;
  font-size: 12px;
}
```

---

## 🔄 Error Handling

Always handle errors gracefully:

```typescript
async function fetchQuoteWithErrorHandling(amount: number) {
  try {
    const quote = await payoutsApi.getQuote('USDC', 'solana', amount);
    return quote;
  } catch (err: any) {
    // Check for specific error types
    if (err.message?.includes('AMOUNT_TOO_LOW')) {
      alert('Minimum amount is 10 USDC');
    } else if (err.message?.includes('ASSET_NOT_SUPPORTED')) {
      alert('This asset is not supported on this chain');
    } else if (err.message?.includes('Network')) {
      alert('Network error. Please check your connection.');
    } else {
      alert('Failed to get quote. Please try again.');
    }
    return null;
  }
}
```

---

## ⏱️ Quote Expiry Handling

Quotes expire after a certain time. Handle this in your UI:

```typescript
function QuoteWithExpiry({ quote }: { quote: QuoteData }) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!quote.expiry) return;

    const updateTimer = () => {
      const expiryTime = new Date(quote.expiry).getTime();
      const now = Date.now();
      const secondsLeft = Math.max(0, Math.floor((expiryTime - now) / 1000));
      setTimeLeft(secondsLeft);

      if (secondsLeft === 0) {
        // Quote expired - show message
        alert('Quote expired. Please get a new quote.');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [quote.expiry]);

  return (
    <div className={`quote-expiry ${timeLeft < 30 ? 'warning' : ''}`}>
      {timeLeft > 0 ? (
        <span>Expires in {timeLeft}s</span>
      ) : (
        <span className="expired">Quote expired</span>
      )}
    </div>
  );
}
```

---

## 🚀 Next Steps

1. ✅ **Add RateTicker to your dashboard**
2. ✅ **Integrate CashOutQuote into your cash-out flow**
3. ✅ **Test with different amounts and assets**
4. ✅ **Handle errors gracefully**
5. ✅ **Show quote expiry countdown**
6. ✅ **Refresh quotes when they expire**

---

## 📝 Complete Integration Checklist

- [ ] Import `payoutsApi` from `./services/api`
- [ ] Add rate display to dashboard
- [ ] Add quote fetching to cash-out flow
- [ ] Show fee breakdown to users
- [ ] Display quote expiry time
- [ ] Handle quote expiration (refresh or block proceed)
- [ ] Add error handling for all API calls
- [ ] Test with different assets (USDC, SOL, etc.)
- [ ] Test with different chains (solana, base)
- [ ] Add loading states
- [ ] Style components to match your design
- [ ] Test on mobile devices

