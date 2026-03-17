"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 14,
  padding: "14px 16px",
  fontSize: 15,
  color: "white",
  outline: "none",
  width: "100%",
  fontFamily: "var(--font-nunito)",
  fontWeight: 600,
}

const inputErrorStyle: React.CSSProperties = {
  ...inputStyle,
  border: "1px solid rgba(248,113,113,0.6)",
  background: "rgba(248,113,113,0.06)",
}

const labelStyle: React.CSSProperties = {
  color: "rgba(255,255,255,0.6)",
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 6,
  display: "block",
}

function generarSlug(nombre: string): string {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 50)
}

export default function RegistroPage() {
  const router = useRouter()

  const [paso, setPaso] = useState<1 | 2>(1)

  // Paso 1
  const [nombreTienda, setNombreTienda] = useState("")
  const [telefono, setTelefono] = useState("")
  const [direccion, setDireccion] = useState("")

  // Paso 2
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [loading, setLoading] = useState(false)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useState("")

  const validarPaso1 = (): boolean => {
    const e: Record<string, string> = {}
    if (!nombreTienda.trim()) e.nombreTienda = "El nombre de la tienda es requerido"
    setErrores(e)
    return Object.keys(e).length === 0
  }

  const validarPaso2 = (): boolean => {
    const e: Record<string, string> = {}
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = "Ingresa un correo válido"
    if (password.length < 6)
      e.password = "La contraseña debe tener al menos 6 caracteres"
    if (password !== confirmPassword)
      e.confirmPassword = "Las contraseñas no coinciden"
    setErrores(e)
    return Object.keys(e).length === 0
  }

  const handleSiguiente = () => {
    if (validarPaso1()) setPaso(2)
  }

  const handleRegistrar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validarPaso2()) return

    setLoading(true)
    setErrorGeneral("")

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })

    if (authError) {
      setErrorGeneral(
        authError.message.includes("already registered")
          ? "Este correo ya tiene una cuenta. Inicia sesión."
          : "Ocurrió un error al crear la cuenta. Intenta de nuevo."
      )
      setLoading(false)
      return
    }

    const user = authData.user
    if (!user) {
      setErrorGeneral("Revisa tu correo para confirmar la cuenta y luego inicia sesión.")
      setLoading(false)
      return
    }

    // 2. Crear empresa
    const { data: empresa, error: empresaError } = await supabase
      .from("empresas")
      .insert({
        nombre: nombreTienda.trim(),
        slug: generarSlug(nombreTienda),
        telefono: telefono.trim() || null,
        direccion: direccion.trim() || null,
      })
      .select()
      .single()

    if (empresaError || !empresa) {
      setErrorGeneral("Error al crear la tienda. Intenta de nuevo.")
      setLoading(false)
      return
    }

    // 3. Crear perfil
    await supabase.from("perfiles").insert({
      id: user.id,
      empresa_id: empresa.id,
      nombre: nombreTienda.trim(),
      rol: "dueño",
    })

    // 4. Crear billeteras iniciales
    await supabase.from("billeteras").insert([
      { empresa_id: empresa.id, nombre: "Efectivo", saldo: 0, color: "#27B173", icono: "💵" },
      { empresa_id: empresa.id, nombre: "Nequi",    saldo: 0, color: "#7C6FF7", icono: "📲" },
      { empresa_id: empresa.id, nombre: "Daviplata", saldo: 0, color: "#E24B4A", icono: "💳" },
    ])

    // 5. Ir al dashboard (el onboarding aparecerá automáticamente)
    router.push("/dashboard")
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-5 py-10"
      style={{ background: "#1B3A6B" }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h1 style={{
            color: "white",
            fontSize: 48,
            fontWeight: 900,
            letterSpacing: -2,
            lineHeight: 1,
            marginBottom: 8,
          }}>
            SOCI
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 15 }}>
            Crea tu cuenta gratis
          </p>
        </div>

        {/* Indicador de pasos */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {[1, 2].map((p) => (
            <div
              key={p}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 4,
                background: p <= paso ? "#27B173" : "rgba(255,255,255,0.15)",
                transition: "background 0.3s",
              }}
            />
          ))}
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(0,0,0,0.3)",
          borderRadius: 24,
          padding: "28px 24px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}>

          {/* ── PASO 1: Datos de la tienda ── */}
          {paso === 1 && (
            <>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>
                Paso 1 de 2
              </p>
              <p style={{ color: "white", fontSize: 18, fontWeight: 900, marginBottom: 22 }}>
                Tu tienda
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                <div>
                  <label style={labelStyle}>Nombre de la tienda *</label>
                  <input
                    type="text"
                    placeholder="Ej: Tienda Doña Carmen"
                    value={nombreTienda}
                    onChange={(e) => {
                      setNombreTienda(e.target.value)
                      if (errores.nombreTienda) setErrores(prev => ({ ...prev, nombreTienda: "" }))
                    }}
                    autoFocus
                    style={errores.nombreTienda ? inputErrorStyle : inputStyle}
                  />
                  {errores.nombreTienda && (
                    <p style={{ color: "#f87171", fontSize: 12, marginTop: 5, fontWeight: 600 }}>
                      {errores.nombreTienda}
                    </p>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>Teléfono de contacto</label>
                  <input
                    type="tel"
                    placeholder="Ej: 300 123 4567"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={labelStyle}>Dirección</label>
                  <input
                    type="text"
                    placeholder="Ej: Cra 7 # 45-12, Bogotá"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    style={inputStyle}
                  />
                </div>

                <button
                  onClick={handleSiguiente}
                  style={{
                    background: "#27B173",
                    color: "white",
                    borderRadius: 16,
                    padding: "16px",
                    fontSize: 16,
                    fontWeight: 900,
                    border: "none",
                    cursor: "pointer",
                    marginTop: 6,
                    fontFamily: "var(--font-nunito)",
                    letterSpacing: -0.3,
                  }}
                >
                  Siguiente →
                </button>

              </div>
            </>
          )}

          {/* ── PASO 2: Crear cuenta ── */}
          {paso === 2 && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                <button
                  onClick={() => setPaso(1)}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "none",
                    borderRadius: 10,
                    padding: "6px 12px",
                    color: "rgba(255,255,255,0.5)",
                    fontSize: 16,
                    cursor: "pointer",
                  }}
                >
                  ←
                </button>
                <div>
                  <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
                    Paso 2 de 2
                  </p>
                </div>
              </div>
              <p style={{ color: "white", fontSize: 18, fontWeight: 900, marginBottom: 22, marginTop: 4 }}>
                Crear cuenta
              </p>

              <form onSubmit={handleRegistrar} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                <div>
                  <label style={labelStyle}>Correo electrónico *</label>
                  <input
                    type="email"
                    placeholder="tucorreo@gmail.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (errores.email) setErrores(prev => ({ ...prev, email: "" }))
                    }}
                    autoFocus
                    style={errores.email ? inputErrorStyle : inputStyle}
                  />
                  {errores.email && (
                    <p style={{ color: "#f87171", fontSize: 12, marginTop: 5, fontWeight: 600 }}>
                      {errores.email}
                    </p>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>Contraseña *</label>
                  <input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (errores.password) setErrores(prev => ({ ...prev, password: "" }))
                    }}
                    style={errores.password ? inputErrorStyle : inputStyle}
                  />
                  {errores.password && (
                    <p style={{ color: "#f87171", fontSize: 12, marginTop: 5, fontWeight: 600 }}>
                      {errores.password}
                    </p>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>Confirmar contraseña *</label>
                  <input
                    type="password"
                    placeholder="Repite tu contraseña"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (errores.confirmPassword) setErrores(prev => ({ ...prev, confirmPassword: "" }))
                    }}
                    style={errores.confirmPassword ? inputErrorStyle : inputStyle}
                  />
                  {errores.confirmPassword && (
                    <p style={{ color: "#f87171", fontSize: 12, marginTop: 5, fontWeight: 600 }}>
                      {errores.confirmPassword}
                    </p>
                  )}
                </div>

                {errorGeneral && (
                  <div style={{
                    background: "rgba(248,113,113,0.1)",
                    border: "1px solid rgba(248,113,113,0.3)",
                    borderRadius: 12,
                    padding: "12px 14px",
                  }}>
                    <p style={{ color: "#f87171", fontSize: 13, fontWeight: 600, textAlign: "center" }}>
                      {errorGeneral}
                    </p>
                  </div>
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
                    fontFamily: "var(--font-nunito)",
                    letterSpacing: -0.3,
                  }}
                >
                  {loading ? "Creando tu cuenta..." : "Crear mi cuenta"}
                </button>

              </form>
            </>
          )}

        </div>

        {/* Enlace a login */}
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, textAlign: "center", marginTop: 24 }}>
          ¿Ya tienes cuenta?{" "}
          <button
            onClick={() => router.push("/")}
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
            Inicia sesión
          </button>
        </p>

      </div>
    </div>
  )
}
