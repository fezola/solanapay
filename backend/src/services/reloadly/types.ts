/**
 * Reloadly API Types
 * Types for airtime and data top-up operations
 */

export interface ReloadlyConfig {
  clientId: string;
  clientSecret: string;
  sandbox?: boolean;
}

export interface ReloadlyAuthResponse {
  access_token: string;
  scope: string;
  expires_in: number;
  token_type: string;
}

export interface ReloadlyOperator {
  id: number;
  operatorId: number;
  name: string;
  bundle: boolean;
  data: boolean;
  pin: boolean;
  supportsLocalAmounts: boolean;
  supportsGeographicalRechargePlans: boolean;
  denominationType: 'FIXED' | 'RANGE';
  senderCurrencyCode: string;
  senderCurrencySymbol: string;
  destinationCurrencyCode: string;
  destinationCurrencySymbol: string;
  commission: number;
  internationalDiscount: number;
  localDiscount: number;
  mostPopularAmount: number | null;
  mostPopularLocalAmount: number | null;
  minAmount: number | null;
  maxAmount: number | null;
  localMinAmount: number | null;
  localMaxAmount: number | null;
  country: {
    isoName: string;
    name: string;
  };
  fx: {
    rate: number;
    currencyCode: string;
  };
  logoUrls: string[];
  fixedAmounts: number[];
  fixedAmountsDescriptions: Record<string, string>;
  localFixedAmounts: number[];
  localFixedAmountsDescriptions: Record<string, string>;
  suggestedAmounts: number[];
  suggestedAmountsMap: Record<string, number>;
  promotions: ReloadlyPromotion[];
}

export interface ReloadlyPromotion {
  promotionId: number;
  title: string;
  title2: string;
  description: string;
  startDate: string;
  endDate: string;
  denominations: string;
  localDenominations: string;
}

export interface ReloadlyTopupRequest {
  operatorId: number;
  amount: number;
  useLocalAmount: boolean;
  customIdentifier: string;
  recipientPhone: {
    countryCode: string;
    number: string;
  };
  senderPhone?: {
    countryCode: string;
    number: string;
  };
}

export interface ReloadlyTopupResponse {
  transactionId: number;
  operatorTransactionId: string | null;
  customIdentifier: string;
  recipientPhone: string;
  recipientEmail: string | null;
  senderPhone: string;
  countryCode: string;
  operatorId: number;
  operatorName: string;
  discount: number;
  discountCurrencyCode: string;
  requestedAmount: number;
  requestedAmountCurrencyCode: string;
  deliveredAmount: number;
  deliveredAmountCurrencyCode: string;
  transactionDate: string;
  pinDetail: {
    serial: string;
    info1: string;
    info2: string;
    info3: string;
    value: string | null;
    code: string | null;
    ivr: string | null;
    validity: string | null;
  } | null;
  balanceInfo: {
    oldBalance: number;
    newBalance: number;
    currencyCode: string;
    currencyName: string;
    updatedAt: string;
  };
}

export interface ReloadlyAutoDetectResponse {
  operatorId: number;
  name: string;
  bundle: boolean;
  data: boolean;
  pin: boolean;
  denominationType: string;
  country: {
    isoName: string;
    name: string;
  };
}

export class ReloadlyAPIError extends Error {
  constructor(
    public code: string,
    public message: string,
    public status: number,
    public details?: any
  ) {
    super(message);
    this.name = 'ReloadlyAPIError';
  }
}

// Nigerian network operators
export const NIGERIAN_OPERATORS = {
  MTN: 'MTN Nigeria',
  AIRTEL: 'Airtel Nigeria',
  GLO: 'Glo',
  '9MOBILE': '9mobile (Etisalat)',
} as const;

export type NigerianOperator = keyof typeof NIGERIAN_OPERATORS;

