// src/components/ThemeToggle.jsx
import { useEffect, useState } from "react"

export default function ThemeToggle({ className = "" }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark")

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
    localStorage.setItem("theme", theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => (prev === "dark" ? "light" : "dark"))
  }

  return (
    <button
      type="button"
      className={`btn focus-ring ${className}`}
      onClick={toggleTheme}
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      <span className="hidden sm:inline">
        {theme === "dark" ? "Dark mode" : "Light mode"}
      </span>
      <span className="sm:hidden">
        {theme === "dark" ? "Dark" : "Light"}
      </span>
    </button>
  )
}
