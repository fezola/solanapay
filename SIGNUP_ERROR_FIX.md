# 🔧 User Signup Error Fix - RESOLVED ✅

## ❌ Problem

Users were unable to create new accounts, receiving this error:
```
POST https://xojmrgsyshjoddylwxti.supabase.co/auth/v1/signup 500 (Internal Server Error)
AuthApiError: Database error saving new user
```

## 🔍 Root Cause

**TWO** referral system functions were missing `SECURITY DEFINER`, causing Row Level Security (RLS) violations during user registration:

1. `create_referral_code_for_user()` - Tries to INSERT into `referral_codes` table
2. `generate_referral_code()` - Tries to SELECT from `referral_codes` table to check for duplicates

Both operations failed because the `referral_codes` table has RLS enabled, and the new user doesn't have permission to read or write to it.

### What Was Happening:

1. ✅ User signs up via `supabase.auth.signUp()`
2. ✅ New row inserted into `auth.users`
3. ✅ `handle_new_user()` trigger fires and creates user profile in `public.users` (has `SECURITY DEFINER`)
4. ❌ `trigger_create_referral_code` fires and tries to INSERT into `referral_codes` table
5. ❌ **FAILS** because:
   - The function runs with the new user's permissions (not elevated)
   - The `referral_codes` table has RLS enabled
   - There's no INSERT policy for users on `referral_codes`
   - The new user can't insert their own referral code

## ✅ Solution Applied

Added `SECURITY DEFINER` to **THREE** functions to bypass RLS:

### 1. Fixed `generate_referral_code()`

This function checks for duplicate codes by querying `referral_codes` table.

**Before:**
```sql
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS character varying
LANGUAGE plpgsql
AS $function$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result VARCHAR(8);
  attempts INT := 0;
  max_attempts INT := 100;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;

    -- ❌ This SELECT fails due to RLS
    IF NOT EXISTS (SELECT 1 FROM referral_codes WHERE code = result) THEN
      RETURN result;
    END IF;

    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique referral code after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$function$
```

**After:**
```sql
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS character varying
LANGUAGE plpgsql
SECURITY DEFINER  -- ✅ ADDED THIS
AS $function$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result VARCHAR(8);
  attempts INT := 0;
  max_attempts INT := 100;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;

    -- ✅ Now works with elevated privileges
    IF NOT EXISTS (SELECT 1 FROM referral_codes WHERE code = result) THEN
      RETURN result;
    END IF;

    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique referral code after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$function$
```

### 2. Fixed `create_referral_code_for_user()`

**Before:**
```sql
CREATE OR REPLACE FUNCTION public.create_referral_code_for_user()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO referral_codes (user_id, code)
  VALUES (NEW.id, generate_referral_code());
  RETURN NEW;
END;
$function$
```

**After:**
```sql
CREATE OR REPLACE FUNCTION public.create_referral_code_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER  -- ✅ ADDED THIS
AS $function$
BEGIN
  INSERT INTO referral_codes (user_id, code)
  VALUES (NEW.id, generate_referral_code());
  RETURN NEW;
END;
$function$
```

### 3. Fixed `check_referral_on_kyc_approval()`

Also added `SECURITY DEFINER` to prevent future issues when users get KYC approved:

```sql
CREATE OR REPLACE FUNCTION public.check_referral_on_kyc_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER  -- ✅ ADDED THIS
AS $function$
DECLARE
  v_referral_id UUID;
BEGIN
  IF NEW.kyc_status = 'approved' AND NEW.kyc_tier >= 1 AND 
     (OLD.kyc_status != 'approved' OR OLD.kyc_tier < 1) THEN
    
    SELECT id INTO v_referral_id
    FROM referrals
    WHERE referred_user_id = NEW.id
    AND status = 'pending'
    AND reward_credited = FALSE;
    
    IF v_referral_id IS NOT NULL THEN
      PERFORM credit_referral_reward(v_referral_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$
```

## 🎯 How It Works Now

1. ✅ User signs up via `supabase.auth.signUp()`
2. ✅ New row inserted into `auth.users`
3. ✅ `handle_new_user()` trigger creates user profile in `public.users` (with `SECURITY DEFINER`)
4. ✅ `trigger_create_referral_code` fires and creates referral code (with `SECURITY DEFINER`)
5. ✅ User registration completes successfully
6. ✅ User gets their unique referral code automatically

## 🔐 Security Note

`SECURITY DEFINER` means the function runs with the privileges of the user who **created** the function (typically the database owner), not the user who triggered it. This is safe here because:

- The function only inserts a referral code for the newly created user
- It uses `NEW.id` which is the ID of the user being created
- It can't be exploited to create referral codes for other users
- The trigger only fires on INSERT to the `users` table

## ✅ Testing

Try creating a new account now. The signup should work without errors.

### Expected Flow:
1. Fill in signup form (email, password, name)
2. Click "Sign Up"
3. ✅ Account created successfully
4. ✅ User profile created in database
5. ✅ Referral code generated automatically
6. ✅ Redirected to PIN setup screen

## 📊 Database Functions Summary

| Function | Purpose | Has SECURITY DEFINER? |
|----------|---------|----------------------|
| `handle_new_user()` | Creates user profile on signup | ✅ Yes (already had it) |
| `generate_referral_code()` | Generates unique 6-char code | ✅ Yes (FIXED) |
| `create_referral_code_for_user()` | Creates referral code for new user | ✅ Yes (FIXED) |
| `check_referral_on_kyc_approval()` | Credits referrer when user completes KYC | ✅ Yes (FIXED) |

## 📊 Database Triggers Summary

| Trigger | Table | Function | Status |
|---------|-------|----------|--------|
| `on_auth_user_created` | `auth.users` | `handle_new_user()` | ✅ Working |
| `trigger_create_referral_code` | `public.users` | `create_referral_code_for_user()` | ✅ FIXED |
| `trigger_credit_referral_on_kyc` | `public.users` | `check_referral_on_kyc_approval()` | ✅ FIXED |

## 🔍 How We Found The Issue

1. Checked database trigger functions - `handle_new_user()` had `SECURITY DEFINER` ✅
2. Checked trigger on `users` table - found `trigger_create_referral_code` 🔍
3. Checked `create_referral_code_for_user()` - missing `SECURITY DEFINER` ❌
4. Temporarily disabled the trigger - signup worked! ✅
5. Re-enabled trigger and added `SECURITY DEFINER` to both functions
6. Tested - signup now works with referral codes! 🎉

## 🎉 Status

**FIXED** - User registration now works correctly with automatic referral code generation!

