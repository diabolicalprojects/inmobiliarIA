"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    agencyName: "",
    industryType: "REAL_ESTATE" as "REAL_ESTATE" | "TRAVEL",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al registrar");
        return;
      }

      // Redirect to login with success message
      router.push("/login?registered=true");
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-in">
        <div style={{ textAlign: "center", marginBottom: "0.5rem", fontSize: "2.5rem" }}>
          🏢
        </div>
        <h1 style={{ textAlign: "center" }}>Crear Cuenta</h1>
        <p className="auth-subtitle" style={{ textAlign: "center" }}>
          Registra tu agencia y comienza a automatizar
        </p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="reg-name">Tu nombre</label>
            <input
              id="reg-name"
              type="text"
              className="input"
              placeholder="Juan Pérez"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              className="input"
              placeholder="tu@agencia.com"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="reg-password">Contraseña</label>
            <input
              id="reg-password"
              type="password"
              className="input"
              placeholder="Mínimo 6 caracteres"
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div className="input-group">
            <label htmlFor="reg-agency">Nombre de la agencia</label>
            <input
              id="reg-agency"
              type="text"
              className="input"
              placeholder="Mi Agencia Inmobiliaria"
              value={form.agencyName}
              onChange={(e) => updateField("agencyName", e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="reg-industry">Tipo de industria</label>
            <select
              id="reg-industry"
              className="input select"
              value={form.industryType}
              onChange={(e) => updateField("industryType", e.target.value)}
            >
              <option value="REAL_ESTATE">🏠 Inmobiliaria</option>
              <option value="TRAVEL">✈️ Viajes</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={loading}
            style={{ width: "100%", marginTop: "0.5rem" }}
          >
            {loading ? (
              <>
                <span className="spinner" /> Registrando...
              </>
            ) : (
              "Crear Cuenta"
            )}
          </button>
        </form>

        <div className="auth-footer">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login">Iniciar sesión</Link>
        </div>
      </div>
    </div>
  );
}
