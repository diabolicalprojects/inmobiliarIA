/**
 * OpenWA HTTP Client
 *
 * All communication with the WhatsApp microservice goes through this class.
 * It handles session management, message sending, and status polling.
 */

interface OpenWAConfig {
  baseUrl: string;
  apiKey: string;
}

interface StartSessionResponse {
  qrCodeBase64?: string;
  sessionId: string;
  sessionName: string;
  status: string;
}

type SessionRecord = {
  id?: string;
  name?: string;
  status?: string;
  qrCode?: string;
  qrCodeBase64?: string;
  qr?: string;
  data?: {
    qrCode?: string;
    qrCodeBase64?: string;
    qr?: string;
    status?: string;
  };
};

type SessionListRecord = SessionRecord & {
  sessionId?: string;
};

export class OpenWAClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config?: OpenWAConfig) {
    this.baseUrl = (config?.baseUrl || process.env.OPENWA_BASE_URL || "").replace(/\/$/, "");
    this.apiKey = config?.apiKey || process.env.OPENWA_API_KEY || "";

    if (!this.baseUrl) {
      throw new Error("[OpenWA] OPENWA_BASE_URL is not configured");
    }
    if (!this.apiKey) {
      throw new Error("[OpenWA] OPENWA_API_KEY is not configured");
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    raw: boolean = false
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": this.apiKey,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(
          `[OpenWA] Error ${response.status}: ${errorBody} on ${url}`
        );
        throw new Error(
          `OpenWA API error ${response.status}: ${response.statusText}`
        );
      }

      if (raw) return response as unknown as T;
      const text = await response.text();
      if (!text) return {} as T;
      try {
        return JSON.parse(text) as T;
      } catch {
        return text as T;
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("OpenWA API error")) {
        throw error;
      }
      console.error(`[OpenWA] Network error:`, error);
      throw new Error(
        `OpenWA connection failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Start a new WhatsApp session. Returns the QR code as base64.
   */
  async startSession(sessionName: string, webhookBaseUrl?: string): Promise<StartSessionResponse> {
    let sessionId = "";
    let status = "";
    const webhookUrl =
      webhookBaseUrl ||
      process.env.NEXTAUTH_URL ||
      process.env.AUTH_URL ||
      "https://agentesia.diabolicalservices.tech";
    
    try {
      const created = await this.request<SessionRecord>("/api/sessions", {
        method: "POST",
        body: JSON.stringify({ name: sessionName }),
      });

      sessionId = created.id || "";
      status = created.status || "created";
      if (!sessionId) {
        throw new Error("[OpenWA] Session id missing in create response");
      }
    } catch (e) {
      console.error("[OpenWA] Failed to get/create session:", e);
      throw e;
    }

    try {
      await this.request(`/api/sessions/${sessionId}/start`, { method: "POST" });
    } catch (error) {
      console.error("[OpenWA] Failed to start engine:", error);
      throw error;
    }

    try {
      await this.request(`/api/sessions/${sessionId}/webhooks`, {
        method: "POST",
        body: JSON.stringify({
          url: `${webhookUrl}/api/v1/webhooks/openwa/incoming`,
          events: ["message.received", "session.status"],
        }),
      });
    } catch (error) {
      console.warn("[OpenWA] Webhook registration failed:", error);
    }

    const qrCodeBase64 = await this.getQrCode(sessionId);

    try {
      const current = await this.request<SessionRecord>(`/api/sessions/${sessionId}`);
      if (current?.status) status = current.status;
    } catch {}

    if (!qrCodeBase64 && status !== "ready" && status !== "WORKING") {
      throw new Error(`[OpenWA] Session ${sessionName} did not start or generate a QR code`);
    }

    return {
      qrCodeBase64,
      sessionId,
      sessionName,
      status,
    };
  }

  async getQrCode(sessionId: string): Promise<string | undefined> {
    const attempts = 6;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        const qrRes = await this.request<SessionListRecord>(`/api/sessions/${sessionId}/qr`, {
          headers: { Accept: "application/json" },
        });

        const qrCodeBase64 =
          qrRes?.qrCode ||
          qrRes?.qrCodeBase64 ||
          qrRes?.qr ||
          qrRes?.data?.qrCode ||
          qrRes?.data?.qrCodeBase64 ||
          qrRes?.data?.qr;

        if (qrCodeBase64) {
          return qrCodeBase64;
        }
      } catch {}

      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    console.log(`[OpenWA] No QR code available for ${sessionId} after ${attempts} attempts`);
    return undefined;
  }

  /**
   * Send a text message to a WhatsApp number.
   * @param to - Phone number in format "5215555555555@c.us"
   */
  async sendText(sessionId: string, to: string, content: string): Promise<void> {
    const chatId = to.includes("@c.us") || to.includes("@g.us") ? to : `${to}@c.us`;

    await this.request(`/api/sessions/${sessionId}/messages/send-text`, {
      method: "POST",
      body: JSON.stringify({
        chatId,
        text: content,
      }),
    });

    console.log(`[OpenWA] Message sent to ${chatId} via session ${sessionId}`);
  }

  /**
   * Check the status of a session.
   */
  async getSessionStatus(sessionId: string): Promise<{ status: string }> {
    const existing = await this.request<SessionRecord>(`/api/sessions/${sessionId}`);
    return { status: existing?.status ?? "unknown" };
  }

  /**
   * Close and remove a session.
   */
  async closeSession(sessionId: string): Promise<void> {
    await this.request(`/api/sessions/${sessionId}/stop`, {
      method: "POST",
    });
    console.log(`[OpenWA] Session ${sessionId} stopped`);
  }
}

// Singleton for the default client
let defaultClient: OpenWAClient | null = null;

export function getOpenWAClient(): OpenWAClient {
  if (!defaultClient) {
    defaultClient = new OpenWAClient();
  }
  return defaultClient;
}
