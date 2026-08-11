"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Agent {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  llmProvider: string;
  llmApiKey: string;
  llmModel: string;
  isActive: boolean;
}

export default function AgentConfigPage({ params }: { params: { agentId: string } }) {
  const router = useRouter();
  const [form, setForm] = useState<Agent>({
    id: "",
    name: "",
    description: "",
    systemPrompt: "",
    llmProvider: "OPENAI",
    llmApiKey: "",
    llmModel: "",
    isActive: true,
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState(false);
  
  // Model loading
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  useEffect(() => {
    fetch(`/api/v1/agents/${params.agentId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.agent) {
          setForm({
            id: data.agent.id,
            name: data.agent.name || "",
            description: data.agent.description || "",
            systemPrompt: data.agent.systemPrompt || "",
            llmProvider: data.agent.llmProvider || "OPENAI",
            llmApiKey: data.agent.llmApiKey || "",
            llmModel: data.agent.llmModel || "",
            isActive: data.agent.isActive,
          });
          if (data.agent.llmModel) {
            setModels([data.agent.llmModel]); // Initialize with the saved model at least
          }
        }
      })
      .finally(() => setLoading(false));
  }, [params.agentId]);

  async function handleLoadModels() {
    if (!form.llmApiKey) {
      setMessage("⚠️ Ingresa una API key primero");
      setTimeout(() => setMessage(""), 3000);
      return;
    }
    
    setLoadingModels(true);
    try {
      const res = await fetch(`/api/v1/agents/models?provider=${form.llmProvider}&apiKey=${form.llmApiKey}`);
      const data = await res.json();
      
      if (res.ok && data.models) {
        setModels(data.models);
        setMessage("✅ Modelos cargados");
        if (data.models.length > 0 && !data.models.includes(form.llmModel)) {
          setForm({ ...form, llmModel: data.models[0] });
        }
      } else {
        setMessage(`❌ ${data.error || "Error al cargar modelos"}`);
      }
    } catch (e) {
      setMessage("❌ Error de conexión al cargar modelos");
    } finally {
      setLoadingModels(false);
      setTimeout(() => { if(message.startsWith("✅") || message.startsWith("❌") || message.startsWith("⚠️")) setMessage("") }, 3000);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch(`/api/v1/agents/${params.agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setMessage("✅ Agente guardado exitosamente");
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

  async function handleDelete() {
    if (!confirm("¿Estás seguro de eliminar este agente? Esta acción no se puede deshacer.")) return;
    
    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/agents/${params.agentId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/dashboard/agents");
      } else {
        setMessage("❌ Error al eliminar");
        setDeleting(false);
      }
    } catch {
      setMessage("❌ Error de conexión");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="page-body">
        <div className="empty-state"><span className="spinner" style={{ width: 40, height: 40 }} /></div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <Link href="/dashboard/agents" style={{ fontSize: "0.875rem", color: "var(--text-secondary)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
            ← Volver a Agentes
          </Link>
          <h2>{form.name || "Configurar Agente"}</h2>
        </div>
        
        <div style={{ display: "flex", gap: "var(--space-sm)", alignItems: "center" }}>
          <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginRight: "var(--space-sm)" }}>Estado:</span>
          <button 
            type="button"
            className={`btn ${form.isActive ? "btn-success" : ""}`}
            style={{ padding: "6px 12px", background: form.isActive ? "" : "var(--bg-tertiary)", color: form.isActive ? "" : "var(--text-primary)", border: form.isActive ? "" : "1px solid var(--border-default)" }}
            onClick={() => setForm({ ...form, isActive: !form.isActive })}
          >
            {form.isActive ? "🟢 Activo" : "🔴 Inactivo"}
          </button>
        </div>
      </div>

      <div className="page-body">
        <form onSubmit={handleSave} style={{ display: "flex", gap: "var(--space-xl)", alignItems: "flex-start", flexWrap: "wrap" }}>
          
          <div style={{ flex: "1 1 500px", display: "flex", flexDirection: "column", gap: "var(--space-lg)" }}>
            
            {/* Identidad */}
            <div className="glass-card" style={{ padding: "var(--space-xl)" }}>
              <h3 style={{ fontSize: "1.0625rem", fontWeight: 700, marginBottom: "var(--space-lg)" }}>
                🎭 Identidad del Agente
              </h3>
              
              <div className="input-group" style={{ marginBottom: "var(--space-md)" }}>
                <label>Nombre del Agente</label>
                <input
                  type="text"
                  className="input"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Asistente de Ventas WhatsApp"
                />
              </div>

              <div className="input-group">
                <label>Descripción breve</label>
                <input
                  type="text"
                  className="input"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ej: Se encarga de atender a nuevos clientes y perfilar..."
                />
              </div>
            </div>

            {/* Configuración LLM */}
            <div className="glass-card" style={{ padding: "var(--space-xl)" }}>
              <h3 style={{ fontSize: "1.0625rem", fontWeight: 700, marginBottom: "var(--space-lg)" }}>
                🧠 Configuración de Inteligencia Artificial
              </h3>
              
              <div className="input-group" style={{ marginBottom: "var(--space-md)" }}>
                <label>Proveedor de IA</label>
                <select
                  className="input select"
                  value={form.llmProvider}
                  onChange={(e) => {
                    setForm({ ...form, llmProvider: e.target.value, llmModel: "", llmApiKey: "" });
                    setModels([]);
                  }}
                >
                  <option value="OPENAI">🟢 OpenAI</option>
                  <option value="ANTHROPIC">🟠 Anthropic (Claude)</option>
                  <option value="GOOGLE">🔵 Google (Gemini)</option>
                </select>
              </div>

              <div className="input-group" style={{ marginBottom: "var(--space-md)" }}>
                <label>API Key del Proveedor</label>
                <div style={{ display: "flex", gap: "var(--space-sm)" }}>
                  <input
                    type="password"
                    className="input"
                    value={form.llmApiKey}
                    onChange={(e) => setForm({ ...form, llmApiKey: e.target.value })}
                    placeholder={form.llmProvider === "OPENAI" ? "sk-..." : "API Key..."}
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="btn" onClick={handleLoadModels} disabled={loadingModels} style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--border-default)" }}>
                    {loadingModels ? <span className="spinner"/> : "Cargar Modelos"}
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label>Modelo de IA a utilizar</label>
                <select
                  className="input select"
                  value={form.llmModel}
                  onChange={(e) => setForm({ ...form, llmModel: e.target.value })}
                  required
                >
                  <option value="" disabled>Selecciona un modelo...</option>
                  {models.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                {models.length === 0 && (
                  <span style={{ fontSize: "0.75rem", color: "var(--text-warning)", marginTop: "4px", display: "block" }}>
                    Haz clic en "Cargar Modelos" para ver las opciones disponibles para tu API Key.
                  </span>
                )}
              </div>
            </div>

            {/* Prompt */}
            <div className="glass-card" style={{ padding: "var(--space-xl)" }}>
              <h3 style={{ fontSize: "1.0625rem", fontWeight: 700, marginBottom: "var(--space-lg)" }}>
                💬 Comportamiento (Prompt)
              </h3>
              
              <div className="input-group">
                <label>Instrucciones base del sistema</label>
                <textarea
                  className="input"
                  rows={14}
                  value={form.systemPrompt}
                  onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                  placeholder="Ej: Eres un asistente experto en ventas inmobiliarias..."
                />
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "8px", display: "block" }}>
                  Aquí defines la personalidad, reglas y cómo debe interactuar el agente con el cliente.
                </span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-lg) 0" }}>
              <button type="button" className="btn" style={{ color: "var(--danger)", background: "transparent" }} onClick={handleDelete} disabled={deleting}>
                {deleting ? "Eliminando..." : "Eliminar Agente"}
              </button>
              
              <div style={{ display: "flex", gap: "var(--space-md)", alignItems: "center" }}>
                {message && <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{message}</span>}
                <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
                  {saving ? <><span className="spinner" /> Guardando</> : "Guardar Agente"}
                </button>
              </div>
            </div>
            
          </div>
          
          <div style={{ flex: "1 1 350px", position: "sticky", top: "var(--space-xl)" }}>
            <div className="glass-card" style={{ padding: "0", overflow: "hidden", display: "flex", flexDirection: "column", height: "600px" }}>
              <div style={{ padding: "var(--space-md) var(--space-lg)", borderBottom: "1px solid var(--border-default)", background: "var(--bg-secondary)" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>🧪 Playground (Pruebas)</h3>
              </div>
              <div style={{ flex: 1, padding: "var(--space-lg)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", color: "var(--text-muted)" }}>
                <div style={{ fontSize: "3rem", marginBottom: "var(--space-md)" }}>💬</div>
                <p>Guarda la configuración de tu agente y el Playground estará disponible en futuras actualizaciones.</p>
              </div>
              <div style={{ padding: "var(--space-md)", borderTop: "1px solid var(--border-default)", display: "flex", gap: "var(--space-sm)" }}>
                <input type="text" className="input" placeholder="Escribe un mensaje..." disabled />
                <button type="button" className="btn btn-primary" disabled>Enviar</button>
              </div>
            </div>
          </div>
          
        </form>
      </div>
    </>
  );
}
