"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Agent {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  whatsappSessions?: Array<{ id: string; status: string; openwaSessionName: string }>;
}

interface WhatsappSession {
  id: string;
  sessionName: string;
  status: string;
  agentId: string | null;
  agentName: string | null;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sessions, setSessions] = useState<WhatsappSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    whatsappSessionId: "",
  });
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      fetch("/api/v1/agents").then((res) => res.json()),
      fetch("/api/v1/whatsapp/status").then((res) => res.json()),
    ])
      .then(([agentsData, sessionsData]) => {
        if (agentsData.agents) {
          setAgents(agentsData.agents);
        }
        setSessions(sessionsData.sessions || []);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(event?: React.FormEvent) {
    event?.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/v1/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name || `Nuevo Agente ${agents.length + 1}`,
          description: createForm.description || "Configura este agente para atender a tus clientes",
          whatsappSessionId: createForm.whatsappSessionId || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.agent) {
        router.push(`/dashboard/agents/${data.agent.id}`);
      }
    } catch (e) {
      console.error(e);
      setCreating(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h2>🤖 Agentes de IA</h2>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "2px" }}>
            Crea y configura múltiples agentes de Inteligencia Artificial
          </p>
        </div>
      </div>

      <div className="page-body">
        <form
          onSubmit={handleCreate}
          className="glass-card"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "var(--space-md)",
            alignItems: "end",
            marginBottom: "var(--space-xl)",
          }}
        >
          <div className="input-group">
            <label>Nombre del agente</label>
            <input
              className="input"
              value={createForm.name}
              onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })}
              placeholder={`Nuevo Agente ${agents.length + 1}`}
            />
          </div>

          <div className="input-group">
            <label>Descripción</label>
            <input
              className="input"
              value={createForm.description}
              onChange={(event) => setCreateForm({ ...createForm, description: event.target.value })}
              placeholder="Ej: Atiende ventas de WhatsApp"
            />
          </div>

          <div className="input-group">
            <label>Sesión WhatsApp asociada</label>
            <select
              className="input"
              value={createForm.whatsappSessionId}
              onChange={(event) => setCreateForm({ ...createForm, whatsappSessionId: event.target.value })}
            >
              <option value="">Asignar después</option>
              {sessions.map((waSession) => (
                <option key={waSession.id} value={waSession.id}>
                  {waSession.agentName ? `${waSession.sessionName} · ${waSession.agentName}` : waSession.sessionName}
                </option>
              ))}
            </select>
          </div>

          <button className="btn btn-primary" type="submit" disabled={creating}>
            {creating ? <span className="spinner" /> : "➕ Crear Agente"}
          </button>
        </form>

        {loading ? (
          <div className="empty-state">
            <span className="spinner" style={{ width: 40, height: 40, borderWidth: 4 }} />
          </div>
        ) : agents.length === 0 ? (
          <div className="glass-card" style={{ textAlign: "center", padding: "var(--space-2xl)", maxWidth: 560, margin: "0 auto" }}>
            <div style={{ fontSize: "4rem", marginBottom: "var(--space-md)" }}>🧠</div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "var(--space-sm)" }}>
              No tienes agentes creados
            </h3>
            <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-lg)" }}>
              Crea tu primer agente para automatizar la atención a tus clientes por WhatsApp o cualquier otro canal.
            </p>
            <button
              className="btn btn-primary btn-lg"
              type="button"
              onClick={() => void handleCreate()}
              disabled={creating}
            >
              {creating ? "Creando..." : "Crear mi primer Agente"}
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "var(--space-lg)" }}>
            {agents.map((agent) => (
              <Link href={`/dashboard/agents/${agent.id}`} key={agent.id} style={{ textDecoration: "none", color: "inherit" }}>
                <div className="glass-card" style={{ display: "flex", flexDirection: "column", height: "100%", cursor: "pointer", transition: "transform 0.2s ease, box-shadow 0.2s ease" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "var(--shadow-lg)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "var(--shadow-md)";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-md)" }}>
                    <div className={`badge ${agent.isActive ? "badge-success" : "badge-error"}`}>
                      {agent.isActive ? "Activo" : "Inactivo"}
                    </div>
                  </div>

                  <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "var(--space-xs)" }}>
                    {agent.name}
                  </h3>
                  
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", flex: 1, marginBottom: "var(--space-lg)" }}>
                    {agent.description || "Sin descripción"}
                  </p>

                  <p style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                    {agent.whatsappSessions?.length
                      ? `${agent.whatsappSessions.length} sesión(es) de WhatsApp`
                      : "Sin sesiones asociadas"}
                  </p>

                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
