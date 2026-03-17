"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import NavBar from "@/app/components/NavBar"

export default function PerfilPage() {
  const router = useRouter()
  const [empresaNombre, setEmpresaNombre] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cargar = async () => {
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
      setLoading(false)
    }
    cargar()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1B3A6B" }}>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 16 }}>Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: "#1B3A6B" }}>

      {/* Header */}
      <div className="px-5 pt-10 pb-6 max-w-lg mx-auto">
        <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
          Mi cuenta
        </p>
        <p style={{ color: "white", fontSize: 22, fontWeight: 900, marginTop: 2 }}>
          Perfil
        </p>
      </div>

      <div className="px-5 max-w-lg mx-auto" style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Nombre de tienda */}
        <div style={{
          background: "rgba(0,0,0,0.3)",
          borderRadius: 20,
          padding: "20px 22px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            Mi tienda
          </p>
          <p style={{ color: "white", fontSize: 24, fontWeight: 900, letterSpacing: -0.5 }}>
            {empresaNombre}
          </p>
        </div>

        {/* Correo */}
        <div style={{
          background: "rgba(0,0,0,0.3)",
          borderRadius: 20,
          padding: "20px 22px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            Correo
          </p>
          <p style={{ color: "white", fontSize: 15, fontWeight: 700 }}>
            {email}
          </p>
        </div>

        {/* Versión */}
        <div style={{
          background: "rgba(0,0,0,0.15)",
          borderRadius: 20,
          padding: "16px 22px",
          border: "1px solid rgba(255,255,255,0.05)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, fontWeight: 600 }}>SOCI</p>
          <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 13 }}>v1.0</p>
        </div>

        {/* Cerrar sesión */}
        <button
          onClick={async () => {
            await supabase.auth.signOut()
            router.push("/")
          }}
          style={{
            marginTop: 8,
            width: "100%",
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(239,68,68,0.35)",
            borderRadius: 20,
            padding: "18px",
            color: "#f87171",
            fontSize: 16,
            fontWeight: 900,
            cursor: "pointer",
            fontFamily: "var(--font-nunito)",
          }}
        >
          Cerrar sesión
        </button>

      </div>

      <NavBar />
    </div>
  )
}
