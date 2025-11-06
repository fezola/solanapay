import { BreadService } from '../services/bread/index.js';
import { config } from 'dotenv';

config();

const breadService = new BreadService({
  apiKey: process.env.BREAD_API_KEY!,
  baseUrl: process.env.BREAD_API_URL || 'https://processor-prod.up.railway.app',
});

async function testVerifyFlow() {
  try {
    console.log('Testing bank verification flow...\n');

    // Test bank details - use a real Nigerian bank
    const bankCode = '044'; // Access Bank
    const accountNumber = '0690000031'; // Test account number

    console.log('Step 1: Get banks list');
    const banks = await breadService.offramp.getBanks();
    const bank = banks.find((b: any) => b.code === bankCode);
    console.log('Bank found:', bank?.name);

    console.log('\nStep 2: Create identity');
    const identity = await breadService.identity.createIdentity({
      firstName: 'Test',
      lastName: 'User',
      email: `test${Date.now()}@example.com`,
      phoneNumber: '+2348012345678',
      address: { country: 'NG' },
    });
    console.log('Identity created:', identity.id);

    console.log('\nStep 3: Create beneficiary (this verifies the account)');
    const beneficiary = await breadService.beneficiary.createBeneficiary({
      identityId: identity.id,
      bankCode: bankCode,
      accountNumber: accountNumber,
      currency: 'NGN',
    });

    console.log('\n✅ SUCCESS!');
    console.log('Beneficiary ID:', beneficiary.id);
    console.log('Account Name:', beneficiary.accountName);
    console.log('Account Number:', beneficiary.accountNumber);
    console.log('Bank Code:', beneficiary.bankCode);

  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response, null, 2));
    }
    if (error.data) {
      console.error('Data:', JSON.stringify(error.data, null, 2));
    }
  }
}

testVerifyFlow();

