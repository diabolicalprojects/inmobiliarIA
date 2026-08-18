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
  { href: "/dashboard/agents", icon: "🤖", label: "Agentes" },
  { href: "/dashboard/catalog", icon: "📦", label: "Catálogo" },
  { href: "/dashboard/settings", icon: "⚙️", label: "Configuración" },
];

import { useState, useEffect } from "react";

function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return savedTheme === "dark" || (!savedTheme && prefersDark);
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      }
      return next;
    });
  };

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

      <div className="sidebar-footer" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <button 
          onClick={toggleTheme}
          style={{
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-default)",
            padding: "8px 12px",
            borderRadius: "8px",
            color: "var(--text-primary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "0.8125rem",
            fontWeight: "500",
            width: "100%"
          }}
        >
          <span>Modo {isDark ? "Claro" : "Oscuro"}</span>
          <span style={{ fontSize: "1rem" }}>{isDark ? "☀️" : "🌙"}</span>
        </button>

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
