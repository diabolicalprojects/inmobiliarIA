import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import SendMessageForm from "./send-message-form";

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.agencyId) redirect("/login");

  const { leadId } = await params;

  const lead = await prisma.lead.findFirst({
    where: {
      id: leadId,
      agencyId: session.user.agencyId,
    },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
      whatsappSession: {
        include: {
          agent: { select: { name: true } },
        },
      },
    },
  });

  if (!lead) redirect("/dashboard/conversations");

  const connectedSessions = await prisma.whatsappSession.findMany({
    where: {
      agencyId: session.user.agencyId,
      status: "CONNECTED",
    },
    include: {
      agent: { select: { name: true } },
    },
    orderBy: { connectedAt: "desc" },
  });

  const sessionOptions = connectedSessions.map((waSession) => ({
    id: waSession.id,
    label: `${waSession.agent?.name || "Sin agente"} · ${waSession.openwaSessionName.slice(0, 18)}...`,
  }));

  return (
    <>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)" }}>
          <Link
            href="/dashboard/conversations"
            className="btn btn-icon btn-secondary"
            style={{ fontSize: "1.125rem" }}
          >
            ←
          </Link>
          <div>
            <h2>{lead.name || lead.phoneNumber}</h2>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 1 }}>
              📞 {lead.phoneNumber}
              {lead.isQualified && " · ⭐ Calificado"}
              {lead.whatsappSession && ` · ${lead.whatsappSession.agent?.name || "Sesión sin agente"}`}
            </p>
          </div>
        </div>

        {lead.aiSummary && (
          <div
            style={{
              maxWidth: 320,
              padding: "0.5rem 0.75rem",
              background: "var(--info-bg)",
              border: "1px solid rgba(51, 154, 240, 0.2)",
              borderRadius: "var(--radius-md)",
              fontSize: "0.75rem",
              color: "var(--info)",
            }}
          >
            🧠 {lead.aiSummary}
          </div>
        )}
      </div>

      <div
        className="chat-container"
        style={{
          height: "calc(100vh - var(--header-height))",
          background: "var(--bg-primary)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-lg)" }}>
          {lead.messages.length > 0 ? (
            lead.messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-bubble ${msg.role === "USER" ? "user" : "assistant"}`}
              >
                <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
                <div className="chat-time">
                  {msg.role === "ASSISTANT" && "🤖 "}
                  {new Date(msg.createdAt).toLocaleTimeString("es-MX", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <h3>Sin mensajes</h3>
            </div>
          )}
        </div>

        <SendMessageForm
          leadId={lead.id}
          defaultSessionId={lead.whatsappSessionId}
          sessions={sessionOptions}
        />
      </div>
    </>
  );
}
