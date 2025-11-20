# SolPay Admin Endpoints Test Script (PowerShell)
# Usage: .\test-admin-endpoints.ps1 YOUR_JWT_TOKEN

param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

$ApiBase = "http://localhost:3001/api/admin"

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Endpoint
    )
    
    Write-Host "`n" -NoNewline
    Write-Host "Test: $Name" -ForegroundColor Yellow
    Write-Host "GET $Endpoint"
    
    try {
        $headers = @{
            "Authorization" = "Bearer $Token"
            "Content-Type" = "application/json"
        }
        
        $response = Invoke-RestMethod -Uri "$ApiBase$Endpoint" -Headers $headers -Method Get
        Write-Host "✅ Success" -ForegroundColor Green
        $response | ConvertTo-Json -Depth 3
    }
    catch {
        Write-Host "❌ Failed" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
}

Write-Host "🔐 Testing SolPay Admin Endpoints" -ForegroundColor Yellow
Write-Host "================================================"

# Test 1: Dashboard Stats
Test-Endpoint -Name "Dashboard Stats" -Endpoint "/stats"

# Test 2: Transaction Analytics
Test-Endpoint -Name "Transaction Analytics" -Endpoint "/analytics/transactions"

# Test 3: All Transactions
Test-Endpoint -Name "All Transactions (5)" -Endpoint "/analytics/all-transactions?limit=5"

# Test 4: Revenue Analytics
Test-Endpoint -Name "Revenue Analytics" -Endpoint "/analytics/revenue"

# Test 5: Users List
Test-Endpoint -Name "Users List (5)" -Endpoint "/users?limit=5"

# Test 6: Payouts List
Test-Endpoint -Name "Payouts List (5)" -Endpoint "/payouts?limit=5"

Write-Host "`n================================================"
Write-Host "✅ Admin endpoint tests complete!" -ForegroundColor Green

