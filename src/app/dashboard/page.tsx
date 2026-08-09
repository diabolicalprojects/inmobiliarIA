import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.agencyId) redirect("/login");

  const agencyId = session.user.agencyId;

  const [agency, leadsCount, messagesCount, activeSession, recentLeads] =
    await Promise.all([
      prisma.agency.findUnique({ where: { id: agencyId } }),
      prisma.lead.count({ where: { agencyId } }),
      prisma.messageHistory.count({
        where: {
          lead: { agencyId },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.whatsappSession.findFirst({
        where: { agencyId, status: "CONNECTED" },
      }),
      prisma.lead.findMany({
        where: { agencyId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: {
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
          _count: { select: { messages: true } },
        },
      }),
    ]);

  const qualifiedLeads = await prisma.lead.count({
    where: { agencyId, isQualified: true },
  });

  return (
    <>
      <div className="page-header">
        <div>
          <h2>¡Hola, {session.user.name}! 👋</h2>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginTop: "2px" }}>
            {agency?.name} · {agency?.industryType === "REAL_ESTATE" ? "🏠 Inmobiliaria" : "✈️ Viajes"}
          </p>
        </div>
        <div className={`badge ${activeSession ? "badge-success" : "badge-error"}`}>
          {activeSession ? "WhatsApp Conectado" : "WhatsApp Desconectado"}
        </div>
      </div>

      <div className="page-body">
        <div className="stats-grid" style={{ marginBottom: "var(--space-xl)" }}>
          <div className="stat-card">
            <span className="stat-label">Total Leads</span>
            <span className="stat-value">{leadsCount}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Mensajes (24h)</span>
            <span className="stat-value">{messagesCount}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Leads Calificados</span>
            <span className="stat-value">{qualifiedLeads}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">WhatsApp</span>
            <span className="stat-value" style={{ fontSize: "1.25rem" }}>
              {activeSession ? "🟢 Activo" : "🔴 Inactivo"}
            </span>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "var(--space-md)" }}>
            Leads Recientes
          </h3>
          {recentLeads.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Teléfono</th>
                    <th>Último Mensaje</th>
                    <th>Mensajes</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.map((lead) => (
                    <tr key={lead.id}>
                      <td style={{ fontWeight: 500 }}>
                        {lead.name || "Sin nombre"}
                      </td>
                      <td style={{ color: "var(--text-secondary)" }}>
                        {lead.phoneNumber}
                      </td>
                      <td
                        style={{
                          maxWidth: "300px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {lead.messages[0]?.content || "—"}
                      </td>
                      <td>{lead._count.messages}</td>
                      <td>
                        <span className={`badge ${lead.isQualified ? "badge-success" : "badge-info"}`}>
                          {lead.isQualified ? "Calificado" : "Nuevo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>Aún no tienes leads</h3>
              <p>Conecta WhatsApp y empieza a recibir mensajes automáticamente</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
