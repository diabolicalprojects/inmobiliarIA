"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type WhatsappSessionOption = {
  id: string;
  label: string;
};

type SendMessageFormProps = {
  leadId: string;
  defaultSessionId?: string | null;
  sessions: WhatsappSessionOption[];
};

export default function SendMessageForm({
  leadId,
  defaultSessionId,
  sessions,
}: SendMessageFormProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState(defaultSessionId || sessions[0]?.id || "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const message = content.trim();
    if (!message || sending) return;

    setSending(true);
    setError("");

    try {
      const res = await fetch(`/api/v1/leads/${leadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: message,
          whatsappSessionId: selectedSessionId || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "No se pudo enviar el mensaje");
        return;
      }

      setContent("");
      router.refresh();
    } catch {
      setError("Error de conexión al enviar");
    } finally {
      setSending(false);
    }
  }

  const disabled = sending || sessions.length === 0;

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        borderTop: "1px solid var(--border-default)",
        background: "var(--bg-secondary)",
        padding: "var(--space-md)",
      }}
    >
      {sessions.length > 1 && (
        <select
          className="input"
          value={selectedSessionId}
          onChange={(event) => setSelectedSessionId(event.target.value)}
          style={{ marginBottom: "var(--space-sm)" }}
        >
          {sessions.map((session) => (
            <option key={session.id} value={session.id}>
              {session.label}
            </option>
          ))}
        </select>
      )}

      <div style={{ display: "flex", gap: "var(--space-sm)" }}>
        <textarea
          className="input"
          rows={2}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={
            sessions.length > 0
              ? "Escribe una respuesta por WhatsApp..."
              : "Conecta una sesión de WhatsApp para responder"
          }
          disabled={disabled}
          style={{ resize: "none" }}
        />
        <button type="submit" className="btn btn-primary" disabled={disabled || !content.trim()}>
          {sending ? <span className="spinner" /> : "Enviar"}
        </button>
      </div>

      {error && (
        <p style={{ color: "var(--danger)", fontSize: "0.8125rem", marginTop: "var(--space-sm)" }}>
          {error}
        </p>
      )}
    </form>
  );
}
