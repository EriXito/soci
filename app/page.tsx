"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError("Correo o contraseña incorrectos")
      setLoading(false)
      return
    }

    window.location.href = "/dashboard"
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{ background: "#1B3A6B" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{
            color: "white",
            fontSize: 52,
            fontWeight: 900,
            letterSpacing: -2,
            lineHeight: 1,
            marginBottom: 8
          }}>
            SOCI
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 15 }}>
            Tu socio tecnológico
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(0,0,0,0.3)",
          borderRadius: 24,
          padding: "28px 24px",
          border: "1px solid rgba(255,255,255,0.08)"
        }}>
          <p style={{ color: "white", fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
            Entrar a tu tienda
          </p>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 24 }}>
            Ingresa con tu correo y contraseña
          </p>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600 }}>
                Correo
              </label>
              <input
                type="email"
                placeholder="tucorreo@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 14,
                  padding: "14px 16px",
                  fontSize: 15,
                  color: "white",
                  outline: "none",
                  width: "100%",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600 }}>
                Contraseña
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 14,
                  padding: "14px 16px",
                  fontSize: 15,
                  color: "white",
                  outline: "none",
                  width: "100%",
                }}
              />
            </div>

            {error && (
              <p style={{ color: "#f87171", fontSize: 14, textAlign: "center" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                background: loading ? "rgba(39,177,115,0.5)" : "#27B173",
                color: "white",
                borderRadius: 16,
                padding: "16px",
                fontSize: 16,
                fontWeight: 900,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                marginTop: 6,
                letterSpacing: -0.3,
              }}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>

          </form>
        </div>

        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, textAlign: "center", marginTop: 24 }}>
          ¿No tienes cuenta?{" "}
          <button
            onClick={() => router.push("/registro")}
            style={{
              background: "none",
              border: "none",
              color: "#4ade80",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "var(--font-nunito)",
              padding: 0,
            }}
          >
            Regístrate aquí
          </button>
        </p>

      </div>
    </div>
  )
}