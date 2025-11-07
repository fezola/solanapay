# Apply Database Migration

## Problem
The `deposit_addresses` table has a UNIQUE constraint on `bread_wallet_id`, but multiple assets on the same chain need to share the same Bread wallet.

For example:
- SOL, USDC, USDT all use the same Solana Bread wallet
- USDC, USDT use the same Base Bread wallet

## Solution
Remove the UNIQUE constraint on `bread_wallet_id`.

## Steps to Apply

### Option 1: Supabase Dashboard (RECOMMENDED)

1. Go to https://supabase.com/dashboard/project/xojmrgsyshjoddylwxti/sql/new
2. Copy and paste the SQL from `fix-bread-wallet-constraint.sql`
3. Click "Run"

### Option 2: Command Line (if you have psql)

```bash
psql "postgresql://postgres:[password]@db.xojmrgsyshjoddylwxti.supabase.co:5432/postgres" -f fix-bread-wallet-constraint.sql
```

## SQL to Run

```sql
-- Drop the unique constraint on bread_wallet_id
ALTER TABLE deposit_addresses DROP CONSTRAINT IF EXISTS deposit_addresses_bread_wallet_id_key;

-- Keep the index for performance but without uniqueness
DROP INDEX IF NOT EXISTS idx_deposit_addresses_bread_wallet_id;
CREATE INDEX IF NOT EXISTS idx_deposit_addresses_bread_wallet_id ON deposit_addresses(bread_wallet_id);
```

## Verification

After running the migration, verify with:

```sql
SELECT 
  conname AS constraint_name,
  contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'deposit_addresses'::regclass
  AND conname LIKE '%bread_wallet%';
```

Should return NO rows (no constraints on bread_wallet_id).

## Then Re-run Sync Script

After applying the migration:

```bash
node sync-bread-wallet.js
```

This will create Bread wallets and update all deposit addresses.

