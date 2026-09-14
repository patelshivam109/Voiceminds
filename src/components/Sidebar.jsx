// src/components/Sidebar.jsx
import { useState } from "react"

const NAV_ITEMS = [
  { id: "dashboard", icon: "📊", label: "Dashboard" },
  { id: "library", icon: "📚", label: "Library" },
  { id: "settings", icon: "⚙️", label: "Settings" },
]

export default function Sidebar({ active, onNavigate }) {
  const [isOpen, setIsOpen] = useState(false)

  const Item = ({ id, icon, label }) => (
    <button
      onClick={() => {
        onNavigate(id)
        setIsOpen(false)
      }}
      className={`flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200
        ${
          active === id
            ? "text-white bg-white/10 shadow-sm"
            : "text-[color:var(--muted)] hover:text-[color:var(--text)] hover:bg-white/5"
        }`}
    >
      <span className="text-xl">{icon}</span>
      <span className="font-medium">{label}</span>
    </button>
  )

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="md:hidden fixed bottom-4 right-4 z-50 p-3 rounded-full shadow-lg"
        style={{ background: "var(--primary)" }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle navigation"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:fixed inset-y-0 left-0 z-30 h-screen w-[260px] transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } flex flex-col border-r border-white/10 bg-[color:var(--bg)]`}
      >
        <div className="flex flex-col h-full p-4">
          <div className="flex items-center justify-between md:hidden mb-4">
            <div className="font-semibold tracking-tight">Navigation</div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md hover:bg-white/10"
              aria-label="Close navigation"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="hidden md:block font-semibold tracking-tight mb-6">
            Navigation
          </div>

          <div className="flex-1 flex flex-col gap-2">
            {NAV_ITEMS.map((item) => (
              <Item key={item.id} {...item} />
            ))}
          </div>
          
          <div className="mt-auto pt-4 border-t border-white/10">
            <div className="card p-3">
              <div className="text-xs text-[color:var(--muted)] mb-1">VoiceMind</div>
              <div className="text-xs">Emotion Analysis Tool</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}