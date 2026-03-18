"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { syncVentaSheets, syncProductoSheets } from "@/lib/syncSheets"
import BotonVoz from "@/app/components/BotonVoz"

interface Producto {
  id: string
  nombre: string
  marca: string
  precio_venta: number
  precio_compra: number
  stock_actual: number
  stock_minimo: number
}

const formatCOP = (valor: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor)

export default function VentaPage() {
  const router = useRouter()
  const [paso, setPaso] = useState<1 | 2>(1)
  const [productos, setProductos] = useState<Producto[]>([])
  const [carrito, setCarrito] = useState<Record<string, number>>({})
  const [busqueda, setBusqueda] = useState("")
  const [empresaId, setEmpresaId] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingDatos, setLoadingDatos] = useState(true)
  const [recibido, setRecibido] = useState("")
  const [inputTemp, setInputTemp] = useState<Record<string, string>>({})
  const [showModalCrear, setShowModalCrear] = useState(false)
  const [nombreNuevo, setNombreNuevo] = useState("")
  const [precioNuevo, setPrecioNuevo] = useState("")
  const [loadingCrear, setLoadingCrear] = useState(false)
  const [vozMensaje, setVozMensaje] = useState("")

  const handleProductosVoz = (items: { producto_id: string; cantidad: number }[]) => {
    let agregados = 0
    setCarrito(prev => {
      const next = { ...prev }
      items.forEach(item => {
        if (productos.find(p => p.id === item.producto_id)) {
          next[item.producto_id] = (next[item.producto_id] || 0) + item.cantidad
          agregados++
        }
      })
      return next
    })
    setInputTemp(prev => {
      const next = { ...prev }
      items.forEach(item => {
        if (productos.find(p => p.id === item.producto_id)) {
          next[item.producto_id] = String((parseInt(prev[item.producto_id] || "0")) + item.cantidad)
        }
      })
      return next
    })
    setVozMensaje(agregados > 0 ? `✓ ${agregados} producto${agregados > 1 ? "s" : ""} agregado${agregados > 1 ? "s" : ""} al carrito` : "No se encontraron productos")
    setTimeout(() => setVozMensaje(""), 3000)
  }

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

      const { data: productosData } = await supabase
        .from("productos")
        .select("*")
        .eq("empresa_id", perfil.empresa_id)
        .eq("activo", true)
        .order("nombre")

      setProductos(productosData || [])
      setLoadingDatos(false)
    }
    cargar()
  }, [router])

  const productosFiltrados = productos.filter((p) =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.marca.toLowerCase().includes(busqueda.toLowerCase())
  )

  const totalCarrito = Object.entries(carrito).reduce((acc, [id, cantidad]) => {
    const producto = productos.find(p => p.id === id)
    return acc + (producto ? producto.precio_venta * cantidad : 0)
  }, 0)

  const itemsEnCarrito = Object.values(carrito).reduce((acc, c) => acc + c, 0)

  const recibidoNum = parseFloat(recibido || "0")
  const vueltas = recibidoNum - totalCarrito

const cambiarCantidad = (producto: Producto, delta: number) => {
  setCarrito(prev => {
    const actual = prev[producto.id] || 0
    const nueva = actual + delta
    if (nueva <= 0) {
      const next = { ...prev }
      delete next[producto.id]
      setInputTemp(prevT => {
        const next2 = { ...prevT }
        delete next2[producto.id]
        return next2
      })
      return next
    }
    // stock_actual === 0 significa venta libre (sin límite de stock)
    if (producto.stock_actual > 0 && nueva > producto.stock_actual) return prev
    setInputTemp(prevT => ({ ...prevT, [producto.id]: String(nueva) }))
    return { ...prev, [producto.id]: nueva }
  })
}
  const setCantidadDirecta = (producto: Producto, val: string) => {
  setInputTemp(prev => ({ ...prev, [producto.id]: val }))
  if (val === "") return
  const num = parseInt(val)
  if (!isNaN(num) && num > 0 && num <= producto.stock_actual) {
    setCarrito(prev => ({ ...prev, [producto.id]: num }))
  } else if (!isNaN(num) && num > producto.stock_actual) {
    setInputTemp(prev => ({ ...prev, [producto.id]: String(producto.stock_actual) }))
    setCarrito(prev => ({ ...prev, [producto.id]: producto.stock_actual }))
  }
}

