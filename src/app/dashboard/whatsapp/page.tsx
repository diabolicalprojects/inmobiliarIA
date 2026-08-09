"use client";

import { useState, useEffect, useCallback } from "react";

export default function WhatsAppPage() {
  const [status, setStatus] = useState<string>("loading");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/whatsapp/status");
      const data = await res.json();
      setStatus(data.status || "NO_SESSION");
      setQrCode(data.qrCode || null);
      setSessionName(data.sessionName || null);
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Poll every 5 seconds while pending
  useEffect(() => {
    if (status !== "PENDING") return;
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [status, checkStatus]);

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

      setQrCode(data.qrCode);
      setSessionName(data.sessionName);
      setStatus("PENDING");
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    setLoading(true);
    try {
      await fetch("/api/v1/whatsapp/disconnect", { method: "POST" });
      setStatus("DISCONNECTED");
      setQrCode(null);
    } catch {
      setError("Error al desconectar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <h2>WhatsApp</h2>
        <div className={`badge ${status === "CONNECTED" ? "badge-success" : status === "PENDING" ? "badge-warning" : "badge-error"}`}>
          {status === "CONNECTED" ? "Conectado" : status === "PENDING" ? "Esperando QR..." : status === "NO_SESSION" ? "Sin sesión" : status === "loading" ? "Cargando..." : "Desconectado"}
        </div>
      </div>

      <div className="page-body">
        <div
          className="glass-card"
          style={{
            maxWidth: 560,
            margin: "0 auto",
            padding: "var(--space-2xl)",
            textAlign: "center",
          }}
        >
          {status === "CONNECTED" ? (
            <>
              <div style={{ fontSize: "4rem", marginBottom: "var(--space-md)" }}>✅</div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "var(--space-sm)" }}>
                WhatsApp Conectado
              </h3>
              <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-lg)" }}>
                Tu agente de IA está activo y respondiendo mensajes automáticamente.
                {sessionName && (
                  <span style={{ display: "block", marginTop: "var(--space-sm)", fontSize: "0.8125rem", fontFamily: "monospace", color: "var(--text-muted)" }}>
                    Sesión: {sessionName}
                  </span>
                )}
              </p>
              <button
                className="btn btn-danger"
                onClick={handleDisconnect}
                disabled={loading}
              >
                {loading ? <><span className="spinner" /> Desconectando...</> : "Desconectar WhatsApp"}
              </button>
            </>
          ) : status === "PENDING" && qrCode ? (
            <>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "var(--space-sm)" }}>
                Escanea el Código QR
              </h3>
              <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-lg)" }}>
                Abre WhatsApp en tu teléfono → Ajustes → Dispositivos vinculados → Vincular dispositivo
              </p>
              <div className="qr-container">
                <div className="qr-code">
                  <img
                    src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                    alt="Código QR de WhatsApp"
                    style={{ width: 280, height: 280 }}
                  />
                </div>
                <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }} className="animate-pulse">
                  Esperando escaneo del QR...
                </p>
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: "4rem", marginBottom: "var(--space-md)" }}>📱</div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "var(--space-sm)" }}>
                Vincula tu WhatsApp
              </h3>
              <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-lg)" }}>
                Conecta un número de WhatsApp para activar tu agente de IA.
                Los mensajes entrantes serán respondidos automáticamente.
              </p>

              {error && <div className="auth-error" style={{ marginBottom: "var(--space-md)" }}>{error}</div>}

              <button
                className="btn btn-whatsapp btn-lg"
                onClick={handleConnect}
                disabled={loading}
              >
                {loading ? <><span className="spinner" /> Conectando...</> : "📱 Vincular WhatsApp"}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
