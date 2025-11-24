# Offramp UUID Error Fix

## 🔴 Problem

Users trying to offramp USDC from Base (or any chain) are getting an **Internal Server Error (500)** with this error:

```json
{
  "validation": "uuid",
  "code": "invalid_string",
  "message": "Invalid uuid",
  "path": ["beneficiary_id"]
}
```

### Error Logs
```
{"level":50,"time":1764003110875,"pid":65,"hostname":"srv-d468nkqli9vc73dcg8o0-hibernate-68d88fdfb8-4nttp","reqId":"req-5d","req":{"method":"POST","url":"/api/payouts/execute","hostname":"solanapay-xmli.onrender.com","remoteAddress":"102.89.68.215","remotePort":33324},"res":{"statusCode":500},"err":{"type":"ZodError","message":"[\n  {\n    \"validation\": \"uuid\",\n    \"code\": \"invalid_string\",\n    \"message\": \"Invalid uuid\",\n    \"path\": [\n      \"beneficiary_id\"\n    ]\n  }\n]"
```

## 🔍 Root Cause

The `bank_accounts` table is **missing** the `bread_beneficiary_id` and `bread_synced_at` columns.

### What Happened:
1. The migration `002_add_bread_integration.sql` added `bread_beneficiary_id` to the `payout_beneficiaries` table
2. However, the code in `backend/src/routes/payouts.ts` uses the `bank_accounts` table instead
3. When creating a beneficiary (line 689), the code tries to insert `bread_beneficiary_id` into `bank_accounts`:
   ```typescript
   const { data: beneficiary, error } = await supabaseAdmin
     .from('bank_accounts')
     .insert({
       user_id: userId,
       bank_code: body.bank_code,
       bank_name: bank.name,
       account_number: body.account_number,
       account_name: accountName!,
       bread_beneficiary_id: breadBeneficiaryId,  // ❌ Column doesn't exist!
       is_verified: true,
       verified_at: new Date().toISOString(),
       bread_synced_at: new Date().toISOString(),  // ❌ Column doesn't exist!
     })
   ```
4. This causes the insert to fail silently or the column to be ignored
5. Later, when executing offramp (line 265), the code checks for `bread_beneficiary_id`:
   ```typescript
   if (!beneficiary.bread_beneficiary_id) {
     return reply.status(400).send({
       error: 'Bank account not synced with Bread',
       message: 'Please re-add your bank account',
     });
   }
   ```
6. Since the column doesn't exist, this check fails and causes the UUID validation error

## ✅ Solution

Add the missing columns to the `bank_accounts` table.

### Step 1: Run the Migration

**Option A: Supabase Dashboard (RECOMMENDED)**

1. Go to your Supabase project dashboard
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New Query"**
4. Copy and paste the contents of `RUN_THIS_FIX_BANK_ACCOUNTS.sql`
5. Click **"Run"** or press `Cmd/Ctrl + Enter`

**Option B: Command Line (if you have psql)**

```bash
psql "postgresql://postgres:[password]@db.xojmrgsyshjoddylwxti.supabase.co:5432/postgres" -f RUN_THIS_FIX_BANK_ACCOUNTS.sql
```

### Step 2: Verify the Fix

Run this query in Supabase SQL Editor:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bank_accounts' 
AND column_name IN ('bread_beneficiary_id', 'bread_synced_at');
```

You should see:
```
column_name           | data_type
----------------------|----------
bread_beneficiary_id  | text
bread_synced_at       | timestamp with time zone
```

### Step 3: Ask Users to Re-add Bank Accounts

After running the migration, users who previously added bank accounts will need to **re-add them** so that the `bread_beneficiary_id` gets populated.

Alternatively, you can write a script to backfill existing bank accounts by calling the Bread API to create beneficiaries for existing accounts.

## 📝 Files Created

1. **`backend/src/db/migrations/006_add_bread_to_bank_accounts.sql`** - Migration file for version control
2. **`RUN_THIS_FIX_BANK_ACCOUNTS.sql`** - Standalone SQL file to run in Supabase
3. **`OFFRAMP_UUID_ERROR_FIX.md`** - This documentation file

## 🧪 Testing

After applying the fix:

1. **Add a new bank account** via the app
2. **Verify** the `bread_beneficiary_id` is populated:
   ```sql
   SELECT id, account_number, bread_beneficiary_id, bread_synced_at 
   FROM bank_accounts 
   WHERE user_id = 'YOUR_USER_ID';
   ```
3. **Try offramping** USDC from Base (or any chain)
4. **Verify** the offramp completes successfully

## 🔄 Next Steps

1. ✅ Run the migration in Supabase
2. ✅ Verify columns were added
3. ✅ Test with a new bank account
4. ✅ Test offramp flow
5. ⚠️ Consider backfilling existing bank accounts (optional)

## 📚 Related Files

- `backend/src/routes/payouts.ts` - Offramp execution logic
- `backend/src/db/migrations/002_add_bread_integration.sql` - Original migration (only added to payout_beneficiaries)
- `database-setup.sql` - Main database schema

