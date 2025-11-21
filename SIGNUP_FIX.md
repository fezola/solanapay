# Signup Error Fix

## Problem
The signup was failing with "TypeError: Failed to fetch" because the frontend was trying to connect to the production backend URL (`https://solanapay-xmli.onrender.com`) which is likely down or sleeping.

## Solution
I've updated the `.env` file to use the local backend instead.

## What I Changed

### `.env` (Frontend)
```env
# Before:
VITE_API_URL=https://solanapay-xmli.onrender.com

# After:
VITE_API_URL=http://localhost:3001
```

## Steps to Fix

### 1. Restart the Frontend Dev Server

**If you're running the frontend in a terminal:**
1. Stop the frontend server (Ctrl+C)
2. Restart it with:
   ```bash
   npm run dev
   ```

**The frontend MUST be restarted** to pick up the new environment variable changes.

### 2. Verify Backend is Running

Make sure the backend is running on port 3001. You should see logs like:
```
🚀 Server running on port 3001
```

If not running, start it:
```bash
cd backend
npm run dev
```

### 3. Try Signup Again

Once both servers are running:
1. Frontend: `http://localhost:5173` (or whatever port Vite shows)
2. Backend: `http://localhost:3001`

Try signing up again. It should work now!

## Verification

You can verify the connection by checking the browser console:
- Open DevTools (F12)
- Go to Network tab
- Try to sign up
- You should see a request to `http://localhost:3001/api/auth/signup`
- It should return a 200 status (or 400 with a proper error message, not "Failed to fetch")

## For Production

When you want to use the production backend again, update `.env`:
```env
VITE_API_URL=https://solanapay-xmli.onrender.com
```

And restart the frontend server.

## Additional Notes

- The backend CORS is already configured to allow `http://localhost:5173`
- The signup endpoint is working correctly
- The issue was purely a network/connection problem

