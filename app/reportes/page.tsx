"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import NavBar from "@/app/components/NavBar"

// ─── Types ───────────────────────────────────────────────────
type Periodo = "hoy" | "semana" | "mes"

type VentaItem = {
  nombre_producto: string
  cantidad: number
  subtotal: number
}

type Venta = {
  id: string
  total: number
  metodo_pago: string
  created_at: string
  venta_items: VentaItem[]
}

// ─── Helpers ─────────────────────────────────────────────────
function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(n)
}

/** Convierte timestamp UTC a fecha Colombia (UTC-5) "YYYY-MM-DD" */
function colDate(utcIso: string): string {
  const d = new Date(new Date(utcIso).getTime() - 5 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 10)
}

const DIAS_CORTO = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const DIAS_LARGO = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]

function diaNombre(dateStr: string, largo = false): string {
  const d = new Date(dateStr + "T12:00:00Z")
  return (largo ? DIAS_LARGO : DIAS_CORTO)[d.getUTCDay()]
}

/** Retorna ISO del inicio del período en UTC, ajustado a Colombia */
function getRangeStart(periodo: Periodo): string {
  const now = new Date()
  const col = new Date(now.getTime() - 5 * 60 * 60 * 1000)
  let start: Date
  if (periodo === "hoy") {
    start = new Date(Date.UTC(col.getUTCFullYear(), col.getUTCMonth(), col.getUTCDate()))
  } else if (periodo === "semana") {
    const dow = col.getUTCDay()
    const back = dow === 0 ? 6 : dow - 1
    start = new Date(Date.UTC(col.getUTCFullYear(), col.getUTCMonth(), col.getUTCDate() - back))
  } else {
    start = new Date(Date.UTC(col.getUTCFullYear(), col.getUTCMonth(), 1))
  }
  // Colombia midnight = UTC + 5h
  return new Date(start.getTime() + 5 * 60 * 60 * 1000).toISOString()
}

