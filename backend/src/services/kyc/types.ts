/**
 * TypeScript types for KYC verification services
 */

// ============================================================================
// Smile Identity Types
// ============================================================================

export interface SmileIDConfig {
  partnerId: string;
  apiKey: string;
  callbackUrl?: string;
  sandbox: boolean;
}

export type SmileIDDocumentType =
  | 'NIN' // National Identity Number
  | 'BVN' // Bank Verification Number
  | 'DRIVERS_LICENSE'
  | 'VOTERS_CARD'
  | 'PASSPORT'
  | 'NATIONAL_ID';

export type SmileIDJobType =
  | 1 // Biometric KYC
  | 2 // Smart Selfie Authentication
  | 4 // Basic KYC
  | 5 // Enhanced KYC
  | 6 // Document Verification
  | 7 // Business Verification
  | 11; // Enhanced Document Verification

export interface SmileIDPartnerParams {
  user_id: string;
  job_id: string;
  job_type: SmileIDJobType;
}

export interface SmileIDIDInfo {
  country: string; // 'NG' for Nigeria
  id_type: SmileIDDocumentType;
  id_number?: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  dob?: string; // YYYY-MM-DD
  phone_number?: string;
  entered: boolean;
}

export interface SmileIDImageDetails {
  image_type_id: number; // 0 = Selfie, 1 = ID Card Front, 2 = ID Card Back, 3 = Liveness
  image: string; // Base64 encoded image
}

export interface SmileIDSubmitJobRequest {
  partner_params: SmileIDPartnerParams;
  id_info?: SmileIDIDInfo;
  images: SmileIDImageDetails[];
  callback_url?: string;
  source_sdk?: string;
  source_sdk_version?: string;
}

export interface SmileIDJobResult {
  ResultText: string;
  ResultCode: string;
  ConfidenceValue: string;
  IsFinalResult: string;
  IsMachineResult: string;
}

export interface SmileIDJobResponse {
  job_complete: boolean;
  job_success: boolean;
  code: string;
  result: SmileIDJobResult;
  image_links: {
    selfie_image: string;
  };
  timestamp: string;
  signature: string;
}

export interface SmileIDWebhookPayload {
  job_id: string;
  user_id: string;
  job_type: SmileIDJobType;
  job_complete: boolean;
  job_success: boolean;
  result: SmileIDJobResult;
  image_links: {
    selfie_image: string;
  };
  timestamp: string;
  signature: string;
}

// ============================================================================
// Generic KYC Types
// ============================================================================

export type KYCStatus =
  | 'pending'
  | 'in_progress'
  | 'verified'
  | 'rejected'
  | 'expired'
  | 'requires_review';

export type KYCDocumentType =
  | 'nin'
  | 'bvn'
  | 'drivers_license'
  | 'voters_card'
  | 'passport'
  | 'national_id';

export interface KYCDocument {
  type: KYCDocumentType;
  number?: string;
  frontImage?: string; // Base64 or URL
  backImage?: string; // Base64 or URL
  selfieImage?: string; // Base64 or URL
}

export interface KYCVerificationRequest {
  userId: string;
  document: KYCDocument;
  userInfo: {
    firstName: string;
    lastName: string;
    middleName?: string;
    dateOfBirth?: string;
    phoneNumber?: string;
  };
}

export interface KYCVerificationResult {
  status: KYCStatus;
  referenceId: string;
  provider: string;
  confidenceScore?: number;
  verifiedData?: {
    firstName?: string;
    lastName?: string;
    middleName?: string;
    dateOfBirth?: string;
    phoneNumber?: string;
    address?: string;
    gender?: string;
    photo?: string;
  };
  rejectionReason?: string;
  verifiedAt?: Date;
  expiresAt?: Date;
}

export interface KYCProvider {
  name: string;
  verifyIdentity(request: KYCVerificationRequest): Promise<KYCVerificationResult>;
  getVerificationStatus(referenceId: string): Promise<KYCVerificationResult>;
  verifyBVN(bvn: string, userInfo: { firstName: string; lastName: string; dateOfBirth: string }): Promise<KYCVerificationResult>;
  verifyNIN(nin: string, userInfo: { firstName: string; lastName: string; dateOfBirth?: string }): Promise<KYCVerificationResult>;
}

// ============================================================================
// Database Types
// ============================================================================

export interface KYCVerification {
  id: string;
  user_id: string;
  provider: string;
  reference_id: string;
  document_type: KYCDocumentType;
  document_number?: string;
  status: KYCStatus;
  confidence_score?: number;
  verification_data?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface UserKYCData {
  kyc_status: KYCStatus;
  kyc_provider?: string;
  kyc_reference_id?: string;
  kyc_verified_at?: Date;
  kyc_rejection_reason?: string;
  kyc_document_type?: KYCDocumentType;
  kyc_document_number?: string;
  kyc_selfie_url?: string;
  kyc_document_url?: string;
}

// ============================================================================
// Error Types
// ============================================================================

export class KYCError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: any
  ) {
    super(message);
    this.name = 'KYCError';
  }
}

export class SmileIDError extends KYCError {
  constructor(message: string, code: string, details?: any) {
    super(message, code, 400, details);
    this.name = 'SmileIDError';
  }
}

