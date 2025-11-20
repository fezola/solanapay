#!/bin/bash

# SolPay Admin Endpoints Test Script
# Usage: ./test-admin-endpoints.sh YOUR_JWT_TOKEN

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_BASE="http://localhost:3001/api/admin"
TOKEN=$1

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Error: Please provide your JWT token${NC}"
    echo "Usage: ./test-admin-endpoints.sh YOUR_JWT_TOKEN"
    exit 1
fi

echo -e "${YELLOW}🔐 Testing SolPay Admin Endpoints${NC}"
echo "================================================"

# Test 1: Dashboard Stats
echo -e "\n${YELLOW}Test 1: Dashboard Stats${NC}"
echo "GET /api/admin/stats"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE/stats" \
  -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Success (HTTP $HTTP_CODE)${NC}"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}❌ Failed (HTTP $HTTP_CODE)${NC}"
    echo "$BODY"
fi

# Test 2: Transaction Analytics
echo -e "\n${YELLOW}Test 2: Transaction Analytics${NC}"
echo "GET /api/admin/analytics/transactions"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE/analytics/transactions" \
  -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Success (HTTP $HTTP_CODE)${NC}"
    echo "$BODY" | jq '.summary' 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}❌ Failed (HTTP $HTTP_CODE)${NC}"
    echo "$BODY"
fi

# Test 3: All Transactions
echo -e "\n${YELLOW}Test 3: All Transactions${NC}"
echo "GET /api/admin/analytics/all-transactions?limit=5"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE/analytics/all-transactions?limit=5" \
  -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Success (HTTP $HTTP_CODE)${NC}"
    echo "$BODY" | jq '{total: .total, limit: .limit, transaction_count: (.transactions | length)}' 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}❌ Failed (HTTP $HTTP_CODE)${NC}"
    echo "$BODY"
fi

# Test 4: Revenue Analytics
echo -e "\n${YELLOW}Test 4: Revenue Analytics${NC}"
echo "GET /api/admin/analytics/revenue"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE/analytics/revenue" \
  -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Success (HTTP $HTTP_CODE)${NC}"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}❌ Failed (HTTP $HTTP_CODE)${NC}"
    echo "$BODY"
fi

# Test 5: Users List
echo -e "\n${YELLOW}Test 5: Users List${NC}"
echo "GET /api/admin/users?limit=5"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE/users?limit=5" \
  -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Success (HTTP $HTTP_CODE)${NC}"
    echo "$BODY" | jq '{user_count: (.users | length)}' 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}❌ Failed (HTTP $HTTP_CODE)${NC}"
    echo "$BODY"
fi

# Test 6: Payouts List
echo -e "\n${YELLOW}Test 6: Payouts List${NC}"
echo "GET /api/admin/payouts?limit=5"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE/payouts?limit=5" \
  -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✅ Success (HTTP $HTTP_CODE)${NC}"
    echo "$BODY" | jq '{payout_count: (.payouts | length)}' 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}❌ Failed (HTTP $HTTP_CODE)${NC}"
    echo "$BODY"
fi

echo -e "\n================================================"
echo -e "${GREEN}✅ Admin endpoint tests complete!${NC}"

