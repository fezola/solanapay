#!/bin/bash

# Test quote endpoint with different payloads

echo "Test 1: Valid request"
curl -X POST http://localhost:3001/api/rates/quote \
  -H "Content-Type: application/json" \
  -d '{
    "asset": "solana:usdc",
    "amount": 0.5,
    "currency": "NGN"
  }'

echo -e "\n\nTest 2: Amount as string (should fail)"
curl -X POST http://localhost:3001/api/rates/quote \
  -H "Content-Type: application/json" \
  -d '{
    "asset": "solana:usdc",
    "amount": "0.5",
    "currency": "NGN"
  }'

echo -e "\n\nTest 3: Amount as 0 (should fail)"
curl -X POST http://localhost:3001/api/rates/quote \
  -H "Content-Type: application/json" \
  -d '{
    "asset": "solana:usdc",
    "amount": 0,
    "currency": "NGN"
  }'

