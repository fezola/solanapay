/**
 * Bridge USDC from Ethereum to Base using Across Protocol
 * For feransamk4@gmail.com - 200 USDC stuck on ETH mainnet
 */

const { ethers } = require('ethers');
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

console.log('Mnemonic loaded:', process.env.WALLET_MNEMONIC ? 'YES' : 'NO');

const WALLET_ADDRESS = '0xd0356F4Af302712E4F2ea3a12e5B2E7174e09329';
const DERIVATION_PATH = "m/44'/60'/0'/0/1";

// Ethereum mainnet
const ETH_RPC = 'https://eth.llamarpc.com';

// Token addresses
const USDC_ETH = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// Across SpokePool on Ethereum mainnet
const ACROSS_SPOKE_POOL = '0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5';

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

const SPOKE_POOL_ABI = [
  'function depositV3(address depositor, address recipient, address inputToken, address outputToken, uint256 inputAmount, uint256 outputAmount, uint256 destinationChainId, address exclusiveRelayer, uint32 quoteTimestamp, uint32 fillDeadline, uint32 exclusivityDeadline, bytes message) payable',
];

async function main() {
  console.log('🌉 Bridging USDC from Ethereum to Base via Across\n');

  const provider = new ethers.JsonRpcProvider(ETH_RPC);
  const hdNode = ethers.HDNodeWallet.fromPhrase(process.env.WALLET_MNEMONIC);
  const wallet = hdNode.derivePath(DERIVATION_PATH).connect(provider);

  console.log('Wallet:', wallet.address);

  // Check balances
  const ethBalance = await provider.getBalance(wallet.address);
  console.log('ETH Balance:', ethers.formatEther(ethBalance), 'ETH');

  const usdc = new ethers.Contract(USDC_ETH, ERC20_ABI, wallet);
  const usdcBalance = await usdc.balanceOf(wallet.address);
  console.log('USDC Balance:', ethers.formatUnits(usdcBalance, 6), 'USDC\n');

  const amountToBridge = usdcBalance; // Bridge all USDC
  console.log('Amount to bridge:', ethers.formatUnits(amountToBridge, 6), 'USDC');

  // Get quote from Across
  console.log('\n📊 Getting quote from Across...');
  const quoteParams = {
    originChainId: 1,
    destinationChainId: 8453,
    inputToken: USDC_ETH,
    outputToken: USDC_BASE,
    amount: amountToBridge.toString(),
    recipient: wallet.address,
    depositor: wallet.address,
  };

  const quoteResponse = await axios.get('https://app.across.to/api/suggested-fees', { params: quoteParams });
  const quote = quoteResponse.data;

  const totalFee = BigInt(quote.totalRelayFee.total);
  const outputAmount = amountToBridge - totalFee;
  console.log('Bridge Fee:', ethers.formatUnits(totalFee, 6), 'USDC');
  console.log('You will receive:', ethers.formatUnits(outputAmount, 6), 'USDC on Base\n');

  // Step 1: Approve USDC spending
  console.log('📝 Step 1: Approving USDC for Across...');
  const allowance = await usdc.allowance(wallet.address, ACROSS_SPOKE_POOL);
  if (allowance < amountToBridge) {
    const approveTx = await usdc.approve(ACROSS_SPOKE_POOL, amountToBridge);
    console.log('Approval TX:', approveTx.hash);
    await approveTx.wait();
    console.log('✅ Approved!\n');
  } else {
    console.log('✅ Already approved\n');
  }

  // Step 2: Execute bridge deposit
  console.log('🚀 Step 2: Executing bridge deposit...');
  const spokePool = new ethers.Contract(ACROSS_SPOKE_POOL, SPOKE_POOL_ABI, wallet);

  const quoteTimestamp = quote.timestamp;
  const fillDeadline = Math.floor(Date.now() / 1000) + 21600; // 6 hours
  const exclusivityDeadline = 0;
  const exclusiveRelayer = '0x0000000000000000000000000000000000000000';
  const message = '0x';

  const depositTx = await spokePool.depositV3(
    wallet.address,           // depositor
    wallet.address,           // recipient (same address on Base)
    USDC_ETH,                 // inputToken
    USDC_BASE,                // outputToken
    amountToBridge,           // inputAmount
    outputAmount,             // outputAmount
    8453,                     // destinationChainId (Base)
    exclusiveRelayer,
    quoteTimestamp,
    fillDeadline,
    exclusivityDeadline,
    message,
    { gasLimit: 150000 }
  );

  console.log('Bridge TX:', depositTx.hash);
  console.log('View on Etherscan: https://etherscan.io/tx/' + depositTx.hash);

  const receipt = await depositTx.wait();
  console.log('\n✅ Bridge initiated!');
  console.log('Gas used:', receipt.gasUsed.toString());
  console.log('\n⏳ Funds should arrive on Base within 1-5 minutes.');
  console.log('Track at: https://app.across.to/transactions');
}

main().catch(console.error);

