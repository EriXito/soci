"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function NuevaContrasenaPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmar, setConfirmar] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password.length < 6) {
      setError("La contraseña debe tener mínimo 6 caracteres")
      return
    }
    if (password !== confirmar) {
      setError("Las contraseñas no coinciden")
      return
    }

    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (err) {
      setError("No pudimos actualizar la contraseña. El enlace puede haber expirado.")
    } else {
      router.push("/dashboard")
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(0,0,0,0.25)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 14,
    padding: "14px 16px",
    fontSize: 15,
    color: "white",
    outline: "none",
    fontFamily: "var(--font-nunito)",
    boxSizing: "border-box",
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#1B3A6B",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 20px",
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{
          background: "rgba(0,0,0,0.3)",
          borderRadius: 24,
          padding: "32px 28px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
          <p style={{ fontSize: 40, textAlign: "center", marginBottom: 16 }}>🔑</p>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4, textAlign: "center" }}>
            Nueva contraseña
          </p>
          <p style={{ color: "white", fontSize: 22, fontWeight: 900, marginBottom: 24, textAlign: "center" }}>
            Elige una contraseña nueva
          </p>

          <form onSubmit={guardar} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                Nueva contraseña
              </p>
              <input
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                Confirmar contraseña
              </p>
              <input
                type="password"
                placeholder="Repite la contraseña"
                value={confirmar}
                onChange={e => setConfirmar(e.target.value)}
                style={inputStyle}
              />
            </div>

            {error && (
              <p style={{ color: "#f87171", fontSize: 13, fontWeight: 600 }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: loading ? "rgba(39,177,115,0.5)" : "#27B173",
                border: "none",
                borderRadius: 14,
                padding: "16px",
                color: "white",
                fontSize: 16,
                fontWeight: 900,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "var(--font-nunito)",
                transition: "background 0.2s",
              }}
            >
              {loading ? "Guardando..." : "Guardar nueva contraseña"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
