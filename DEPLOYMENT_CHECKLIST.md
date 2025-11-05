# Production Deployment Checklist

## 🔐 Security

### Environment & Secrets
- [ ] Generate strong `ENCRYPTION_KEY` (32 bytes, hex)
- [ ] Store secrets in secure vault (AWS Secrets Manager, HashiCorp Vault, etc.)
- [ ] Never commit `.env` files to git
- [ ] Rotate API keys regularly
- [ ] Use different keys for staging and production
- [ ] Enable 2FA for all admin accounts

### Treasury Wallets
- [ ] Generate production treasury wallets offline
- [ ] Store private keys in Hardware Security Module (HSM) or secure vault
- [ ] Use multi-sig wallets for large amounts
- [ ] Set up monitoring alerts for treasury balance
- [ ] Implement withdrawal approval workflow
- [ ] Keep only minimal funds in hot wallets

### API Security
- [ ] Enable HTTPS/TLS (SSL certificates)
- [ ] Configure proper CORS origins (no wildcards)
- [ ] Enable rate limiting with Redis
- [ ] Set up DDoS protection (Cloudflare, AWS Shield)
- [ ] Implement request signing for webhooks
- [ ] Add IP whitelisting for admin endpoints
- [ ] Enable Helmet security headers
- [ ] Implement CSRF protection

### Database Security
- [ ] Enable Row Level Security (RLS) in Supabase
- [ ] Use connection pooling
- [ ] Enable SSL for database connections
- [ ] Set up automated backups (daily minimum)
- [ ] Test backup restoration process
- [ ] Implement database encryption at rest
- [ ] Restrict database access by IP

## 🌐 Infrastructure

### Backend Deployment
- [ ] Set `NODE_ENV=production`
- [ ] Use production RPC endpoints with authentication
- [ ] Set up load balancer (if needed)
- [ ] Configure auto-scaling
- [ ] Set up health check endpoints
- [ ] Configure graceful shutdown
- [ ] Set up process manager (PM2, systemd)
- [ ] Configure log rotation

### Frontend Deployment
- [ ] Build optimized production bundle (`npm run build`)
- [ ] Deploy to CDN (Vercel, Netlify, Cloudflare Pages)
- [ ] Configure custom domain
- [ ] Enable HTTPS
- [ ] Set up caching headers
- [ ] Configure CSP headers
- [ ] Enable gzip/brotli compression

### Database
- [ ] Run migrations on production database
- [ ] Seed initial data (feature flags, admin user)
- [ ] Set up connection pooling
- [ ] Configure backup schedule
- [ ] Set up monitoring and alerts

### Redis (Optional but Recommended)
- [ ] Deploy Redis instance
- [ ] Configure persistence (RDB + AOF)
- [ ] Set up replication for high availability
- [ ] Configure maxmemory policy
- [ ] Enable authentication

## 🔗 Third-Party Services

### Supabase
- [ ] Create production project
- [ ] Configure authentication providers
- [ ] Set up email templates
- [ ] Configure storage buckets
- [ ] Enable database backups
- [ ] Set up monitoring

### Blockchain RPC Providers
- [ ] Sign up for production RPC endpoints
  - [ ] Solana: Helius, QuickNode, or Alchemy
  - [ ] Base: Alchemy, Infura, or QuickNode
- [ ] Configure rate limits
- [ ] Set up fallback RPC endpoints
- [ ] Enable webhook notifications (if available)
- [ ] Monitor RPC usage and costs

### Pyth Network
- [ ] Verify Pyth endpoints are production-ready
- [ ] Set up fallback price sources
- [ ] Monitor price feed latency
- [ ] Set up alerts for stale prices

### Paystack
- [ ] Switch to live API keys
- [ ] Complete business verification
- [ ] Set up webhook URL
- [ ] Configure payout schedule
- [ ] Set up settlement account
- [ ] Test live transfers with small amounts
- [ ] Enable fraud detection features

### KYC Provider (Optional)
- [ ] Integrate YouVerify or similar
- [ ] Configure BVN verification
- [ ] Set up document verification
- [ ] Configure liveness check
- [ ] Test verification flow

## 📊 Monitoring & Observability

### Logging
- [ ] Set up centralized logging (Datadog, LogDNA, CloudWatch)
- [ ] Configure log levels (info in production)
- [ ] Set up log retention policy
- [ ] Create log-based alerts

### Error Tracking
- [ ] Set up Sentry or similar
- [ ] Configure error sampling
- [ ] Set up error notifications
- [ ] Create error dashboards

### Application Monitoring
- [ ] Set up APM (Application Performance Monitoring)
- [ ] Monitor API response times
- [ ] Track database query performance
- [ ] Monitor memory and CPU usage
- [ ] Set up uptime monitoring (Pingdom, UptimeRobot)

### Business Metrics
- [ ] Track daily transaction volume
- [ ] Monitor conversion rates
- [ ] Track user signups
- [ ] Monitor KYC approval rates
- [ ] Track payout success rates
- [ ] Monitor treasury balances

