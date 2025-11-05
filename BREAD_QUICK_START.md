# Bread Africa Integration - Quick Start

## ⚡ 5-Minute Setup

### 1. Add API Key to `.env`
```env
BREAD_API_KEY=sk_test_your_api_key_here
BREAD_API_URL=https://api.bread.africa
BREAD_WEBHOOK_SECRET=your_webhook_secret
BREAD_ENABLED=false
```

### 2. Run Database Migration
```bash
cd backend
npm run migrate:bread
```

### 3. Test Integration
```bash
npm run test:bread
```

### 4. Enable Bread
```env
BREAD_ENABLED=true
```

### 5. Restart Server
```bash
npm run dev
```

## ✅ That's It!

Your app now uses Bread Africa for:
- ✅ Wallet generation
- ✅ Deposit addresses
- ✅ Exchange rates
- ✅ Bank payouts
- ✅ Transaction monitoring

## 📚 Documentation

- **Full Guide**: `BREAD_INTEGRATION_GUIDE.md`
- **Summary**: `BREAD_INTEGRATION_SUMMARY.md`
- **Service Docs**: `backend/src/services/bread/README.md`

## 🧪 Testing

```bash
# Test Bread API connection
npm run test:bread

# Check logs
tail -f logs/app.log | grep Bread

# Check database
psql -c "SELECT COUNT(*) FROM users WHERE bread_identity_id IS NOT NULL;"
```

## 🔄 Rollback

To disable Bread and use legacy system:

```env
BREAD_ENABLED=false
```

Restart server. Done!

## 🆘 Troubleshooting

### "API key not configured"
→ Add `BREAD_API_KEY` to `.env`

### "Migration failed"
→ Check database connection in `.env`

### "Test failed"
→ Verify API key is correct

### "Webhook not received"
→ Check webhook URL in Bread dashboard

## 📞 Support

- **Bread Docs**: https://docs.bread.africa
- **Integration Guide**: See `BREAD_INTEGRATION_GUIDE.md`
- **Code Examples**: See `backend/src/services/bread/README.md`

## 🎯 What Changed?

**Nothing!** Your existing code works as-is. The provider pattern handles everything:

```typescript
// This code works with both Bread and Legacy
import { offrampProvider } from './services/offramp-provider';

const address = await offrampProvider.getDepositAddress(userId, 'solana', 'USDC');
const quote = await offrampProvider.calculateQuote('USDC', 'solana', 100);
const result = await offrampProvider.executePayout(payout, beneficiary);
```

## 🚀 Next Steps

1. **Test in Sandbox** - Use test API key
2. **Monitor Logs** - Watch for Bread events
3. **Test with Real User** - Small amount first
4. **Enable for All** - Set `BREAD_ENABLED=true`
5. **Monitor & Optimize** - Track performance

---

**Ready to go!** 🎉

