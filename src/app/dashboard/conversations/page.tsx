import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ConversationsPage() {
  const session = await auth();
  if (!session?.user?.agencyId) redirect("/login");

  const leads = await prisma.lead.findMany({
    where: {
      agencyId: session.user.agencyId,
      messages: { some: {} }, // Only leads with messages
    },
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <>
      <div className="page-header">
        <h2>Conversaciones</h2>
      </div>

      <div className="page-body">
        {leads.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
            {leads.map((lead) => (
              <Link
                key={lead.id}
                href={`/dashboard/conversations/${lead.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-md)",
                  padding: "var(--space-md)",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  textDecoration: "none",
                  color: "inherit",
                  transition: "all var(--transition-fast)",
                }}
                className="conversation-item"
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "var(--radius-full)",
                    background: "var(--gradient-brand)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.125rem",
                    fontWeight: 700,
                    color: "white",
                    flexShrink: 0,
                  }}
                >
                  {lead.name?.charAt(0)?.toUpperCase() || "?"}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: "0.9375rem" }}>
                      {lead.name || lead.phoneNumber}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {lead.messages[0]?.createdAt
                        ? new Date(lead.messages[0].createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short" })
                        : ""}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--text-secondary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {lead.messages[0]?.role === "ASSISTANT" && "🤖 "}
                    {lead.messages[0]?.content || "Sin mensajes"}
                  </div>
                </div>

                <div
                  style={{
                    background: "var(--primary-600)",
                    color: "white",
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "var(--radius-full)",
                    flexShrink: 0,
                  }}
                >
                  {lead._count.messages}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <h3>Sin conversaciones</h3>
            <p>Las conversaciones aparecerán aquí cuando tus leads escriban por WhatsApp</p>
          </div>
        )}
      </div>
    </>
  );
}
