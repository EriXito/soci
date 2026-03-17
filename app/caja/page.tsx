"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import NavBar from "@/app/components/NavBar"

interface VentaItem {
  nombre_producto: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  productos: { precio_compra: number } | null
}

interface Venta {
  id: string
  total: number
  metodo_pago: string
  created_at: string
  venta_items: VentaItem[]
}

interface Gasto {
  id: string
  descripcion: string
  monto: number
  billetera_id: string
  created_at: string
}

interface Billetera {
  id: string
  nombre: string
  saldo: number
  color: string
  icono: string
}

const formatCOP = (valor: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor)

const METODOS: Record<string, { icono: string; color: string }> = {
  efectivo: { icono: "💵", color: "#27B173" },
  nequi: { icono: "📲", color: "#7C6FF7" },
  daviplata: { icono: "💳", color: "#E24B4A" },
}

// Inicio del día en hora Colombia (UTC-5)
function getInicioDiaCO(): string {
  const ahora = new Date()
  const ahoraCO = new Date(ahora.getTime() - 5 * 60 * 60 * 1000)
  const inicioCO = new Date(
    Date.UTC(ahoraCO.getUTCFullYear(), ahoraCO.getUTCMonth(), ahoraCO.getUTCDate())
  )
  return new Date(inicioCO.getTime() + 5 * 60 * 60 * 1000).toISOString()
}

function formatHoraCO(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-CO", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const seccionLabel: React.CSSProperties = {
  color: "rgba(255,255,255,0.45)",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: "uppercase",
  marginBottom: 12,
}

const card: React.CSSProperties = {
  background: "rgba(0,0,0,0.3)",
  borderRadius: 20,
  padding: "16px 18px",
  border: "1px solid rgba(255,255,255,0.08)",
}

