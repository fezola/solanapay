# Email Confirmation Fix

## Problem
Users were created successfully but couldn't log in with error: "Invalid login credentials"

## Root Cause
Supabase was requiring email confirmation before users could log in. When users signed up, they were created in an "unconfirmed" state and couldn't log in until they clicked a confirmation email link.

## Solution
You've disabled email confirmation in Supabase settings. ✅

## For Existing Users (Created Before Disabling Email Confirmation)

If you have users who signed up before you disabled email confirmation, they are still in an "unconfirmed" state and cannot log in.

### Option 1: Run the Confirmation Script (Recommended)

I've created a script to automatically confirm all existing unconfirmed users.

**Run this command in the backend directory:**

```bash
cd backend
npx tsx src/scripts/confirm-existing-users.ts
```

This will:
1. Fetch all users from Supabase
2. Find users who haven't confirmed their email
3. Automatically confirm them
4. Show a summary of confirmed users

### Option 2: Manual Confirmation via Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/xojmrgsyshjoddylwxti/auth/users
2. Find the user who can't log in
3. Click on the user
4. Look for "Email Confirmed" status
5. If it says "No", click to manually confirm

## For New Users (After Disabling Email Confirmation)

New users who sign up now will be automatically confirmed and can log in immediately. No action needed! ✅

## Verification

After running the script or manually confirming users:

1. Try logging in with the user's credentials
2. It should work immediately
3. No email confirmation required

## What Changed in Supabase Settings

**Before:**
- Authentication → Providers → Email → **Confirm email: ON**
- Users had to click email link before logging in

**After:**
- Authentication → Providers → Email → **Confirm email: OFF**
- Users can log in immediately after signup

## Testing

1. **Create a new test user** (after disabling email confirmation)
2. **Try to log in immediately** - should work ✅
3. **For old users** - run the confirmation script first

## Notes

- This change affects all new signups going forward
- Existing unconfirmed users need to be manually confirmed (use the script)
- This is common for MVP/testing environments
- For production, you may want to re-enable email confirmation later for security