### Alerts
- [ ] Low treasury balance
- [ ] Failed payouts
- [ ] High error rates
- [ ] Slow API responses
- [ ] Database connection issues
- [ ] RPC endpoint failures
- [ ] Unusual transaction patterns

## 🧪 Testing

### Pre-Deployment Testing
- [ ] Run all unit tests
- [ ] Run integration tests
- [ ] Test end-to-end user flows
- [ ] Test with real testnet transactions
- [ ] Load testing (simulate high traffic)
- [ ] Security audit/penetration testing
- [ ] Test disaster recovery procedures

### Post-Deployment Testing
- [ ] Smoke tests on production
- [ ] Test authentication flow
- [ ] Test deposit address generation
- [ ] Test quote creation
- [ ] Test payout with small amount
- [ ] Verify webhooks are working
- [ ] Test admin dashboard

## 📋 Compliance & Legal

### KYC/AML
- [ ] Implement KYC verification
- [ ] Set up transaction monitoring
- [ ] Configure sanctions screening
- [ ] Implement PEP checks
- [ ] Set up suspicious activity reporting
- [ ] Document KYC procedures

### Data Protection
- [ ] GDPR compliance (if applicable)
- [ ] Privacy policy
- [ ] Terms of service
- [ ] Cookie policy
- [ ] Data retention policy
- [ ] User data export functionality
- [ ] User data deletion functionality

### Financial Compliance
- [ ] Register with relevant authorities (CBN, SEC, etc.)
- [ ] Obtain necessary licenses
- [ ] Set up audit trail
- [ ] Implement transaction limits
- [ ] Configure reporting for regulators

## 🚀 Launch Preparation

### Documentation
- [ ] API documentation (OpenAPI/Swagger)
- [ ] User guide
- [ ] Admin guide
- [ ] Runbook for operations team
- [ ] Incident response plan
- [ ] Disaster recovery plan

### Team Preparation
- [ ] Train support team
- [ ] Set up on-call rotation
- [ ] Create escalation procedures
- [ ] Document common issues and solutions
- [ ] Set up internal communication channels

### User Communication
- [ ] Prepare launch announcement
- [ ] Set up support channels (email, chat)
- [ ] Create FAQ
- [ ] Prepare tutorial videos
- [ ] Set up status page

## 🔄 Post-Launch

### Week 1
- [ ] Monitor all systems 24/7
- [ ] Track user feedback
- [ ] Fix critical bugs immediately
- [ ] Monitor transaction success rates
- [ ] Check treasury balances daily

### Month 1
- [ ] Review and optimize performance
- [ ] Analyze user behavior
- [ ] Gather user feedback
- [ ] Plan feature improvements
- [ ] Review security logs
- [ ] Conduct security audit

### Ongoing
- [ ] Weekly security reviews
- [ ] Monthly performance reviews
- [ ] Quarterly security audits
- [ ] Regular dependency updates
- [ ] Regular backup testing
- [ ] Regular disaster recovery drills

## 📝 Environment Variables Checklist

### Required for Production
```bash
# Server
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://yourdomain.com

# Supabase
SUPABASE_URL=https://your-prod-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<production-key>

# Encryption
ENCRYPTION_KEY=<strong-32-byte-hex-key>

# Solana
SOLANA_RPC_URL=<production-rpc-url>
SOLANA_NETWORK=mainnet-beta
SOLANA_TREASURY_ADDRESS=<production-address>
SOLANA_TREASURY_PRIVATE_KEY=<encrypted-or-from-vault>

# Base
BASE_RPC_URL=<production-rpc-url>
BASE_CHAIN_ID=8453
BASE_TREASURY_ADDRESS=<production-address>
BASE_TREASURY_PRIVATE_KEY=<encrypted-or-from-vault>

# Paystack
PAYSTACK_SECRET_KEY=sk_live_<your-key>
PAYSTACK_PUBLIC_KEY=pk_live_<your-key>

# Redis
REDIS_URL=<production-redis-url>

# Monitoring
SENTRY_DSN=<your-sentry-dsn>
LOG_LEVEL=info
```

## ✅ Final Checks

Before going live:
- [ ] All items in this checklist completed
- [ ] Security audit passed
- [ ] Load testing passed
- [ ] Disaster recovery tested
- [ ] Team trained and ready
- [ ] Support channels set up
- [ ] Monitoring and alerts configured
- [ ] Backups verified
- [ ] Legal compliance confirmed
- [ ] Insurance obtained (if applicable)

## 🆘 Emergency Contacts

Document and share:
- [ ] On-call engineer contact
- [ ] DevOps team contact
- [ ] Security team contact
- [ ] Legal team contact
- [ ] RPC provider support
- [ ] Paystack support
- [ ] Supabase support

## 🎉 Launch!

Once all checks are complete:
1. Deploy backend to production
2. Deploy frontend to production
3. Run smoke tests
4. Monitor closely for first 24 hours
5. Announce launch
6. Celebrate! 🎊

---

**Remember**: Start with a soft launch to a limited user base before full public launch. This allows you to catch issues with real users before scaling.

