import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function LeadsPage() {
  const session = await auth();
  if (!session?.user?.agencyId) redirect("/login");

  const leads = await prisma.lead.findMany({
    where: { agencyId: session.user.agencyId },
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <>
      <div className="page-header">
        <h2>Leads ({leads.length})</h2>
      </div>

      <div className="page-body">
        {leads.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Resumen IA</th>
                  <th>Mensajes</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td style={{ fontWeight: 500 }}>
                      {lead.name || "Sin nombre"}
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontFamily: "monospace", fontSize: "0.8125rem" }}>
                      {lead.phoneNumber}
                    </td>
                    <td style={{ maxWidth: "280px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-secondary)", fontSize: "0.8125rem" }}>
                      {lead.aiSummary || "Sin resumen aún"}
                    </td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        💬 {lead._count.messages}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${lead.isQualified ? "badge-success" : "badge-info"}`}>
                        {lead.isQualified ? "Calificado" : "Nuevo"}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/dashboard/conversations/${lead.id}`}
                        className="btn btn-sm btn-secondary"
                      >
                        Ver Chat
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">👤</div>
            <h3>Sin leads todavía</h3>
            <p>Los leads se crean automáticamente cuando alguien escribe a tu WhatsApp</p>
          </div>
        )}
      </div>
    </>
  );
}