// ─── Component ───────────────────────────────────────────────
export default function ReportesPage() {
  const router = useRouter()
  const [periodo, setPeriodo] = useState<Periodo>("mes")
  const [ventas, setVentas] = useState<Venta[]>([])
  const [loading, setLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [empresaId, setEmpresaId] = useState("")
  const [empresaNombre, setEmpresaNombre] = useState("")
  const [email, setEmail] = useState("")

  // Autenticación + perfil
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/"); return }
      setEmail(user.email || "")

      const { data: perfil } = await supabase
        .from("perfiles")
        .select("empresa_id, empresas(nombre)")
        .eq("id", user.id)
        .single()
      if (!perfil) { router.push("/"); return }

      setEmpresaNombre((perfil.empresas as unknown as { nombre: string })?.nombre || "Mi Tienda")
      setEmpresaId(perfil.empresa_id)
      setLoading(false)
    }
    init()
  }, [router])

  // Cargar ventas del período
  useEffect(() => {
    if (!empresaId) return
    const cargar = async () => {
      setDataLoading(true)
      const { data } = await supabase
        .from("ventas")
        .select("id, total, metodo_pago, created_at, venta_items(nombre_producto, cantidad, subtotal)")
        .eq("empresa_id", empresaId)
        .gte("created_at", getRangeStart(periodo))
        .order("created_at")
      setVentas((data as Venta[]) || [])
      setDataLoading(false)
    }
    cargar()
  }, [empresaId, periodo])

  // ── Métricas derivadas ─────────────────────────────────────
  const totalVendido = ventas.reduce((s, v) => s + v.total, 0)
  const numVentas = ventas.length
  const promedio = numVentas > 0 ? totalVendido / numVentas : 0

  // Ventas por día
  const byDay: Record<string, number> = {}
  ventas.forEach(v => {
    const d = colDate(v.created_at)
    byDay[d] = (byDay[d] || 0) + v.total
  })
  const sortedDays = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b))
  const topDay = [...sortedDays].sort(([, a], [, b]) => b - a)[0]
  const diaMasVentas = topDay ? diaNombre(topDay[0], true) : "—"
  const chartMax = Math.max(...sortedDays.map(([, t]) => t), 1)

  // Por medio de pago
  const metodos = { efectivo: 0, nequi: 0, daviplata: 0 }
  ventas.forEach(v => {
    const k = v.metodo_pago as keyof typeof metodos
    if (k in metodos) metodos[k] += v.total
  })

  // Top 5 productos
  const byProduct: Record<string, { nombre: string; cantidad: number; total: number }> = {}
  ventas.forEach(v =>
    v.venta_items.forEach(item => {
      if (!byProduct[item.nombre_producto]) {
        byProduct[item.nombre_producto] = { nombre: item.nombre_producto, cantidad: 0, total: 0 }
      }
      byProduct[item.nombre_producto].cantidad += item.cantidad
      byProduct[item.nombre_producto].total += item.subtotal
    })
  )
  const topProductos = Object.values(byProduct)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  // ── Estilos reutilizables ──────────────────────────────────
  const card: React.CSSProperties = {
    background: "rgba(0,0,0,0.3)",
    borderRadius: 20,
    padding: "18px 20px",
    border: "1px solid rgba(255,255,255,0.08)",
  }

  const labelMuted: React.CSSProperties = {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  }

  function chartLabel(dateStr: string) {
    if (periodo === "hoy") return "Hoy"
    if (periodo === "semana") return diaNombre(dateStr)
    return String(parseInt(dateStr.slice(8, 10)))
  }

  // ── Loading inicial ────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#1B3A6B" }}>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 15 }}>Cargando...</p>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#1B3A6B", paddingBottom: 88 }}>

      {/* Header */}
      <div style={{ padding: "40px 20px 16px", maxWidth: 520, margin: "0 auto" }}>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>
          Estadísticas
        </p>
        <p style={{ color: "white", fontSize: 26, fontWeight: 900, letterSpacing: -0.5, margin: 0 }}>
          Reportes
        </p>
      </div>

      <div style={{ padding: "0 20px 24px", maxWidth: 520, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Selector de período */}
        <div style={{ display: "flex", gap: 8 }}>
          {(["hoy", "semana", "mes"] as Periodo[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              style={{
                flex: 1,
                padding: "11px 0",
                borderRadius: 14,
                border: periodo === p ? "none" : "1px solid rgba(255,255,255,0.1)",
                background: periodo === p ? "#27B173" : "rgba(0,0,0,0.25)",
                color: periodo === p ? "white" : "rgba(255,255,255,0.45)",
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: "var(--font-nunito)",
                transition: "all 0.15s",
              }}
            >
              {p === "hoy" ? "Hoy" : p === "semana" ? "Semana" : "Mes"}
            </button>
          ))}
        </div>

        {dataLoading ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>Cargando datos...</p>
          </div>
        ) : (
          <>
            {/* Grid 2×2 métricas */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Total vendido", value: formatCOP(totalVendido) },
                { label: "Ventas", value: numVentas > 0 ? numVentas.toString() : "0" },
                { label: "Promedio", value: numVentas > 0 ? formatCOP(promedio) : "—" },
                { label: "Mejor día", value: diaMasVentas },
              ].map(m => (
                <div key={m.label} style={card}>
                  <p style={labelMuted}>{m.label}</p>
                  <p style={{ color: "#27B173", fontSize: 18, fontWeight: 900, letterSpacing: -0.5, margin: 0 }}>
                    {m.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Gráfica de barras por día */}
            {sortedDays.length > 0 ? (
              <div style={card}>
                <p style={labelMuted}>Ventas por día</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                  {sortedDays.map(([date, total]) => (
                    <div key={date} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        color: "rgba(255,255,255,0.4)",
                        fontSize: 11,
                        fontWeight: 700,
                        width: 28,
                        textAlign: "right",
                        flexShrink: 0,
                      }}>
                        {chartLabel(date)}
                      </span>
                      <div style={{
                        flex: 1,
                        background: "rgba(255,255,255,0.06)",
                        borderRadius: 6,
                        height: 22,
                        overflow: "hidden",
                      }}>
                        <div style={{
                          height: "100%",
                          width: `${(total / chartMax) * 100}%`,
                          background: "#27B173",
                          borderRadius: 6,
                          minWidth: total > 0 ? 6 : 0,
                          transition: "width 0.4s ease",
                        }} />
                      </div>
                      <span style={{
                        color: "rgba(255,255,255,0.5)",
                        fontSize: 10,
                        fontWeight: 700,
                        width: 74,
                        textAlign: "right",
                        flexShrink: 0,
                      }}>
                        {formatCOP(total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ ...card, textAlign: "center", padding: "36px 20px" }}>
                <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 14, margin: 0 }}>Sin ventas en este período</p>
              </div>
            )}

            {/* Top 5 productos */}
            {topProductos.length > 0 && (
              <div style={card}>
                <p style={labelMuted}>Top 5 productos</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12 }}>
                  {topProductos.map((prod, i) => (
                    <div key={prod.nombre} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ color: "#27B173", fontSize: 14, fontWeight: 900, width: 22, flexShrink: 0 }}>
                        #{i + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: "white", fontSize: 14, fontWeight: 700, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {prod.nombre}
                        </p>
                        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, margin: 0 }}>
                          {prod.cantidad} unidades
                        </p>
                      </div>
                      <span style={{ color: "#27B173", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                        {formatCOP(prod.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ventas por medio de pago */}
            <div style={card}>
              <p style={labelMuted}>Por medio de pago</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
                {[
                  { key: "efectivo" as const, label: "Efectivo", icon: "💵", color: "#27B173" },
                  { key: "nequi" as const, label: "Nequi", icon: "📲", color: "#7C6FF7" },
                  { key: "daviplata" as const, label: "Daviplata", icon: "💳", color: "#E24B4A" },
                ].map(m => {
                  const pct = totalVendido > 0 ? Math.round((metodos[m.key] / totalVendido) * 100) : 0
                  return (
                    <div key={m.key}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <span style={{ fontSize: 18, flexShrink: 0 }}>{m.icon}</span>
                        <span style={{ color: "white", fontSize: 14, fontWeight: 700, flex: 1 }}>{m.label}</span>
                        <span style={{ color: m.color, fontSize: 14, fontWeight: 800 }}>{formatCOP(metodos[m.key])}</span>
                        <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, width: 34, textAlign: "right" }}>{pct}%</span>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 6, overflow: "hidden" }}>
                        <div style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: m.color,
                          borderRadius: 4,
                          transition: "width 0.4s",
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Sección Perfil ── */}
            <div style={{ marginTop: 8 }}>
              <p style={{ ...labelMuted, marginBottom: 12 }}>Mi cuenta</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

                <div style={card}>
                  <p style={labelMuted}>Mi tienda</p>
                  <p style={{ color: "white", fontSize: 22, fontWeight: 900, margin: 0 }}>{empresaNombre}</p>
                </div>

                <div style={card}>
                  <p style={labelMuted}>Correo</p>
                  <p style={{ color: "white", fontSize: 14, fontWeight: 700, margin: 0 }}>{email}</p>
                </div>

                <div style={{
                  ...card,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 20px",
                  background: "rgba(0,0,0,0.15)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}>
                  <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 13, fontWeight: 700, margin: 0 }}>SOCI</p>
                  <p style={{ color: "rgba(255,255,255,0.15)", fontSize: 12, margin: 0 }}>v1.0</p>
                </div>

                <button
                  onClick={async () => { await supabase.auth.signOut(); router.push("/") }}
                  style={{
                    width: "100%",
                    background: "rgba(239,68,68,0.12)",
                    border: "1px solid rgba(239,68,68,0.35)",
                    borderRadius: 20,
                    padding: "17px",
                    color: "#f87171",
                    fontSize: 15,
                    fontWeight: 900,
                    cursor: "pointer",
                    fontFamily: "var(--font-nunito)",
                  }}
                >
                  Cerrar sesión
                </button>
              </div>
            </div>

          </>
        )}
      </div>

      <NavBar />
    </div>
  )
}
