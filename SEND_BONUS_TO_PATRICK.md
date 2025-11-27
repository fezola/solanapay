# 🎁 Send $5 USDC Bonus to Patrick Nwachukwu

## Step-by-Step Guide

### Step 1: Run Database Migration

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your SolPay project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the entire contents of `backend/migrations/add_bonus_system.sql`
6. Click **Run** (or press Ctrl+Enter)
7. You should see: "Success. No rows returned"

### Step 2: Wait for Deployment

The code has been pushed to GitHub. Render will automatically deploy it.

1. Go to: https://dashboard.render.com
2. Find your backend service
3. Wait for the deployment to complete (usually 2-5 minutes)
4. Look for "Live" status with the latest commit: "Add bonus system..."

### Step 3: Login to Admin Dashboard

1. Go to: https://solanapay-xmli.onrender.com/admin
2. Login with your admin credentials (email: fezola004@gmail.com)
3. You should see the new **"🎁 Send Bonus to User"** section at the top

### Step 4: Find Patrick's Email

Look at the "Recent Transactions" table on the admin dashboard and find Patrick C. Nwachukwu's email address.

**Expected email format:** `patrick@example.com` or similar

### Step 5: Send the Bonus

In the **"🎁 Send Bonus to User"** form:

1. **User Email:** Enter Patrick's email (e.g., `patrick@example.com`)
2. **Amount (USDC):** Enter `5.00`
3. **Reason:** Enter `Highest offramp transaction - November 2024! 🎉`
4. Click **"Send Bonus 🎁"**

### Step 6: Verify Success

You should see a green success message:

```
✅ Success!
Sent $5.00 USDC to Patrick C. Nwachukwu
View on Solscan
```

Click the "View on Solscan" link to verify the transaction on the blockchain.

### Step 7: Notify Patrick

Send Patrick a message:

```
Hey Patrick! 🎉

Congratulations on having the highest offramp transaction this month!

We've sent you a $5 USDC bonus to your SolPay wallet as a thank you.

Check your app - you should see a special bonus notification card.

Please share it on X (Twitter) to spread the word about SolPay!

Thanks for being an awesome user! 💰
```

---

## Troubleshooting

### Error: "User not found"
- Double-check Patrick's email address
- Make sure it matches exactly what's in the database

### Error: "Treasury wallet not configured"
- Check that `SOLANA_TREASURY_PRIVATE_KEY` is set in Render environment variables
- Make sure the treasury wallet has USDC balance

### Error: "Insufficient funds"
- The treasury wallet needs USDC to send bonuses
- Check the treasury wallet balance on Solscan

### Error: "Failed to send transaction"
- The treasury wallet needs SOL for gas fees
- Make sure it has at least 0.01 SOL

---

## Alternative: Send via API (Advanced)

If you prefer to use the API directly:

```bash
# Get your admin token from browser console
# On admin dashboard, open DevTools (F12) and run:
localStorage.getItem('adminToken')

# Then use curl:
curl -X POST https://solanapay-xmli.onrender.com/api/admin/send-bonus \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_email": "patrick@example.com",
    "amount": 5.00,
    "asset": "USDC",
    "chain": "solana",
    "reason": "Highest offramp transaction - November 2024! 🎉"
  }'
```

---

## What Patrick Will See

When Patrick opens the SolPay app, he'll see:

1. **Beautiful purple bonus card** with confetti emojis
2. **"Congratulations! 🎉"** heading
3. **"$5.00 USDC"** in large purple text
4. **Reason:** "Highest offramp transaction - November 2024! 🎉"
5. **Blue "Share on X (Twitter)" button**
6. **Link to view transaction on Solscan**
7. **His USDC balance increased by $5**

---

## Future Bonuses

You can now send bonuses to any user at any time using the same form!

**Ideas for future bonuses:**
- 🎉 Welcome bonus for new users ($1 USDC)
- 🏆 Top 3 users each month ($10, $5, $3)
- 🎯 Milestone bonuses (first offramp, 10th offramp, etc.)
- 🎁 Referral bonuses (when someone refers 5 friends)
- 🎊 Special promotions and contests

Just fill out the form with the user's email, amount, and reason!

---

## Need Help?

If you encounter any issues:

1. Check the browser console for errors (F12 → Console tab)
2. Check the Render logs for backend errors
3. Verify the database migration ran successfully
4. Make sure the treasury wallet has USDC and SOL

Good luck! 🚀

