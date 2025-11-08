# 🚀 How to Run the SQL Migration (SUPER EASY!)

## 📋 Step-by-Step Instructions

### Step 1: Open the SQL File

1. In your project folder, find this file:
   ```
   RUN_THIS_IN_SUPABASE.sql
   ```

2. Open it with any text editor (Notepad, VS Code, etc.)

3. **Select ALL the text** (Ctrl+A or Cmd+A)

4. **Copy it** (Ctrl+C or Cmd+C)

---

### Step 2: Go to Supabase Dashboard

1. Open your browser and go to:
   ```
   https://supabase.com/dashboard
   ```

2. **Log in** to your account

3. **Select your project**: Click on **"solpay"**

---

### Step 3: Open SQL Editor

1. On the left sidebar, click **"SQL Editor"**

2. Click the **"New Query"** button (top right)

---

### Step 4: Paste and Run

1. **Paste** the SQL you copied (Ctrl+V or Cmd+V)

2. Click the **"Run"** button (or press Ctrl+Enter)

3. Wait a few seconds...

4. You should see: **"Success. No rows returned"** ✅

---

### Step 5: Verify It Worked

1. On the left sidebar, click **"Table Editor"**

2. You should now see these NEW tables:
   - ✅ `wallet_transactions`
   - ✅ `withdrawals`
   - ✅ `platform_fees`

3. Click on the **"users"** table

4. You should see a NEW column:
   - ✅ `naira_balance`

---

## ✅ That's It!

Your database now supports NGN wallets! 🎉

---

## 🆘 If You Get Errors

### Error: "relation 'users' does not exist"

**Solution:** You need to run the main database setup first.

1. Go to SQL Editor
2. Copy and paste the contents of `database-setup.sql`
3. Run it
4. Then run `RUN_THIS_IN_SUPABASE.sql` again

---

### Error: "column 'naira_balance' already exists"

**Solution:** The migration already ran! You're good to go! ✅

---

### Error: "relation 'bank_accounts' does not exist"

**Solution:** You need to create the bank_accounts table first.

Run this SQL first:

```sql
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_name TEXT NOT NULL,
  bank_code TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, account_number, bank_code)
);
```

Then run `RUN_THIS_IN_SUPABASE.sql` again.

---

## 📸 Visual Guide

### What You Should See:

**Before running SQL:**
- users table has NO `naira_balance` column
- NO `wallet_transactions` table
- NO `withdrawals` table
- NO `platform_fees` table

**After running SQL:**
- users table has `naira_balance` column ✅
- `wallet_transactions` table exists ✅
- `withdrawals` table exists ✅
- `platform_fees` table exists ✅

---

## 🎯 Quick Test

After running the SQL, test it with this query:

```sql
-- Check if naira_balance column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'naira_balance';
```

You should see:
```
column_name    | data_type
naira_balance  | bigint
```

✅ **Success!**

---

## 📞 Still Having Issues?

1. Make sure you're logged into the correct Supabase project (**solpay**)
2. Make sure you have the correct permissions (you should be the owner)
3. Try refreshing the page and running the SQL again
4. Check the error message carefully - it usually tells you what's wrong

---

## 🎉 Next Steps

After the SQL runs successfully:

1. ✅ Database is ready
2. ⏭️ Register the wallet routes in your backend
3. ⏭️ Update the offramp flow
4. ⏭️ Add wallet UI to frontend
5. ⏭️ Test with small amounts

See `NAIRA_WALLET_IMPLEMENTATION_GUIDE.md` for the complete implementation!

