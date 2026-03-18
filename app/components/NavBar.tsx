"use client"

import { usePathname, useRouter } from "next/navigation"

const TABS = [
  { label: "Inicio", icon: "🏠", href: "/dashboard" },
  { label: "Inventario", icon: "📦", href: "/inventario" },
  { label: "Caja", icon: "🧾", href: "/caja" },
  { label: "Reportes", icon: "📊", href: "/reportes" },
]

export default function NavBar() {
  const pathname = usePathname()
  const router = useRouter()

  return (
    <nav style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      height: 64,
      background: "#0F2D5A",
      borderTop: "1px solid rgba(255,255,255,0.09)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-around",
      zIndex: 40,
      paddingBottom: "env(safe-area-inset-bottom)",
    }}>
      {TABS.map(tab => {
        const active = pathname === tab.href
        return (
          <button
            key={tab.href}
            onClick={() => router.push(tab.href)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "8px 18px",
              minWidth: 64,
              minHeight: 56,
              justifyContent: "center",
            }}
          >
            <span style={{ fontSize: 24, lineHeight: 1 }}>{tab.icon}</span>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: active ? "#27B173" : "rgba(255,255,255,0.38)",
              fontFamily: "var(--font-nunito)",
              letterSpacing: 0.2,
              transition: "color 0.15s",
            }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
