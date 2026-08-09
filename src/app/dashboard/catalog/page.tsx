"use client";

import { useState, useEffect, useRef } from "react";

interface CatalogItem {
  id: string;
  title: string;
  description: string;
  price: number | null;
  location: string | null;
  metadata: Record<string, string> | null;
  isActive: boolean;
  createdAt: string;
}

export default function CatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    location: "",
  });

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    try {
      const res = await fetch("/api/v1/catalog");
      const data = await res.json();
      setItems(data.items || []);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/v1/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          price: form.price ? parseFloat(form.price) : undefined,
          location: form.location || undefined,
        }),
      });

      if (res.ok) {
        setForm({ title: "", description: "", price: "", location: "" });
        setShowForm(false);
        loadItems();
        showMessage("✅ Elemento agregado");
      }
    } catch {
      showMessage("❌ Error al agregar");
    }
  }

  async function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/v1/catalog/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        showMessage(`✅ ${data.message}`);
        loadItems();
      } else {
        showMessage(`❌ ${data.error}`);
      }
    } catch {
      showMessage("❌ Error al importar");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function showMessage(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(""), 4000);
  }

  if (loading) {
    return (
      <>
        <div className="page-header"><h2>Catálogo</h2></div>
        <div className="page-body">
          <div className="empty-state"><div className="spinner" style={{ width: 40, height: 40 }} /></div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-header">
        <h2>Catálogo ({items.length})</h2>
        <div style={{ display: "flex", gap: "var(--space-sm)" }}>
          <label className="btn btn-secondary" style={{ cursor: "pointer" }}>
            {uploading ? <><span className="spinner" /> Importando...</> : "📄 Importar CSV"}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              style={{ display: "none" }}
            />
          </label>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? "✕ Cancelar" : "+ Agregar"}
          </button>
        </div>
      </div>

      <div className="page-body">
        {message && (
          <div style={{ marginBottom: "var(--space-md)", fontSize: "0.875rem", fontWeight: 500 }}>
            {message}
          </div>
        )}

        {/* Add Item Form */}
        {showForm && (
          <div className="glass-card animate-fade-in" style={{ padding: "var(--space-xl)", marginBottom: "var(--space-lg)", maxWidth: 600 }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "var(--space-md)" }}>
              Nuevo Elemento
            </h3>
            <form onSubmit={handleAddItem} style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
              <div className="input-group">
                <label>Título *</label>
                <input
                  className="input"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Casa en Valle Oriente..."
                  required
                />
              </div>
              <div className="input-group">
                <label>Descripción *</label>
                <textarea
                  className="input"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="3 recámaras, jardín amplio..."
                  required
                  rows={3}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-md)" }}>
                <div className="input-group">
                  <label>Precio</label>
                  <input
                    className="input"
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="4500000"
                  />
                </div>
                <div className="input-group">
                  <label>Ubicación</label>
                  <input
                    className="input"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="Monterrey, NL"
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary">
                Agregar al Catálogo
              </button>
            </form>
          </div>
        )}

        {/* Catalog Grid */}
        {items.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "var(--space-md)" }}>
            {items.map((item) => (
              <div key={item.id} className="glass-card" style={{ padding: "var(--space-lg)", display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <h4 style={{ fontSize: "0.9375rem", fontWeight: 600, flex: 1 }}>{item.title}</h4>
                  {item.price && (
                    <span style={{ fontSize: "0.9375rem", fontWeight: 700, color: "var(--success)", whiteSpace: "nowrap", marginLeft: "var(--space-sm)" }}>
                      ${item.price.toLocaleString("es-MX")}
                    </span>
                  )}
                </div>

                <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {item.description}
                </p>

                {item.location && (
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    📍 {item.location}
                  </span>
                )}

                {item.metadata && Object.keys(item.metadata).length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "var(--space-xs)" }}>
                    {Object.entries(item.metadata).slice(0, 4).map(([key, value]) => (
                      <span
                        key={key}
                        style={{
                          fontSize: "0.6875rem",
                          padding: "2px 6px",
                          background: "var(--bg-hover)",
                          borderRadius: "var(--radius-sm)",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {key}: {value}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>Catálogo vacío</h3>
            <p>Agrega propiedades o viajes para que tu IA pueda recomendarlos</p>
          </div>
        )}
      </div>
    </>
  );
}
