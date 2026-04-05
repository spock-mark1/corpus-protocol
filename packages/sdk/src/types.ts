// ── Request types ────────────────────────────────────────────────

export interface CreateCorpusParams {
  name: string;
  category: string;
  description: string;
  totalSupply?: number;
  persona?: string;
  targetAudience?: string;
  channels?: string[];
  toneVoice?: string;
  approvalThreshold?: number;
  gtmBudget?: number;
  creatorAddress?: string;
  walletAddress?: string;
  onChainId?: number;
  agentName?: string;
  initialPrice?: number;
  minPatronPulse?: number;
  hederaTokenId?: string;
  serviceName?: string;
  serviceDescription?: string;
  servicePrice?: number;
}

export interface ReportActivityParams {
  type: string;
  content: string;
  channel: string;
}

export interface ReportRevenueParams {
  amount: number;
  currency?: string;
  source: string;
  txHash?: string;
}

export interface CreateApprovalParams {
  type: string;
  title: string;
  description?: string;
  amount?: number;
}

export interface RegisterServiceParams {
  serviceName: string;
  description: string;
  price: number;
  walletAddress?: string;
}

export interface SignPaymentParams {
  payee: string;
  amount: number;
  tokenAddress?: string;
  chainId?: number;
}

export interface DiscoverServicesParams {
  category?: string;
  target?: string;
}

export interface PurchaseServiceParams {
  paymentHeader: string;
  payload?: Record<string, unknown>;
}

// ── Response types ───────────────────────────────────────────────

export interface Corpus {
  id: string;
  onChainId?: number;
  agentName?: string;
  name: string;
  category: string;
  description: string;
  status: string;
  hederaTokenId?: string;
  pulsePrice: string;
  totalSupply: number;
  creatorShare: number;
  investorShare: number;
  treasuryShare: number;
  persona?: string;
  targetAudience?: string;
  channels: string[];
  toneVoice?: string;
  approvalThreshold: string;
  gtmBudget: string;
  minPatronPulse?: number;
  agentOnline: boolean;
  agentLastSeen?: string;
  walletAddress?: string;
  creatorAddress?: string;
  investorAddress?: string;
  treasuryAddress?: string;
  createdAt: string;
  updatedAt: string;
  patrons?: number;
}

export interface CorpusDetail extends Corpus {
  apiKeyMasked?: string;
  activities?: Activity[];
  approvals?: Approval[];
  revenues?: Revenue[];
  commerceServices?: CommerceService[];
}

export interface CorpusCreated extends Corpus {
  apiKeyOnce: string;
}

export interface Activity {
  id: string;
  corpusId: string;
  type: string;
  content: string;
  channel: string;
  status: string;
  createdAt: string;
}

export interface Approval {
  id: string;
  corpusId: string;
  type: string;
  title: string;
  description?: string;
  amount?: string;
  status: string;
  decidedAt?: string;
  decidedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Revenue {
  id: string;
  corpusId: string;
  amount: string;
  currency: string;
  source: string;
  txHash?: string;
  createdAt: string;
}

export interface CommerceService {
  id: string;
  corpusId: string;
  serviceName: string;
  description?: string;
  price: string;
  currency: string;
  walletAddress: string;
  chains: string[];
  fulfillmentMode: string;
}

export interface CommerceJob {
  id: string;
  corpusId: string;
  requesterCorpusId: string;
  serviceName: string;
  payload?: unknown;
  result?: unknown;
  status: string;
  amount: string;
  createdAt: string;
}

export interface PaymentDetails {
  price: number;
  payee: string;
  token: string;
  network: string;
}

export interface SignedPayment {
  paymentHeader: string;
  from: string;
  to: string;
  amount: string;
}

export interface Wallet {
  walletId: string;
  address: string;
}
