"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { SessionProvider } from "next-auth/react";

const navItems = [
  { href: "/dashboard", icon: "📊", label: "Resumen" },
  { href: "/dashboard/leads", icon: "👤", label: "Leads" },
  { href: "/dashboard/conversations", icon: "💬", label: "Conversaciones" },
  { href: "/dashboard/whatsapp", icon: "📱", label: "WhatsApp" },
  { href: "/dashboard/catalog", icon: "📦", label: "Catálogo" },
  { href: "/dashboard/settings", icon: "⚙️", label: "Configuración" },
];

function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span style={{ fontSize: "1.5rem" }}>🤖</span>
        <span className="sidebar-logo">AgentesIA</span>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Principal</div>
        {navItems.slice(0, 4).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${pathname === item.href ? "active" : ""}`}
          >
            <span className="link-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}

        <div className="sidebar-section-label">Gestión</div>
        {navItems.slice(4).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${pathname === item.href ? "active" : ""}`}
          >
            <span className="link-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={() => signOut({ callbackUrl: "/login" })}>
          <div className="user-avatar">
            {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="user-info">
            <div className="user-name">{session?.user?.name || "Usuario"}</div>
            <div className="user-role">Cerrar sesión →</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <DashboardContent>{children}</DashboardContent>
    </SessionProvider>
  );
}
