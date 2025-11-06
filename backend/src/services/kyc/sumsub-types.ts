/**
 * Sumsub API Types
 * Documentation: https://developers.sumsub.com/api-reference/
 */

// Applicant Status
export type ApplicantStatus = 
  | 'init'           // Initial state
  | 'pending'        // Verification in progress
  | 'queued'         // Queued for review
  | 'completed'      // Verification completed
  | 'onHold';        // On hold

// Review Status
export type ReviewStatus =
  | 'init'           // Not reviewed yet
  | 'pending'        // Review in progress
  | 'prechecked'     // Auto-checked, pending final review
  | 'queued'         // Queued for manual review
  | 'completed'      // Review completed
  | 'onHold';        // On hold

// Review Result
export type ReviewResult =
  | 'GREEN'          // Approved
  | 'RED'            // Rejected
  | 'RETRY';         // Needs retry

// Applicant Data
export interface SumsubApplicant {
  id: string;
  createdAt: string;
  key?: string;
  clientId?: string;
  inspectionId?: string;
  externalUserId?: string;
  info?: {
    firstName?: string;
    lastName?: string;
    middleName?: string;
    dob?: string;
    country?: string;
    phone?: string;
    addresses?: Array<{
      country?: string;
      postCode?: string;
      town?: string;
      street?: string;
      subStreet?: string;
      state?: string;
    }>;
  };
  email?: string;
  phone?: string;
  review?: {
    reviewId: string;
    attemptId: string;
    attemptCnt: number;
    levelName: string;
    createDate: string;
    reviewDate?: string;
    reviewResult?: {
      reviewAnswer: ReviewResult;
      rejectLabels?: string[];
      reviewRejectType?: string;
    };
    reviewStatus: ReviewStatus;
  };
  type?: string;
}

// Create Applicant Request
export interface CreateApplicantRequest {
  externalUserId: string;
  levelName?: string;
  email?: string;
  phone?: string;
  fixedInfo?: {
    firstName?: string;
    lastName?: string;
    dob?: string;
    country?: string;
  };
}

// Access Token Response
export interface AccessTokenResponse {
  token: string;
  userId: string;
}

// Webhook Event Types
export type WebhookType =
  | 'applicantCreated'
  | 'applicantPending'
  | 'applicantReviewed'
  | 'applicantOnHold'
  | 'applicantPersonalInfoChanged'
  | 'applicantReset'
  | 'applicantDeleted';

// Webhook Payload
export interface SumsubWebhookPayload {
  applicantId: string;
  inspectionId: string;
  correlationId: string;
  levelName: string;
  externalUserId?: string;
  type: WebhookType;
  reviewStatus?: ReviewStatus;
  reviewResult?: {
    reviewAnswer: ReviewResult;
    rejectLabels?: string[];
    reviewRejectType?: string;
  };
  createdAt: string;
  clientId?: string;
  sandboxMode?: boolean;
}

// Verification Documents
export interface VerificationDocument {
  idDocType: string;
  country: string;
  firstName?: string;
  lastName?: string;
  number?: string;
  dob?: string;
  issuedDate?: string;
  validUntil?: string;
}

// Applicant Status Response
export interface ApplicantStatusResponse {
  applicantId: string;
  status: ApplicantStatus;
  reviewStatus: ReviewStatus;
  reviewResult?: ReviewResult;
  rejectLabels?: string[];
  moderationComment?: string;
}

// KYC Tier Mapping
export const KYC_TIER_MAPPING: Record<string, number> = {
  'basic-kyc-level': 1,
  'advanced-kyc-level': 2,
  'premium-kyc-level': 3,
};

// Nigerian Document Types
export const NIGERIAN_DOCUMENT_TYPES = [
  'ID_CARD',           // National ID Card
  'DRIVERS',           // Driver's License
  'PASSPORT',          // International Passport
  'VOTER_CARD',        // Voter's Card
  'RESIDENCE_PERMIT',  // Residence Permit
] as const;

export type NigerianDocumentType = typeof NIGERIAN_DOCUMENT_TYPES[number];

