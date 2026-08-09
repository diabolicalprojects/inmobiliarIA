"use client";

import { useState, useEffect } from "react";

interface Agency {
  id: string;
  name: string;
  industryType: string;
  aiSystemPrompt: string | null;
  llmProvider: string;
  llmApiKey: string | null;
  llmModel: string | null;
}

const LLM_MODELS: Record<string, string[]> = {
  OPENAI: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano"],
  ANTHROPIC: ["claude-sonnet-4-20250514", "claude-haiku-4-20250414", "claude-opus-4-20250514"],
  GOOGLE: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"],
};

export default function SettingsPage() {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [form, setForm] = useState({
    aiSystemPrompt: "",
    llmProvider: "OPENAI",
    llmApiKey: "",
    llmModel: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/agencies/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.agency) {
          setAgency(data.agency);
          setForm({
            aiSystemPrompt: data.agency.aiSystemPrompt || "",
            llmProvider: data.agency.llmProvider || "OPENAI",
            llmApiKey: data.agency.llmApiKey || "",
            llmModel: data.agency.llmModel || "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/v1/agencies/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setMessage("✅ Configuración guardada exitosamente");
      } else {
        setMessage("❌ Error al guardar");
      }
    } catch {
      setMessage("❌ Error de conexión");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  }

  if (loading) {
    return (
      <>
        <div className="page-header"><h2>Configuración</h2></div>
        <div className="page-body">
          <div className="empty-state"><div className="spinner" style={{ width: 40, height: 40 }} /></div>
        </div>
      </>
    );
  }

  const availableModels = LLM_MODELS[form.llmProvider] || [];

  return (
    <>
      <div className="page-header">
        <h2>Configuración</h2>
        {agency && (
          <span className={`badge ${agency.industryType === "REAL_ESTATE" ? "badge-info" : "badge-warning"}`}>
            {agency.industryType === "REAL_ESTATE" ? "🏠 Inmobiliaria" : "✈️ Viajes"}
          </span>
        )}
      </div>

      <div className="page-body">
        <form onSubmit={handleSave} style={{ maxWidth: 720 }}>
          {/* AI Configuration */}
          <div className="glass-card" style={{ padding: "var(--space-xl)", marginBottom: "var(--space-lg)" }}>
            <h3 style={{ fontSize: "1.0625rem", fontWeight: 700, marginBottom: "var(--space-lg)", display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
              🧠 Configuración de IA
            </h3>

            <div className="input-group" style={{ marginBottom: "var(--space-md)" }}>
              <label>Proveedor de LLM</label>
              <select
                className="input select"
                value={form.llmProvider}
                onChange={(e) => {
                  const provider = e.target.value;
                  setForm({
                    ...form,
                    llmProvider: provider,
                    llmModel: LLM_MODELS[provider]?.[0] || "",
                  });
                }}
              >
                <option value="OPENAI">🟢 OpenAI (GPT)</option>
                <option value="ANTHROPIC">🟠 Anthropic (Claude)</option>
                <option value="GOOGLE">🔵 Google (Gemini)</option>
              </select>
            </div>

            <div className="input-group" style={{ marginBottom: "var(--space-md)" }}>
              <label>Modelo</label>
              <select
                className="input select"
                value={form.llmModel}
                onChange={(e) => setForm({ ...form, llmModel: e.target.value })}
              >
                {availableModels.map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>

            <div className="input-group" style={{ marginBottom: "var(--space-md)" }}>
              <label>API Key del proveedor</label>
              <input
                type="password"
                className="input"
                placeholder={form.llmProvider === "OPENAI" ? "sk-..." : form.llmProvider === "ANTHROPIC" ? "sk-ant-..." : "AI..."}
                value={form.llmApiKey}
                onChange={(e) => setForm({ ...form, llmApiKey: e.target.value })}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Tu API key se almacena de forma segura y solo se usa para tu agencia.
              </span>
            </div>
          </div>

          {/* System Prompt */}
          <div className="glass-card" style={{ padding: "var(--space-xl)", marginBottom: "var(--space-lg)" }}>
            <h3 style={{ fontSize: "1.0625rem", fontWeight: 700, marginBottom: "var(--space-lg)", display: "flex", alignItems: "center", gap: "var(--space-sm)" }}>
              💬 Prompt del Sistema
            </h3>

            <div className="input-group">
              <label>Instrucciones para tu agente de IA</label>
              <textarea
                className="input"
                value={form.aiSystemPrompt}
                onChange={(e) => setForm({ ...form, aiSystemPrompt: e.target.value })}
                rows={12}
                placeholder="Define el tono, personalidad, objetivos y reglas de tu agente..."
              />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                Estas instrucciones definen cómo se comporta tu agente de IA al responder mensajes de WhatsApp.
              </span>
            </div>
          </div>

          {/* Save */}
          {message && (
            <div style={{ marginBottom: "var(--space-md)", fontSize: "0.875rem", fontWeight: 500 }}>
              {message}
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
            {saving ? <><span className="spinner" /> Guardando...</> : "Guardar Configuración"}
          </button>
        </form>
      </div>
    </>
  );
}
