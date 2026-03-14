"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

interface Billetera {
  id: string
  nombre: string
  saldo: number
  color: string
  icono: string
}

interface Producto {
  id: string
  nombre: string
  marca: string
  stock_actual: number
  stock_minimo: number
  precio_venta: number
}

const formatCOP = (valor: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor)

export default function DashboardPage() {
  const router = useRouter()
  const [billeteras, setBilleteras] = useState<Billetera[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [empresaNombre, setEmpresaNombre] = useState("")
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState("")

  useEffect(() => {
    const cargarDatos = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/"); return }

      const { data: perfil } = await supabase
        .from("perfiles")
        .select("empresa_id, empresas(nombre)")
        .eq("id", user.id)
        .single()

      if (!perfil) { router.push("/"); return }

      const empresaId = perfil.empresa_id
      setEmpresaNombre((perfil.empresas as any)?.nombre || "Mi Tienda")

      const { data: billeterasData } = await supabase
        .from("billeteras").select("*").eq("empresa_id", empresaId)

      const { data: productosData } = await supabase
        .from("productos").select("*")
        .eq("empresa_id", empresaId)
        .eq("activo", true)
        .order("stock_actual", { ascending: true })

      setBilleteras(billeterasData || [])
      setProductos(productosData || [])
      setLoading(false)
    }
    cargarDatos()
  }, [router])

  const totalSaldos = billeteras.reduce((acc, b) => acc + b.saldo, 0)

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.marca.toLowerCase().includes(busqueda.toLowerCase())
  )

  const getStockStatus = (p: Producto) => {
    if (p.stock_actual <= 1) return "critico"
    if (p.stock_actual <= p.stock_minimo) return "bajo"
    return "ok"
  }

  const hoy = new Date().toLocaleDateString("es-CO", {
    weekday: "long", day: "numeric", month: "long"
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1B3A6B" }}>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 16 }}>Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: "#1B3A6B" }}>

      {/* Header */}
      <div className="px-5 pt-10 pb-5 max-w-lg mx-auto">
        <div className="flex items-start justify-between">
          <div>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, textTransform: "capitalize" }}>{hoy}</p>
            <h1 style={{ color: "white", fontSize: 22, fontWeight: 900, letterSpacing: -0.5, marginTop: 2 }}>
              {empresaNombre}
            </h1>
          </div>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = "/" }}
            style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, marginTop: 4 }}
          >
            Salir
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div className="px-5 max-w-lg mx-auto mb-5">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2" style={{ fontSize: 16 }}>🔍</span>
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
              fontWeight: 500,
              color: "white",
              background: "rgba(0,0,0,0.25)",
              border: "1px solid rgba(255,255,255,0.1)",
              outline: "none",
            }}
          />
        </div>
      </div>

      <div className="px-5 max-w-lg mx-auto flex flex-col gap-5">

        {/* Card total */}
        <div style={{
          background: "rgba(0,0,0,0.3)",
          borderRadius: 24,
          padding: "20px 22px",
          border: "1px solid rgba(255,255,255,0.08)"
        }}>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
            Total en caja hoy
          </p>
          <p style={{ color: "white", fontSize: 38, fontWeight: 900, letterSpacing: -1, margin: "6px 0 4px" }}>
            {formatCOP(totalSaldos)}
          </p>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
            Suma de todos los bolsillos
          </p>
        </div>

        {/* Billeteras */}
        <div>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
            Mis bolsillos
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {billeteras.map((b) => (
              <div key={b.id} style={{
                background: "rgba(0,0,0,0.3)",
                borderRadius: 20,
                padding: "16px 10px",
                textAlign: "center",
                border: "1px solid rgba(255,255,255,0.08)",
                borderTop: `3px solid ${b.color}`,
              }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{b.icono}</div>
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

        {/* Inventario */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
              Inventario
            </p>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
              {productosFiltrados.length} productos
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {productosFiltrados.map((p) => {
              const status = getStockStatus(p)
              return (
                <div key={p.id} style={{
                  background: status === "critico" ? "rgba(127,29,29,0.5)" : "rgba(0,0,0,0.3)",
                  borderRadius: 20,
                  padding: "16px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  border: status === "critico"
                    ? "1px solid rgba(239,68,68,0.4)"
                    : "1px solid rgba(255,255,255,0.08)",
                }}>
                  <div>
                    <p style={{ color: "white", fontSize: 15, fontWeight: 700, marginBottom: 3 }}>{p.nombre}</p>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>{p.marca}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ color: "white", fontSize: 15, fontWeight: 900, marginBottom: 4 }}>
                      {formatCOP(p.precio_venta)}
                    </p>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 12,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 20,
                      background: status === "ok"
                        ? "rgba(39,177,115,0.2)"
                        : status === "bajo"
                        ? "rgba(245,166,35,0.2)"
                        : "rgba(239,68,68,0.2)",
                      color: status === "ok" ? "#4ade80"
                        : status === "bajo" ? "#fbbf24"
                        : "#f87171",
                    }}>
                      <span style={{
                        width: 7, height: 7, borderRadius: "50%",
                        background: status === "ok" ? "#4ade80"
                          : status === "bajo" ? "#fbbf24" : "#f87171",
                        display: "inline-block"
                      }} />
                      {p.stock_actual} uds
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>

      {/* Botón registrar venta */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        padding: "12px 20px 28px",
        background: "#1B3A6B",
        borderTop: "1px solid rgba(255,255,255,0.08)"
      }}>
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => router.push("/venta")}
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
              letterSpacing: -0.3,
            }}
          >
            + Registrar Venta
          </button>
        </div>
      </div>

    </div>
  )
}