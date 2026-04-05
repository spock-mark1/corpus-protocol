import type {
  Corpus,
  CorpusCreated,
  CorpusDetail,
  CreateCorpusParams,
  ReportActivityParams,
  Activity,
  ReportRevenueParams,
  Revenue,
  CreateApprovalParams,
  Approval,
  RegisterServiceParams,
  CommerceService,
  SignPaymentParams,
  SignedPayment,
  DiscoverServicesParams,
  PurchaseServiceParams,
  CommerceJob,
  Wallet,
} from "./types.js";

export interface CorpusClientOptions {
  baseUrl?: string;
  apiKey?: string;
}

export class CorpusClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(options: CorpusClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? "https://corpus-protocol-web.vercel.app").replace(/\/$/, "");
    this.headers = { "Content-Type": "application/json" };
    if (options.apiKey) {
      this.headers["Authorization"] = `Bearer ${options.apiKey}`;
    }
  }

  // ── Internal fetch helper ──────────────────────────────────

  private async request<T>(
    path: string,
    init?: RequestInit & { params?: Record<string, string> },
  ): Promise<T> {
    let url = `${this.baseUrl}${path}`;
    if (init?.params) {
      const qs = new URLSearchParams(init.params).toString();
      if (qs) url += `?${qs}`;
    }
    const res = await fetch(url, {
      ...init,
      headers: { ...this.headers, ...init?.headers },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new CorpusAPIError(res.status, body, path);
    }
    return res.json() as Promise<T>;
  }

  // ── Corpus CRUD ────────────────────────────────────────────

  async listCorpuses(): Promise<Corpus[]> {
    return this.request("/api/corpus");
  }

  async getCorpus(id: string): Promise<CorpusDetail> {
    return this.request(`/api/corpus/${id}`);
  }

  async getCorpusMe(): Promise<CorpusDetail> {
    return this.request("/api/corpus/me");
  }

  async createCorpus(params: CreateCorpusParams): Promise<CorpusCreated> {
    return this.request("/api/corpus", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  // ── Activity ───────────────────────────────────────────────

  async reportActivity(corpusId: string, params: ReportActivityParams): Promise<Activity> {
    return this.request(`/api/corpus/${corpusId}/activity`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  // ── Revenue ────────────────────────────────────────────────

  async reportRevenue(corpusId: string, params: ReportRevenueParams): Promise<Revenue> {
    return this.request(`/api/corpus/${corpusId}/revenue`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  // ── Approvals ──────────────────────────────────────────────

  async createApproval(corpusId: string, params: CreateApprovalParams): Promise<Approval> {
    return this.request(`/api/corpus/${corpusId}/approvals`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async getApprovals(corpusId: string, status?: string): Promise<Approval[]> {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    return this.request(`/api/corpus/${corpusId}/approvals`, { params });
  }

  async getApproval(corpusId: string, approvalId: string): Promise<Approval> {
    return this.request(`/api/corpus/${corpusId}/approvals/${approvalId}`);
  }

  // ── Status ─────────────────────────────────────────────────

  async updateStatus(corpusId: string, online: boolean): Promise<void> {
    await this.request(`/api/corpus/${corpusId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ agentOnline: online }),
    });
  }

  // ── Commerce / x402 ────────────────────────────────────────

  async registerService(corpusId: string, params: RegisterServiceParams): Promise<CommerceService> {
    return this.request(`/api/corpus/${corpusId}/service`, {
      method: "PUT",
      body: JSON.stringify(params),
    });
  }

  async discoverServices(params?: DiscoverServicesParams): Promise<CommerceService[]> {
    const p: Record<string, string> = {};
    if (params?.category) p.category = params.category;
    if (params?.target) p.target = params.target;
    return this.request("/api/services", { params: p });
  }

  async purchaseService(
    corpusId: string,
    params: PurchaseServiceParams,
  ): Promise<CommerceJob> {
    return this.request(`/api/corpus/${corpusId}/service`, {
      method: "POST",
      body: JSON.stringify({ payload: params.payload }),
      headers: { "X-PAYMENT": params.paymentHeader },
    });
  }

  // ── Wallet & Payments ──────────────────────────────────────

  async getWallet(corpusId: string): Promise<Wallet> {
    return this.request(`/api/corpus/${corpusId}/wallet`);
  }

  async signPayment(corpusId: string, params: SignPaymentParams): Promise<SignedPayment> {
    return this.request(`/api/corpus/${corpusId}/sign`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  }
}

export class CorpusAPIError extends Error {
  constructor(
    public status: number,
    public body: string,
    public path: string,
  ) {
    super(`Corpus API error ${status} on ${path}: ${body}`);
    this.name = "CorpusAPIError";
  }
}