export default function CajaPage() {
  const router = useRouter()
  const [ventas, setVentas] = useState<Venta[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [billeteras, setBilleteras] = useState<Billetera[]>([])
  const [loading, setLoading] = useState(true)
  const [empresaId, setEmpresaId] = useState("")

  // Form gasto
  const [showFormGasto, setShowFormGasto] = useState(false)
  const [descGasto, setDescGasto] = useState("")
  const [montoGasto, setMontoGasto] = useState("")
  const [billeteraGasto, setBilleteraGasto] = useState("")
  const [loadingGasto, setLoadingGasto] = useState(false)

  // Ventas expandibles
  const [ventaExpandida, setVentaExpandida] = useState<string | null>(null)

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
    const inicio = getInicioDiaCO()

    const [ventasRes, gastosRes, billeterasRes] = await Promise.all([
      supabase
        .from("ventas")
        .select(`
          id, total, metodo_pago, created_at,
          venta_items(nombre_producto, cantidad, precio_unitario, subtotal, productos(precio_compra))
        `)
        .eq("empresa_id", eid)
        .gte("created_at", inicio)
        .order("created_at", { ascending: false }),
      supabase
        .from("gastos")
        .select("id, descripcion, monto, billetera_id, created_at")
        .eq("empresa_id", eid)
        .gte("created_at", inicio)
        .order("created_at", { ascending: false }),
      supabase
        .from("billeteras")
        .select("id, nombre, saldo, color, icono")
        .eq("empresa_id", eid),
    ])

    setVentas((ventasRes.data as unknown as Venta[]) || [])
    setGastos(gastosRes.data || [])
    setBilleteras(billeterasRes.data || [])
    setLoading(false)
  }

  // Métricas computadas
  const totalVendido = ventas.reduce((a, v) => a + v.total, 0)
  const totalGastos = gastos.reduce((a, g) => a + g.monto, 0)

  const porMetodo = ["efectivo", "nequi", "daviplata"].map(m => ({
    metodo: m,
    total: ventas.filter(v => v.metodo_pago === m).reduce((a, v) => a + v.total, 0),
    count: ventas.filter(v => v.metodo_pago === m).length,
  }))

  const gananciaDia = ventas.reduce((acc, v) => {
    return acc + v.venta_items.reduce((a, item) => {
      const costo = item.productos?.precio_compra ?? 0
      return a + (item.precio_unitario - costo) * item.cantidad
    }, 0)
  }, 0)

  const registrarGasto = async () => {
    const monto = parseFloat(montoGasto)
    if (!descGasto.trim() || isNaN(monto) || monto <= 0 || !billeteraGasto || !empresaId) return
    setLoadingGasto(true)

    await supabase.from("gastos").insert({
      empresa_id: empresaId,
      descripcion: descGasto.trim(),
      monto,
      billetera_id: billeteraGasto,
      categoria: "general",
    })

    const billetera = billeteras.find(b => b.id === billeteraGasto)
    if (billetera) {
      await supabase
        .from("billeteras")
        .update({ saldo: billetera.saldo - monto })
        .eq("id", billetera.id)
    }

    setDescGasto("")
    setMontoGasto("")
    setShowFormGasto(false)
    setLoadingGasto(false)
    await recargar(empresaId)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1B3A6B" }}>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 16 }}>Cargando...</p>
      </div>
    )
  }

  const hoy = new Date().toLocaleDateString("es-CO", {
    timeZone: "America/Bogota",
    weekday: "long", day: "numeric", month: "long",
  })

  return (
    <div className="min-h-screen pb-24" style={{ background: "#1B3A6B" }}>

      {/* Header */}
      <div className="px-5 pt-10 pb-6 max-w-lg mx-auto">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
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
              {hoy}
            </p>
            <p style={{ color: "white", fontSize: 18, fontWeight: 900 }}>
              Cierre de caja
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 max-w-lg mx-auto" style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* ── RESUMEN PRINCIPAL ── */}
        <div>
          <p style={seccionLabel}>Resumen del día</p>

          {/* Total vendido */}
          <div style={{ ...card, marginBottom: 10 }}>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
              Total vendido
            </p>
            <p style={{ color: "white", fontSize: 40, fontWeight: 900, letterSpacing: -1, margin: "4px 0 2px" }}>
              {formatCOP(totalVendido)}
            </p>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 13 }}>
              {ventas.length} {ventas.length === 1 ? "venta" : "ventas"} registradas
            </p>
          </div>

          {/* Métricas secundarias: ganancia y gastos */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div style={{ ...card }}>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                Ganancia est.
              </p>
              <p style={{ color: "#4ade80", fontSize: 20, fontWeight: 900 }}>
                {formatCOP(gananciaDia)}
              </p>
            </div>
            <div style={{ ...card }}>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                Gastos hoy
              </p>
              <p style={{ color: totalGastos > 0 ? "#f87171" : "rgba(255,255,255,0.4)", fontSize: 20, fontWeight: 900 }}>
                {formatCOP(totalGastos)}
              </p>
            </div>
          </div>

          {/* Desglose por medio de pago */}
          <div style={{ ...card }}>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
              Por medio de pago
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {porMetodo.map(({ metodo, total, count }) => {
                const m = METODOS[metodo]
                return (
                  <div key={metodo} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{m.icono}</span>
                      <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 600, textTransform: "capitalize" }}>
                        {metodo}
                      </span>
                      {count > 0 && (
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          background: "rgba(255,255,255,0.1)",
                          borderRadius: 20, padding: "2px 8px",
                          color: "rgba(255,255,255,0.4)",
                        }}>
                          {count} {count === 1 ? "venta" : "ventas"}
                        </span>
                      )}
                    </div>
                    <span style={{ color: total > 0 ? "white" : "rgba(255,255,255,0.25)", fontSize: 16, fontWeight: 900 }}>
                      {formatCOP(total)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── BILLETERAS ── */}
        <div>
          <p style={seccionLabel}>Saldo actual en bolsillos</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {billeteras.map(b => (
              <div key={b.id} style={{
                ...card,
                padding: "16px 10px",
                textAlign: "center",
                borderTop: `3px solid ${b.color}`,
              }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>{b.icono}</div>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 }}>
                  {b.nombre}
                </p>
                <p style={{ color: "white", fontSize: 13, fontWeight: 900 }}>
                  {formatCOP(b.saldo)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── GASTOS ── */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ ...seccionLabel, marginBottom: 0 }}>Gastos del día</p>
            <button
              onClick={() => { setBilleteraGasto(billeteras[0]?.id || ""); setShowFormGasto(v => !v) }}
              style={{
                background: showFormGasto ? "rgba(0,0,0,0.3)" : "rgba(39,177,115,0.15)",
                border: `1px solid ${showFormGasto ? "rgba(255,255,255,0.1)" : "rgba(39,177,115,0.4)"}`,
                borderRadius: 20,
                padding: "6px 14px",
                color: showFormGasto ? "rgba(255,255,255,0.5)" : "#4ade80",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "var(--font-nunito)",
              }}
            >
              {showFormGasto ? "Cancelar" : "＋ Registrar gasto"}
            </button>
          </div>

          {/* Formulario gasto */}
          {showFormGasto && (
            <div style={{ ...card, marginBottom: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <input
                  type="text"
                  placeholder="¿En qué se gastó? Ej: Bolsas, transporte..."
                  value={descGasto}
                  onChange={(e) => setDescGasto(e.target.value)}
                  autoFocus
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 12,
                    padding: "12px 14px",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "white",
                    outline: "none",
                    fontFamily: "var(--font-nunito)",
                    width: "100%",
                  }}
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <input
                    type="number"
                    placeholder="Monto"
                    value={montoGasto}
                    onChange={(e) => setMontoGasto(e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 12,
                      padding: "12px 14px",
                      fontSize: 15,
                      fontWeight: 900,
                      color: "white",
                      outline: "none",
                      fontFamily: "var(--font-nunito)",
                      appearance: "none",
                      MozAppearance: "textfield",
                      width: "100%",
                    } as React.CSSProperties}
                  />
                  <select
                    value={billeteraGasto}
                    onChange={(e) => setBilleteraGasto(e.target.value)}
                    style={{
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 12,
                      padding: "12px 14px",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "white",
                      outline: "none",
                      fontFamily: "var(--font-nunito)",
                      width: "100%",
                      cursor: "pointer",
                    }}
                  >
                    {billeteras.map(b => (
                      <option key={b.id} value={b.id} style={{ background: "#1B3A6B" }}>
                        {b.icono} {b.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={registrarGasto}
                  disabled={loadingGasto || !descGasto.trim() || !montoGasto || !billeteraGasto}
                  style={{
                    background: loadingGasto || !descGasto.trim() || !montoGasto
                      ? "rgba(239,68,68,0.3)"
                      : "rgba(239,68,68,0.8)",
                    color: "white",
                    borderRadius: 12,
                    padding: "13px",
                    fontSize: 14,
                    fontWeight: 900,
                    border: "none",
                    cursor: loadingGasto || !descGasto.trim() || !montoGasto ? "not-allowed" : "pointer",
                    fontFamily: "var(--font-nunito)",
                    transition: "background 0.2s",
                  }}
                >
                  {loadingGasto ? "Guardando..." : "Registrar gasto"}
                </button>
              </div>
            </div>
          )}

          {/* Lista gastos */}
          {gastos.length === 0 ? (
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
              Sin gastos registrados hoy
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {gastos.map(g => {
                const b = billeteras.find(x => x.id === g.billetera_id)
                return (
                  <div key={g.id} style={{
                    ...card,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}>
                    <div>
                      <p style={{ color: "white", fontSize: 14, fontWeight: 700 }}>{g.descripcion}</p>
                      <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 3 }}>
                        {formatHoraCO(g.created_at)} · {b ? `${b.icono} ${b.nombre}` : ""}
                      </p>
                    </div>
                    <p style={{ color: "#f87171", fontSize: 15, fontWeight: 900, flexShrink: 0, marginLeft: 12 }}>
                      -{formatCOP(g.monto)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── VENTAS DEL DÍA ── */}
        <div style={{ paddingBottom: 24 }}>
          <p style={seccionLabel}>Ventas del día</p>

          {ventas.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(255,255,255,0.25)" }}>
              <p style={{ fontSize: 36, marginBottom: 10 }}>🛒</p>
              <p style={{ fontSize: 14, fontWeight: 600 }}>Aún no hay ventas hoy</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ventas.map(v => {
                const m = METODOS[v.metodo_pago] || { icono: "💰", color: "#27B173" }
                const expandida = ventaExpandida === v.id
                return (
                  <div
                    key={v.id}
                    onClick={() => setVentaExpandida(expandida ? null : v.id)}
                    style={{
                      ...card,
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                  >
                    {/* Fila principal */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 24 }}>{m.icono}</span>
                        <div>
                          <p style={{ color: "white", fontSize: 15, fontWeight: 900 }}>
                            {formatCOP(v.total)}
                          </p>
                          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 2 }}>
                            {formatHoraCO(v.created_at)} · {v.venta_items.length} {v.venta_items.length === 1 ? "producto" : "productos"}
                          </p>
                        </div>
                      </div>
                      <span style={{
                        color: "rgba(255,255,255,0.3)",
                        fontSize: 18,
                        transform: expandida ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s",
                        display: "inline-block",
                      }}>
                        ▾
                      </span>
                    </div>

                    {/* Detalle expandido */}
                    {expandida && (
                      <div style={{
                        marginTop: 12,
                        paddingTop: 12,
                        borderTop: "1px solid rgba(255,255,255,0.08)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}>
                        {v.venta_items.map((item, i) => (
                          <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 13 }}>
                              {item.nombre_producto}
                              <span style={{ color: "rgba(255,255,255,0.35)" }}> × {item.cantidad}</span>
                            </p>
                            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 700 }}>
                              {formatCOP(item.subtotal)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>

      <NavBar />
    </div>
  )
}