const confirmarInputTemp = (producto: Producto) => {
  const val = inputTemp[producto.id]
  if (!val || val === "" || parseInt(val) <= 0) {
    setInputTemp(prev => ({ ...prev, [producto.id]: String(carrito[producto.id] || 1) }))
  }
}

  const crearYVender = async () => {
    const precio = parseFloat(precioNuevo)
    if (!nombreNuevo.trim() || isNaN(precio) || precio <= 0 || !empresaId) return
    setLoadingCrear(true)

    const { data: nuevo } = await supabase
      .from("productos")
      .insert({
        empresa_id: empresaId,
        nombre: nombreNuevo.trim(),
        marca: "",
        precio_venta: precio,
        precio_compra: 0,
        stock_actual: 0,
        stock_minimo: 0,
        activo: true,
      })
      .select()
      .single()

    setLoadingCrear(false)
    if (!nuevo) return

    // Sincronizar nuevo producto con Google Sheets (fire-and-forget)
    syncProductoSheets(empresaId, {
      nombre: nuevo.nombre,
      marca: "",
      precio_compra: 0,
      precio_venta: nuevo.precio_venta,
      stock_actual: 0,
      stock_minimo: 0,
    })

    setProductos(prev => [...prev, nuevo])
    setCarrito(prev => ({ ...prev, [nuevo.id]: 1 }))
    setInputTemp(prev => ({ ...prev, [nuevo.id]: "1" }))
    setShowModalCrear(false)
    setBusqueda("")
  }

  const confirmarVenta = async (metodoPago: string) => {
    if (totalCarrito === 0 || !empresaId) return
    setLoading(true)

    const { data: venta } = await supabase
      .from("ventas")
      .insert({ empresa_id: empresaId, total: totalCarrito, metodo_pago: metodoPago })
      .select()
      .single()

    if (!venta) { setLoading(false); return }

    const items = Object.entries(carrito).map(([id, cantidad]) => {
      const producto = productos.find(p => p.id === id)!
      return {
        venta_id: venta.id,
        producto_id: id,
        nombre_producto: producto.nombre,
        cantidad,
        precio_unitario: producto.precio_venta,
        subtotal: producto.precio_venta * cantidad,
      }
    })

    await supabase.from("venta_items").insert(items)

    for (const [id, cantidad] of Object.entries(carrito)) {
      const producto = productos.find(p => p.id === id)!
      await supabase
        .from("productos")
        .update({ stock_actual: producto.stock_actual - cantidad })
        .eq("id", id)
    }

    const { data: billetera } = await supabase
      .from("billeteras")
      .select("id, saldo")
      .eq("empresa_id", empresaId)
      .ilike("nombre", `%${metodoPago}%`)
      .single()

    if (billetera) {
      await supabase
        .from("billeteras")
        .update({ saldo: billetera.saldo + totalCarrito })
        .eq("id", billetera.id)
    }

    // Sincronizar con Google Sheets (fire-and-forget)
    syncVentaSheets(
      empresaId,
      { venta_id: venta.id, total: totalCarrito, metodo_pago: metodoPago },
      items.map(i => ({
        nombre_producto: i.nombre_producto,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        subtotal: i.subtotal,
      }))
    )

    setLoading(false)
    router.push("/dashboard")
  }

  if (loadingDatos) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1B3A6B" }}>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 16 }}>Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-36" style={{ background: "#1B3A6B" }}>

      {/* Header */}
      <div className="px-5 pt-10 pb-4 max-w-lg mx-auto">
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
          <button
            onClick={() => paso === 1 ? router.push("/dashboard") : setPaso(1)}
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
              Registrar venta
            </p>
            <p style={{ color: "white", fontSize: 18, fontWeight: 900 }}>
              {paso === 1 ? "¿Qué vendiste?" : "¿Cómo te pagaron?"}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[1, 2].map((p) => (
            <div key={p} style={{
              flex: 1, height: 4, borderRadius: 4,
              background: p <= paso ? "#27B173" : "rgba(255,255,255,0.15)",
              transition: "background 0.3s"
            }} />
          ))}
        </div>
      </div>

      {/* PASO 1 */}
      {paso === 1 && (
        <div className="px-5 max-w-lg mx-auto">

          {/* Botón dictado por voz */}
          <BotonVoz
            productos={productos}
            empresaId={empresaId}
            onProductosIdentificados={handleProductosVoz}
          />

          {/* Toast voz */}
          {vozMensaje && (
            <div style={{
              background: "rgba(39,177,115,0.15)",
              border: "1px solid rgba(39,177,115,0.35)",
              borderRadius: 14,
              padding: "10px 16px",
              marginBottom: 12,
              color: "#27B173",
              fontSize: 13,
              fontWeight: 700,
              textAlign: "center",
            }}>
              {vozMensaje}
            </div>
          )}

          <div style={{ position: "relative", marginBottom: 16 }}>
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

          {busqueda.length > 0 && productosFiltrados.length === 0 && (
            <button
              onClick={() => { setNombreNuevo(busqueda); setPrecioNuevo(""); setShowModalCrear(true) }}
              style={{
                width: "100%",
                background: "rgba(39,177,115,0.12)",
                border: "2px dashed rgba(39,177,115,0.5)",
                borderRadius: 20,
                padding: "22px 20px",
                color: "#4ade80",
                fontSize: 16,
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: "var(--font-nunito)",
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              ＋ Crear y vender &quot;{busqueda}&quot;
            </button>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {productosFiltrados.map((p) => {
              const cantidad = carrito[p.id] || 0
              const enCarrito = cantidad > 0
              return (
                <div
                  key={p.id}
                  style={{
                    background: enCarrito ? "rgba(39,177,115,0.15)" : "rgba(0,0,0,0.3)",
                    borderRadius: 20,
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    border: enCarrito ? "1px solid rgba(39,177,115,0.4)" : "1px solid rgba(255,255,255,0.08)",
                    transition: "all 0.2s",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                    <p style={{ color: "white", fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{p.nombre}</p>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
                      {formatCOP(p.precio_venta)} · {p.stock_actual > 0 ? `${p.stock_actual} en stock` : "Venta libre"}
                    </p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {enCarrito && (
                      <button
                        onClick={() => cambiarCantidad(p, -1)}
                        style={{
                          width: 36, height: 36, borderRadius: "50%",
                          background: "rgba(239,68,68,0.2)",
                          border: "1px solid rgba(239,68,68,0.3)",
                          color: "#f87171", fontSize: 20, fontWeight: 900,
                          cursor: "pointer", display: "flex",
                          alignItems: "center", justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        −
                      </button>
                    )}
                    {enCarrito && (
                      <input
  type="number"
  value={inputTemp[p.id] ?? String(cantidad)}
  onChange={(e) => setCantidadDirecta(p, e.target.value)}
  onBlur={() => confirmarInputTemp(p)}
  onWheel={(e) => e.currentTarget.blur()}
  style={{
    width: 48,
    textAlign: "center",
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.2)",
    borderRadius: 10,
    color: "white",
    fontSize: 18,
    fontWeight: 900,
    padding: "6px 0",
    fontFamily: "var(--font-nunito)",
    outline: "none",
    appearance: "none",
    MozAppearance: "textfield",
  } as React.CSSProperties}
/>
                    )}
                    <button
                      onClick={() => cambiarCantidad(p, 1)}
                      style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: "rgba(39,177,115,0.2)",
                        border: "1px solid rgba(39,177,115,0.4)",
                        color: "#4ade80", fontSize: 20, fontWeight: 900,
                        cursor: "pointer", display: "flex",
                        alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* PASO 2 */}
      {paso === 2 && (
        <div className="px-5 max-w-lg mx-auto flex flex-col gap-4">

          <div style={{
            background: "rgba(0,0,0,0.3)", borderRadius: 20,
            padding: "16px 18px", border: "1px solid rgba(255,255,255,0.08)"
          }}>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
              Resumen
            </p>
            {Object.entries(carrito).map(([id, cant]) => {
              const prod = productos.find(p => p.id === id)!
              return (
                <div key={id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>{prod.nombre} × {cant}</p>
                  <p style={{ color: "white", fontSize: 14, fontWeight: 700 }}>{formatCOP(prod.precio_venta * cant)}</p>
                </div>
              )
            })}
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", marginTop: 10, paddingTop: 10, display: "flex", justifyContent: "space-between" }}>
              <p style={{ color: "white", fontSize: 16, fontWeight: 800 }}>Total</p>
              <p style={{ color: "#4ade80", fontSize: 20, fontWeight: 900 }}>{formatCOP(totalCarrito)}</p>
            </div>
          </div>

          <div style={{
            background: "rgba(0,0,0,0.3)", borderRadius: 20,
            padding: "16px 18px", border: "1px solid rgba(255,255,255,0.08)"
          }}>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>
              ¿Cuánto te dieron?
            </p>
            <input
              type="number"
              placeholder="Ej: 50000"
              value={recibido}
              onChange={(e) => setRecibido(e.target.value)}
              onWheel={(e) => e.currentTarget.blur()}
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 14,
                padding: "14px 16px",
                fontSize: 22,
                fontWeight: 900,
                color: "white",
                outline: "none",
                fontFamily: "var(--font-nunito)",
                appearance: "none",
                MozAppearance: "textfield",
              } as React.CSSProperties}
            />
            {recibidoNum > 0 && (
              <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>Vueltas</p>
                <p style={{ fontSize: 22, fontWeight: 900, color: vueltas >= 0 ? "#4ade80" : "#f87171" }}>
                  {vueltas >= 0 ? formatCOP(vueltas) : "⚠️ Falta " + formatCOP(Math.abs(vueltas))}
                </p>
              </div>
            )}
          </div>

          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", textAlign: "center" }}>
            ¿Cómo te pagaron?
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { nombre: "Efectivo", metodo: "efectivo", color: "#27B173", icono: "💵" },
              { nombre: "Nequi", metodo: "nequi", color: "#7C6FF7", icono: "📲" },
              { nombre: "Daviplata", metodo: "daviplata", color: "#E24B4A", icono: "💳" },
            ].map((m) => (
              <button
                key={m.metodo}
                onClick={() => confirmarVenta(m.metodo)}
                disabled={loading}
                style={{
                  background: "rgba(0,0,0,0.3)",
                  border: `2px solid ${m.color}`,
                  borderRadius: 20,
                  padding: "18px 24px",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                  width: "100%",
                }}
              >
                <span style={{ fontSize: 28 }}>{m.icono}</span>
                <span style={{ color: "white", fontSize: 18, fontWeight: 900, fontFamily: "var(--font-nunito)" }}>
                  {loading ? "Guardando..." : m.nombre}
                </span>
                <span style={{ marginLeft: "auto", color: m.color, fontSize: 18, fontWeight: 900, fontFamily: "var(--font-nunito)" }}>
                  {formatCOP(totalCarrito)}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modal crear producto */}
      {showModalCrear && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,0.65)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          padding: "0 0 0 0",
        }}
          onClick={() => setShowModalCrear(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 480,
              background: "#1B3A6B",
              borderRadius: "24px 24px 0 0",
              padding: "28px 24px 40px",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 18 }}>
              Nuevo producto
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Nombre</p>
                <input
                  type="text"
                  value={nombreNuevo}
                  onChange={(e) => setNombreNuevo(e.target.value)}
                  autoFocus
                  style={{
                    width: "100%",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 14,
                    padding: "14px 16px",
                    fontSize: 16,
                    fontWeight: 700,
                    color: "white",
                    outline: "none",
                    fontFamily: "var(--font-nunito)",
                  }}
                />
              </div>
              <div>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Precio de venta</p>
                <input
                  type="number"
                  placeholder="Ej: 2500"
                  value={precioNuevo}
                  onChange={(e) => setPrecioNuevo(e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  style={{
                    width: "100%",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 14,
                    padding: "14px 16px",
                    fontSize: 22,
                    fontWeight: 900,
                    color: "white",
                    outline: "none",
                    fontFamily: "var(--font-nunito)",
                    appearance: "none",
                    MozAppearance: "textfield",
                  } as React.CSSProperties}
                />
              </div>
              <button
                onClick={crearYVender}
                disabled={loadingCrear || !nombreNuevo.trim() || !precioNuevo}
                style={{
                  marginTop: 8,
                  width: "100%",
                  background: loadingCrear || !nombreNuevo.trim() || !precioNuevo ? "rgba(39,177,115,0.4)" : "#27B173",
                  color: "white",
                  borderRadius: 16,
                  padding: "16px",
                  fontSize: 16,
                  fontWeight: 900,
                  border: "none",
                  cursor: loadingCrear || !nombreNuevo.trim() || !precioNuevo ? "not-allowed" : "pointer",
                  fontFamily: "var(--font-nunito)",
                }}
              >
                {loadingCrear ? "Guardando..." : "Agregar al carrito"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer fijo paso 1 */}
      {paso === 1 && itemsEnCarrito > 0 && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          padding: "12px 20px 28px",
          background: "#1B3A6B",
          borderTop: "1px solid rgba(255,255,255,0.08)"
        }}>
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => setPaso(2)}
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
              Cobrar {formatCOP(totalCarrito)} · {itemsEnCarrito} {itemsEnCarrito === 1 ? "item" : "items"}
            </button>
          </div>
        </div>
      )}

    </div>
  )
  
}

