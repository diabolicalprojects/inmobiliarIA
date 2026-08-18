"use client";

import { useState, useEffect, useCallback } from "react";

interface WASession {
  sessionId: string;
  sessionName: string;
  status: string;
  qrCode: string | null;
  connectedAt: string | null;
}

export default function WhatsAppPage() {
  const [sessions, setSessions] = useState<WASession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/whatsapp/status");
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch {
      setError("Error al cargar las sesiones");
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void checkStatus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [checkStatus]);

  // Poll every 5 seconds if ANY session is PENDING
  useEffect(() => {
    const hasPending = sessions.some(s => s.status === "PENDING");
    if (!hasPending) return;
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [sessions, checkStatus]);

  async function handleConnect() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/whatsapp/connect", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al conectar");
        return;
      }
      
      await checkStatus(); // Reload the sessions list
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect(sessionId: string) {
    setLoading(true);
    try {
      await fetch("/api/v1/whatsapp/disconnect", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      });
      await checkStatus();
    } catch {
      setError("Error al desconectar");
    } finally {
      setLoading(false);
    }
  }

  if (isInitializing) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <span className="spinner" style={{ width: 40, height: 40, borderWidth: 4 }}></span>
      </div>
    );
  }

  const activeSessions = sessions.filter(s => s.status !== "DISCONNECTED");

  return (
    <>
      <div className="page-header">
        <h2>WhatsApp ({activeSessions.length})</h2>
        <button
          className="btn btn-whatsapp"
          onClick={handleConnect}
          disabled={loading || activeSessions.some(s => s.status === "PENDING")}
          style={{ padding: "8px 16px", borderRadius: "100px", fontWeight: 600 }}
        >
          {loading ? <span className="spinner" /> : "➕ Añadir Número"}
        </button>
      </div>

      <div className="page-body">
        {error && <div className="auth-error" style={{ marginBottom: "var(--space-md)" }}>{error}</div>}

        {activeSessions.length === 0 ? (
          <div className="glass-card" style={{ textAlign: "center", padding: "var(--space-2xl)", maxWidth: 560, margin: "0 auto" }}>
            <div style={{ fontSize: "4rem", marginBottom: "var(--space-md)" }}>📱</div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "var(--space-sm)" }}>
              Sin números vinculados
            </h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-lg)" }}>
              Conecta uno o más números de WhatsApp para que tus agentes de IA atiendan a los clientes automáticamente.
            </p>
            <button
              className="btn btn-whatsapp btn-lg"
              onClick={handleConnect}
              disabled={loading}
            >
              {loading ? <><span className="spinner" /> Preparando...</> : "Vincular WhatsApp"}
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "var(--space-lg)" }}>
            {activeSessions.map((session) => (
              <div key={session.sessionId} className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
                  <div className={`badge ${session.status === "CONNECTED" ? "badge-success" : "badge-warning"}`}>
                    {session.status === "CONNECTED"
                      ? "Conectado"
                      : session.qrCode
                        ? "Esperando escaneo"
                        : "Generando QR..."}
                  </div>
                  <button 
                    onClick={() => handleDisconnect(session.sessionId)}
                    className="btn" 
                    style={{ background: 'transparent', color: 'var(--danger)', padding: "4px 8px" }}
                    disabled={loading}
                    title="Desconectar"
                  >
                    🗑️
                  </button>
                </div>

                {session.status === "PENDING" && session.qrCode ? (
                  <div style={{ textAlign: "center", flex: 1 }}>
                    <div className="qr-container" style={{ margin: "0 auto", padding: "var(--space-sm)", background: "white", borderRadius: 12, display: "inline-block", width: "100%", maxWidth: 220 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={session.qrCode.startsWith("data:") ? session.qrCode : `data:image/png;base64,${session.qrCode}`}
                        alt="QR Code"
                        style={{ width: "100%", height: "auto", display: "block" }}
                      />
                    </div>
                    <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "var(--space-md)" }} className="animate-pulse">
                      Abre WhatsApp → Dispositivos vinculados
                    </p>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", flex: 1, padding: "var(--space-lg) 0" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "var(--space-sm)" }}>✅</div>
                    <h4 style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                      {session.status === "CONNECTED" ? "Agente Activo" : "Esperando QR"}
                    </h4>
                    <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "var(--space-sm)" }}>
                      {session.status === "CONNECTED"
                        ? "Respondiendo mensajes automáticamente."
                        : "La sesión está creada, pero aún falta mostrar el código QR."}
                    </p>
                    <div style={{ marginTop: "var(--space-md)", padding: "var(--space-xs)", background: "var(--bg-elevated)", borderRadius: 8 }}>
                      <code style={{ fontSize: "0.75rem", color: "var(--text-muted)", wordBreak: "break-all" }}>
                        {session.sessionName}
                      </code>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
