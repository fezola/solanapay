/**
 * Check Polygon USDT/USDC Balance
 */

import { ethers } from 'ethers';
import 'dotenv/config';

const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';
const POLYGON_USDT_CONTRACT = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
const POLYGON_USDC_CONTRACT = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';

const USER_WALLET = '0x2dedbD967Fd8F493A9a2bA6D210702e3dF992dA3'; // From the error logs

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

async function checkBalance() {
  console.log(`\n🔍 Checking Polygon balances for ${USER_WALLET}...\n`);

  const provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);

  // Check USDT
  const usdtContract = new ethers.Contract(POLYGON_USDT_CONTRACT, ERC20_ABI, provider);
  const usdtBalance = await usdtContract.balanceOf(USER_WALLET);
  const usdtDecimals = await usdtContract.decimals();
  const usdtSymbol = await usdtContract.symbol();
  const usdtFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);

  console.log(`${usdtSymbol}: ${usdtFormatted}`);

  // Check USDC
  const usdcContract = new ethers.Contract(POLYGON_USDC_CONTRACT, ERC20_ABI, provider);
  const usdcBalance = await usdcContract.balanceOf(USER_WALLET);
  const usdcDecimals = await usdcContract.decimals();
  const usdcSymbol = await usdcContract.symbol();
  const usdcFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);

  console.log(`${usdcSymbol}: ${usdcFormatted}`);

  // Check MATIC (gas)
  const maticBalance = await provider.getBalance(USER_WALLET);
  const maticFormatted = ethers.formatEther(maticBalance);

  console.log(`MATIC: ${maticFormatted}`);

  console.log('');
}

checkBalance()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

