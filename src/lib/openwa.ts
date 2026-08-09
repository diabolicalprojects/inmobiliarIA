/**
 * OpenWA / WAHA HTTP Client
 *
 * All communication with the WhatsApp microservice (WAHA) goes through this class.
 * It handles session management, message sending, and status polling.
 */

interface OpenWAConfig {
  baseUrl: string;
  apiKey: string;
}

interface StartSessionResponse {
  qrCodeBase64?: string;
  sessionId: string;
  status: string;
}

interface SendTextPayload {
  sessionId: string; // Used as session name in WAHA
  to: string;
  content: string;
}

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
          "Authorization": `Bearer ${this.apiKey}`,
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
      return JSON.parse(text) as T;
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
  async startSession(sessionName: string): Promise<StartSessionResponse> {
    // 1. Get or create session
    let sessionId = "";
    let status = "";
    try {
      const sessions = await this.request<any[]>("/api/sessions");
      const existing = sessions.find((s: any) => s.name === sessionName);
      if (existing) {
        sessionId = existing.id;
        status = existing.status;
      } else {
        const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || "https://agentesia.diabolicalservices.tech";
        const created = await this.request<any>("/api/sessions", {
          method: "POST",
          body: JSON.stringify({ 
            name: sessionName,
            config: {
              webhooks: [
                {
                  url: `${baseUrl}/api/v1/webhooks/openwa/incoming`,
                  events: ["message", "message.any"]
                }
              ]
            }
          }),
        });
        sessionId = created.id;
        status = created.status;
      }
    } catch (e) {
      console.error("[OpenWA] Failed to get/create session:", e);
      throw e;
    }

    // 2. Start the engine
    try {
      await this.request(`/api/sessions/${sessionId}/start`, { method: "POST" });
    } catch (e) {
      console.error("[OpenWA] Failed to start engine:", e);
    }
    
    // Give WAHA a moment to initialize the browser and generate the QR code
    await new Promise(r => setTimeout(r, 2000));

    // 3. Attempt to fetch QR code
    let qrCodeBase64: string | undefined;
    try {
      const qrRes = await this.request<any>(`/api/sessions/${sessionId}/qr`, {
        headers: { Accept: "application/json" }
      });
      if (qrRes && qrRes.qrCode) {
        qrCodeBase64 = qrRes.qrCode;
      }
    } catch (e) {
      console.log(`[OpenWA] No QR code available right now for ${sessionId}`);
    }

    // Refresh status
    try {
      const sessions = await this.request<any[]>("/api/sessions");
      const current = sessions.find((s: any) => s.id === sessionId);
      if (current) status = current.status;
    } catch (e) {}

    return {
      qrCodeBase64,
      sessionId,
      status,
    };
  }

  /**
   * Send a text message to a WhatsApp number.
   * @param to - Phone number in format "5215555555555@c.us"
   */
  async sendText(sessionName: string, to: string, content: string): Promise<void> {
    const chatId = to.includes("@c.us") || to.includes("@g.us") ? to : `${to}@c.us`;

    await this.request("/api/sendText", {
      method: "POST",
      body: JSON.stringify({
        session: sessionName,
        chatId: chatId,
        text: content,
      }),
    });

    console.log(`[OpenWA] Message sent to ${chatId} via session ${sessionName}`);
  }

  /**
   * Check the status of a session.
   */
  async getSessionStatus(
    sessionName: string
  ): Promise<{ status: string }> {
    const sessions = await this.request<any[]>("/api/sessions");
    const existing = sessions.find((s: any) => s.name === sessionName);
    return { status: existing ? existing.status : "unknown" };
  }

  /**
   * Close and remove a session.
   */
  async closeSession(sessionName: string): Promise<void> {
    const sessions = await this.request<any[]>("/api/sessions");
    const existing = sessions.find((s: any) => s.name === sessionName);
    if (!existing) return;

    await this.request(`/api/sessions/${existing.id}/stop`, {
      method: "POST",
    });
    console.log(`[OpenWA] Session ${sessionName} stopped`);
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
