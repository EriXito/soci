"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { syncProductoSheets } from "@/lib/syncSheets"
import NavBar from "@/app/components/NavBar"

interface Producto {
  id: string
  nombre: string
  marca: string
  precio_venta: number
  precio_compra: number
  precio_minimo: number
  stock_actual: number
  stock_minimo: number
  activo: boolean
}

interface FormData {
  nombre: string
  marca: string
  precio_venta: string
  precio_compra: string
  precio_minimo: string
  stock_actual: string
  stock_minimo: string
  activo: boolean
}

const FORM_VACIO: FormData = {
  nombre: "",
  marca: "",
  precio_venta: "",
  precio_compra: "",
  precio_minimo: "",
  stock_actual: "0",
  stock_minimo: "0",
  activo: true,
}

const formatCOP = (valor: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor)

const inputBase: React.CSSProperties = {
  width: "100%",
  background: "rgba(0,0,0,0.3)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 14,
  padding: "13px 14px",
  fontSize: 15,
  fontWeight: 700,
  color: "white",
  outline: "none",
  fontFamily: "var(--font-nunito)",
}

function Campo({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </p>
      {children}
    </div>
  )
}

export default function InventarioPage() {
  const router = useRouter()
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [empresaId, setEmpresaId] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(FORM_VACIO)
  const [loadingGuardar, setLoadingGuardar] = useState(false)

  useEffect(() => {
    const cargar = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/"); return }

      const { data: perfil } = await supabase
        .from("perfiles")
        .select("empresa_id")
        .eq("id", user.id)
        .single()

      if (!perfil) { router.push("/"); return }

      setEmpresaId(perfil.empresa_id)
      await recargar(perfil.empresa_id)
    }
    cargar()
  }, [router])

  const recargar = async (eid: string) => {
    const { data } = await supabase
      .from("productos")
      .select("*")
      .eq("empresa_id", eid)
      .order("nombre")
    setProductos(data || [])
    setLoading(false)
  }

  const productosFiltrados = productos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.marca || "").toLowerCase().includes(busqueda.toLowerCase())
  )

  const getStockStatus = (p: Producto) => {
    if (p.stock_actual <= 0) return "critico"
    if (p.stock_minimo > 0 && p.stock_actual <= p.stock_minimo) return "bajo"
    return "ok"
  }

  const esVentaLibre = (p: Producto) => p.stock_actual === 0 && p.stock_minimo === 0

  const abrirNuevo = () => {
    setEditandoId(null)
    setForm(FORM_VACIO)
    setShowForm(true)
  }

  const abrirEditar = (p: Producto) => {
    setEditandoId(p.id)
    setForm({
      nombre: p.nombre,
      marca: p.marca || "",
      precio_venta: p.precio_venta ? String(p.precio_venta) : "",
      precio_compra: p.precio_compra ? String(p.precio_compra) : "",
      precio_minimo: p.precio_minimo ? String(p.precio_minimo) : "",
      stock_actual: String(p.stock_actual ?? 0),
      stock_minimo: String(p.stock_minimo ?? 0),
      activo: p.activo,
    })
    setShowForm(true)
  }

  const guardar = async () => {
    if (!form.nombre.trim() || !form.precio_venta || !empresaId) return
    setLoadingGuardar(true)

    const datos = {
      empresa_id: empresaId,
      nombre: form.nombre.trim(),
      marca: form.marca.trim(),
      precio_venta: parseFloat(form.precio_venta) || 0,
      precio_compra: parseFloat(form.precio_compra) || 0,
      precio_minimo: parseFloat(form.precio_minimo) || 0,
      stock_actual: parseInt(form.stock_actual) || 0,
      stock_minimo: parseInt(form.stock_minimo) || 0,
      activo: form.activo,
    }

    if (editandoId) {
      await supabase.from("productos").update(datos).eq("id", editandoId)
    } else {
      await supabase.from("productos").insert(datos)
    }

    // Sincronizar con Google Sheets (fire-and-forget)
    syncProductoSheets(empresaId, datos)

    await recargar(empresaId)
    setLoadingGuardar(false)
    setShowForm(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1B3A6B" }}>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 16 }}>Cargando...</p>
      </div>
    )
  }

  const inactivos = productos.filter(p => !p.activo).length

  return (
    <div className="min-h-screen pb-44" style={{ background: "#1B3A6B" }}>

      {/* Header */}
      <div className="px-5 pt-10 pb-4 max-w-lg mx-auto">
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              padding: "8px 14px",
              color: "white",
              fontSize: 20,
              cursor: "pointer",
            }}
          >
            ←
          </button>
          <div>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
              Gestión
            </p>
            <p style={{ color: "white", fontSize: 18, fontWeight: 900 }}>
              Inventario
            </p>
          </div>
        </div>

        {/* Buscador */}
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar producto o marca..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{
              width: "100%",
              borderRadius: 16,
              padding: "14px 16px 14px 44px",
              fontSize: 15,
              fontWeight: 600,
              color: "white",
              background: "rgba(0,0,0,0.25)",
              border: "1px solid rgba(255,255,255,0.1)",
              outline: "none",
              fontFamily: "var(--font-nunito)",
            }}
          />
        </div>
      </div>

      {/* Lista */}
      <div className="px-5 max-w-lg mx-auto">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
            {productosFiltrados.length} {productosFiltrados.length === 1 ? "producto" : "productos"}
          </p>
          {inactivos > 0 && (
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
              {inactivos} inactivo{inactivos > 1 ? "s" : ""}
            </p>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {productosFiltrados.map(p => {
            const status = getStockStatus(p)
            const stockColor = status === "ok" ? "#4ade80" : status === "bajo" ? "#fbbf24" : "#f87171"
            const stockBg = status === "ok" ? "rgba(39,177,115,0.2)" : status === "bajo" ? "rgba(245,166,35,0.2)" : "rgba(239,68,68,0.2)"

            return (
              <div
                key={p.id}
                onClick={() => abrirEditar(p)}
                style={{
                  background: !p.activo
                    ? "rgba(0,0,0,0.15)"
                    : status === "critico" && !esVentaLibre(p)
                    ? "rgba(127,29,29,0.4)"
                    : "rgba(0,0,0,0.3)",
                  borderRadius: 20,
                  padding: "16px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  border: !p.activo
                    ? "1px solid rgba(255,255,255,0.05)"
                    : status === "critico" && !esVentaLibre(p)
                    ? "1px solid rgba(239,68,68,0.35)"
                    : "1px solid rgba(255,255,255,0.08)",
                  cursor: "pointer",
                  opacity: p.activo ? 1 : 0.5,
                  transition: "opacity 0.2s",
                }}
              >
                <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                  <p style={{ color: "white", fontSize: 15, fontWeight: 700, marginBottom: 3 }}>{p.nombre}</p>
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
                    {p.marca || "Sin marca"} · {formatCOP(p.precio_venta)}
                  </p>
                </div>

                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {!p.activo ? (
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontWeight: 700 }}>Inactivo</span>
                  ) : esVentaLibre(p) ? (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontSize: 12, fontWeight: 700, padding: "4px 10px",
                      borderRadius: 20, background: "rgba(39,177,115,0.2)", color: "#4ade80",
                    }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                      Libre
                    </span>
                  ) : (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontSize: 12, fontWeight: 700, padding: "4px 10px",
                      borderRadius: 20, background: stockBg, color: stockColor,
                    }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: stockColor, display: "inline-block" }} />
                      {p.stock_actual} uds
                    </span>
                  )}
                  <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, marginTop: 5 }}>
                    Toca para editar
                  </p>
                </div>
              </div>
            )
          })}

          {productosFiltrados.length === 0 && (
            <div style={{ textAlign: "center", padding: "56px 20px", color: "rgba(255,255,255,0.3)" }}>
              <p style={{ fontSize: 44, marginBottom: 14 }}>📦</p>
              <p style={{ fontSize: 15, fontWeight: 700 }}>
                {busqueda ? `No hay productos con "${busqueda}"` : "Aún no hay productos"}
              </p>
              {!busqueda && (
                <p style={{ fontSize: 13, marginTop: 6 }}>Toca el botón de abajo para agregar el primero</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal / Bottom sheet formulario */}
      {showForm && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            background: "rgba(0,0,0,0.7)",
            display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}
          onClick={() => setShowForm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 480,
              background: "#152E56",
              borderRadius: "24px 24px 0 0",
              padding: "24px 22px 44px",
              border: "1px solid rgba(255,255,255,0.12)",
              maxHeight: "92vh",
              overflowY: "auto",
            }}
          >
            {/* Cabecera del form */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <p style={{ color: "white", fontSize: 17, fontWeight: 900 }}>
                {editandoId ? "Editar producto" : "Agregar producto"}
              </p>
              <button
                onClick={() => setShowForm(false)}
                style={{
                  color: "rgba(255,255,255,0.4)", fontSize: 26, background: "none",
                  border: "none", cursor: "pointer", lineHeight: 1, padding: "0 4px",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

              {/* Nombre */}
              <Campo label="Nombre *">
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Cuaderno Norma 100 hojas"
                  autoFocus
                  style={inputBase}
                />
              </Campo>

              {/* Marca */}
              <Campo label="Marca">
                <input
                  type="text"
                  value={form.marca}
                  onChange={(e) => setForm(f => ({ ...f, marca: e.target.value }))}
                  placeholder="Ej: Norma, Colombina..."
                  style={inputBase}
                />
              </Campo>

              {/* Precios — 2 columnas */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Campo label="Precio venta *">
                  <input
                    type="number"
                    value={form.precio_venta}
                    onChange={(e) => setForm(f => ({ ...f, precio_venta: e.target.value }))}
                    placeholder="0"
                    onWheel={(e) => e.currentTarget.blur()}
                    style={{ ...inputBase, appearance: "none", MozAppearance: "textfield" } as React.CSSProperties}
                  />
                </Campo>
                <Campo label="Precio compra">
                  <input
                    type="number"
                    value={form.precio_compra}
                    onChange={(e) => setForm(f => ({ ...f, precio_compra: e.target.value }))}
                    placeholder="0"
                    onWheel={(e) => e.currentTarget.blur()}
                    style={{ ...inputBase, appearance: "none", MozAppearance: "textfield" } as React.CSSProperties}
                  />
                </Campo>
              </div>

              {/* Precio mínimo */}
              <Campo label="Precio mínimo">
                <input
                  type="number"
                  value={form.precio_minimo}
                  onChange={(e) => setForm(f => ({ ...f, precio_minimo: e.target.value }))}
                  placeholder="0 — dejar en 0 para no usar"
                  onWheel={(e) => e.currentTarget.blur()}
                  style={{ ...inputBase, appearance: "none", MozAppearance: "textfield" } as React.CSSProperties}
                />
              </Campo>

              {/* Stock — 2 columnas */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Campo label="Stock actual">
                  <input
                    type="number"
                    value={form.stock_actual}
                    onChange={(e) => setForm(f => ({ ...f, stock_actual: e.target.value }))}
                    placeholder="0"
                    onWheel={(e) => e.currentTarget.blur()}
                    style={{ ...inputBase, appearance: "none", MozAppearance: "textfield" } as React.CSSProperties}
                  />
                </Campo>
                <Campo label="Stock mínimo">
                  <input
                    type="number"
                    value={form.stock_minimo}
                    onChange={(e) => setForm(f => ({ ...f, stock_minimo: e.target.value }))}
                    placeholder="0"
                    onWheel={(e) => e.currentTarget.blur()}
                    style={{ ...inputBase, appearance: "none", MozAppearance: "textfield" } as React.CSSProperties}
                  />
                </Campo>
              </div>

              {/* Toggle activo — solo al editar */}
              {editandoId && (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: "rgba(0,0,0,0.2)",
                  borderRadius: 14,
                  padding: "14px 16px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  marginTop: 4,
                }}>
                  <div>
                    <p style={{ color: "white", fontSize: 14, fontWeight: 700 }}>Producto activo</p>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 3 }}>
                      {form.activo ? "Visible en ventas e inventario" : "Oculto en ventas"}
                    </p>
                  </div>
                  <button
                    onClick={() => setForm(f => ({ ...f, activo: !f.activo }))}
                    style={{
                      width: 52, height: 30,
                      borderRadius: 15,
                      background: form.activo ? "#27B173" : "rgba(255,255,255,0.15)",
                      border: "none",
                      cursor: "pointer",
                      position: "relative",
                      transition: "background 0.2s",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{
                      position: "absolute",
                      top: 3,
                      left: form.activo ? 24 : 3,
                      width: 24, height: 24,
                      borderRadius: "50%",
                      background: "white",
                      transition: "left 0.2s",
                      display: "block",
                    }} />
                  </button>
                </div>
              )}

              {/* Botón guardar */}
              <button
                onClick={guardar}
                disabled={loadingGuardar || !form.nombre.trim() || !form.precio_venta}
                style={{
                  marginTop: 6,
                  width: "100%",
                  background: loadingGuardar || !form.nombre.trim() || !form.precio_venta
                    ? "rgba(39,177,115,0.35)"
                    : "#27B173",
                  color: "white",
                  borderRadius: 16,
                  padding: "16px",
                  fontSize: 16,
                  fontWeight: 900,
                  border: "none",
                  cursor: loadingGuardar || !form.nombre.trim() || !form.precio_venta
                    ? "not-allowed"
                    : "pointer",
                  fontFamily: "var(--font-nunito)",
                  transition: "background 0.2s",
                }}
              >
                {loadingGuardar ? "Guardando..." : editandoId ? "Guardar cambios" : "Crear producto"}
              </button>

            </div>
          </div>
        </div>
      )}

      {/* Botón agregar — sobre la navbar */}
      <div style={{
        position: "fixed", bottom: 64, left: 0, right: 0,
        padding: "8px 20px 10px",
        background: "linear-gradient(to top, #1B3A6B 60%, transparent)",
      }}>
        <div className="max-w-lg mx-auto">
          <button
            onClick={abrirNuevo}
            style={{
              width: "100%",
              background: "#27B173",
              color: "white",
              borderRadius: 20,
              padding: "18px",
              fontSize: 17,
              fontWeight: 900,
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-nunito)",
            }}
          >
            ＋ Agregar producto
          </button>
        </div>
      </div>

      <NavBar />
    </div>
  )
}
