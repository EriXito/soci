"use client"

import { useEffect, useState } from "react"
import { obtenerVentasPendientes } from "@/lib/offline"

export default function IndicadorOffline() {
  const [online, setOnline] = useState(true)
  const [pendientes, setPendientes] = useState(0)

  const actualizarPendientes = async () => {
    try {
      const ventas = await obtenerVentasPendientes()
      setPendientes(ventas.length)
    } catch {
      setPendientes(0)
    }
  }

  useEffect(() => {
    // Estado inicial
    setOnline(navigator.onLine)
    actualizarPendientes()

    const handleOffline = () => { setOnline(false); actualizarPendientes() }
    const handleOnline = () => { setOnline(true); actualizarPendientes() }

    window.addEventListener("offline", handleOffline)
    window.addEventListener("online", handleOnline)

    // Revisar pendientes periódicamente mientras está offline
    const intervalo = setInterval(actualizarPendientes, 5000)

    return () => {
      window.removeEventListener("offline", handleOffline)
      window.removeEventListener("online", handleOnline)
      clearInterval(intervalo)
    }
  }, [])

  if (online && pendientes === 0) return null

  const texto = online
    ? `Sincronizando ${pendientes} venta${pendientes > 1 ? "s" : ""} pendiente${pendientes > 1 ? "s" : ""}...`
    : pendientes > 0
      ? `Sin internet — ${pendientes} venta${pendientes > 1 ? "s" : ""} guardada${pendientes > 1 ? "s" : ""} localmente`
      : "Sin internet — las ventas se guardan localmente"

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0, right: 0,
      height: 36,
      background: online ? "#27B173" : "#E24B4A",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      zIndex: 50,
      transition: "background 0.3s",
    }}>
      <span style={{ fontSize: 14 }}>{online ? "🔄" : "📵"}</span>
      <p style={{
        color: "white",
        fontSize: 12,
        fontWeight: 700,
        margin: 0,
        fontFamily: "var(--font-nunito)",
      }}>
        {texto}
      </p>
    </div>
  )
}
