/**
 * Nigerian Banks Data with Logos and Bank Codes
 * Data sourced from Paystack and Nigerian banking system
 */

export interface NigerianBank {
  name: string;
  code: string;
  slug: string;
  logo: string;
}

export const NIGERIAN_BANKS: NigerianBank[] = [
  {
    name: 'Access Bank',
    code: '044',
    slug: 'access-bank',
    logo: '', // Logo removed - will use fallback
  },
  {
    name: 'Citibank Nigeria',
    code: '023',
    slug: 'citibank-nigeria',
    logo: '', // Logo removed - will use fallback
  },
  {
    name: 'Ecobank Nigeria',
    code: '050',
    slug: 'ecobank-nigeria',
    logo: '', // Logo removed - will use fallback
  },
  {
    name: 'Fidelity Bank',
    code: '070',
    slug: 'fidelity-bank',
    logo: '', // Logo removed - will use fallback
  },
  {
    name: 'First Bank of Nigeria',
    code: '011',
    slug: 'first-bank-of-nigeria',
    logo: '', // Logo removed - will use fallback
  },
  {
    name: 'First City Monument Bank',
    code: '214',
    slug: 'first-city-monument-bank',
    logo: '', // Logo removed - will use fallback
  },
  {
    name: 'Guaranty Trust Bank',
    code: '058',
    slug: 'guaranty-trust-bank',
    logo: '',
  },
  {
    name: 'Heritage Bank',
    code: '030',
    slug: 'heritage-bank',
    logo: '',
  },
  {
    name: 'Keystone Bank',
    code: '082',
    slug: 'keystone-bank',
    logo: '',
  },
  {
    name: 'Kuda Bank',
    code: '50211',
    slug: 'kuda-bank',
    logo: '',
  },
  {
    name: 'Opay',
    code: '999992',
    slug: 'opay',
    logo: '',
  },
  {
    name: 'PalmPay',
    code: '999991',
    slug: 'palmpay',
    logo: '',
  },
  {
    name: 'Moniepoint',
    code: '50515',
    slug: 'moniepoint',
    logo: '',
  },
  {
    name: 'Polaris Bank',
    code: '076',
    slug: 'polaris-bank',
    logo: '',
  },
  {
    name: 'Providus Bank',
    code: '101',
    slug: 'providus-bank',
    logo: '',
  },
  {
    name: 'Stanbic IBTC Bank',
    code: '221',
    slug: 'stanbic-ibtc-bank',
    logo: '',
  },
  {
    name: 'Standard Chartered Bank',
    code: '068',
    slug: 'standard-chartered-bank',
    logo: '',
  },
  {
    name: 'Sterling Bank',
    code: '232',
    slug: 'sterling-bank',
    logo: '',
  },
  {
    name: 'Union Bank of Nigeria',
    code: '032',
    slug: 'union-bank-of-nigeria',
    logo: '',
  },
  {
    name: 'United Bank for Africa',
    code: '033',
    slug: 'united-bank-for-africa',
    logo: '',
  },
  {
    name: 'Unity Bank',
    code: '215',
    slug: 'unity-bank',
    logo: '',
  },
  {
    name: 'Wema Bank',
    code: '035',
    slug: 'wema-bank',
    logo: '',
  },
  {
    name: 'Zenith Bank',
    code: '057',
    slug: 'zenith-bank',
    logo: '',
  },
  {
    name: 'VFD Microfinance Bank',
    code: '566',
    slug: 'vfd-microfinance-bank',
    logo: '',
  },
  {
    name: 'Carbon',
    code: '565',
    slug: 'carbon',
    logo: '',
  },
  {
    name: 'FairMoney',
    code: '51318',
    slug: 'fairmoney',
    logo: '',
  },
  {
    name: 'Sparkle',
    code: '51310',
    slug: 'sparkle',
    logo: '',
  },
  {
    name: 'Rubies Bank',
    code: '125',
    slug: 'rubies-bank',
    logo: '',
  },
  {
    name: 'Jaiz Bank',
    code: '301',
    slug: 'jaiz-bank',
    logo: '',
  },
  {
    name: 'Suntrust Bank',
    code: '100',
    slug: 'suntrust-bank',
    logo: '',
  },
  {
    name: 'Globus Bank',
    code: '00103',
    slug: 'globus-bank',
    logo: '',
  },
  {
    name: 'Parallex Bank',
    code: '526',
    slug: 'parallex-bank',
    logo: '',
  },
  {
    name: 'Titan Trust Bank',
    code: '102',
    slug: 'titan-trust-bank',
    logo: '',
  },
  {
    name: 'Lotus Bank',
    code: '303',
    slug: 'lotus-bank',
    logo: '',
  },
  {
    name: 'TAJ Bank',
    code: '302',
    slug: 'taj-bank',
    logo: '',
  },
  {
    name: 'Premium Trust Bank',
    code: '105',
    slug: 'premium-trust-bank',
    logo: '',
  },
  {
    name: 'Renmoney',
    code: '50767',
    slug: 'renmoney',
    logo: '',
  },
  {
    name: 'ALAT by Wema',
    code: '035A',
    slug: 'alat-by-wema',
    logo: '',
  },
  {
    name: 'Eyowo',
    code: '50126',
    slug: 'eyowo',
    logo: '',
  },
  {
    name: 'Paga',
    code: '100002',
    slug: 'paga',
    logo: '',
  },
  {
    name: 'GoMoney',
    code: '100022',
    slug: 'gomoney',
    logo: '',
  },
  {
    name: 'VBank',
    code: '51314',
    slug: 'vbank',
    logo: '',
  },
  {
    name: 'Mint',
    code: '50304',
    slug: 'mint',
    logo: '',
  },
];

/**
 * Get bank by code
 */
export function getBankByCode(code: string): NigerianBank | undefined {
  return NIGERIAN_BANKS.find(bank => bank.code === code);
}

/**
 * Get bank by name
 */
export function getBankByName(name: string): NigerianBank | undefined {
  return NIGERIAN_BANKS.find(bank => 
    bank.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Get bank by slug
 */
export function getBankBySlug(slug: string): NigerianBank | undefined {
  return NIGERIAN_BANKS.find(bank => bank.slug === slug);
}

/**
 * Search banks by name
 */
export function searchBanks(query: string): NigerianBank[] {
  const lowerQuery = query.toLowerCase();
  return NIGERIAN_BANKS.filter(bank =>
    bank.name.toLowerCase().includes(lowerQuery) ||
    bank.slug.includes(lowerQuery)
  );
}

/**
 * Get all bank codes
 */
export function getAllBankCodes(): string[] {
  return NIGERIAN_BANKS.map(bank => bank.code);
}

/**
 * Validate bank code
 */
export function isValidBankCode(code: string): boolean {
  return NIGERIAN_BANKS.some(bank => bank.code === code);
}

