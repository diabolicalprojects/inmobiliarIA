/**
 * OpenWA HTTP Client
 *
 * All communication with the OpenWA microservice goes through this class.
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
  sessionId: string;
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
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    console.log(`[OpenWA] ${options.method || "GET"} ${url}`);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          api_key: this.apiKey,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(
          `[OpenWA] Error ${response.status}: ${errorBody}`
        );
        throw new Error(
          `OpenWA API error ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      return data as T;
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
  async startSession(sessionId: string): Promise<StartSessionResponse> {
    return this.request<StartSessionResponse>("/session/start", {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    });
  }

  /**
   * Send a text message to a WhatsApp number.
   * @param to - Phone number in format "5215555555555@c.us"
   */
  async sendText(sessionId: string, to: string, content: string): Promise<void> {
    const payload: SendTextPayload = {
      sessionId,
      to: to.includes("@c.us") ? to : `${to}@c.us`,
      content,
    };

    await this.request("/chat/sendText", {
      method: "POST",
      body: JSON.stringify({
        sessionId: payload.sessionId,
        args: {
          to: payload.to,
          content: payload.content,
        },
      }),
    });

    console.log(`[OpenWA] Message sent to ${to} via session ${sessionId}`);
  }

  /**
   * Check the status of a session.
   */
  async getSessionStatus(
    sessionId: string
  ): Promise<{ status: string }> {
    return this.request<{ status: string }>(
      `/session/status?sessionId=${encodeURIComponent(sessionId)}`
    );
  }

  /**
   * Close and remove a session.
   */
  async closeSession(sessionId: string): Promise<void> {
    await this.request("/session/close", {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    });
    console.log(`[OpenWA] Session ${sessionId} closed`);
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
