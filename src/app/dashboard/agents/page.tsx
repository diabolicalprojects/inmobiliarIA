"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Agent {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/v1/agents")
      .then((res) => res.json())
      .then((data) => {
        if (data.agents) {
          setAgents(data.agents);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/v1/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Nuevo Agente " + (agents.length + 1),
          description: "Configura este agente para atender a tus clientes",
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
        <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
          {creating ? <span className="spinner" /> : "➕ Crear Agente"}
        </button>
      </div>

      <div className="page-body">
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
            <button className="btn btn-primary btn-lg" onClick={handleCreate} disabled={creating}>
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


                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
