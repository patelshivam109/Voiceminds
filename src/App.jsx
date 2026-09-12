// src/App.jsx
import { useEffect, useState } from "react";
import "./index.css";
import "./App.css";

import Sidebar from "./components/Sidebar";
import ThemeToggle from "./components/ThemeToggle";
import Logo from "./components/Logo";

import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Library from "./pages/Library";
import GetStarted from "./pages/GetStarted";

import { useAuth } from "./contexts/AuthContext";

export default function App() {
  const [route, setRoute] = useState("landing"); // 'landing' | 'auth' | 'app'
  const [active, setActive] = useState("dashboard");
  const { auth, loading, login, logout, isAuthenticated } = useAuth();

  // Theme bootstrap
  useEffect(() => {
    const t = localStorage.getItem("theme") || "dark";
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  // Route management based on auth state
  useEffect(() => {
    if (loading) return; // Still checking auth

    if (isAuthenticated) {
      setRoute("app");
    } else {
      setRoute("landing");
    }
  }, [isAuthenticated, loading]);

  function handleLoginSuccess(session) {
    login(session.token, session.user);
    setRoute("app");
  }

  // Splash while we check token
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[color:var(--bg)] text-[color:var(--text)]">
        <div className="text-center">
          <div className="animate-pulse text-lg text-[color:var(--muted)]">Loading VoiceMind...</div>
        </div>
      </div>
    );
  }

  if (route === "landing") {
    return <Landing onEnterApp={() => setRoute("auth")} onGetStarted={() => setRoute("auth")} />;
  }

  if (route === "auth") {
    return (
      <Login
        onBack={() => setRoute("landing")}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // App shell (protected)
  function render() {
    switch (active) {
      case "dashboard":
        return <Dashboard onNavigate={setActive} />;
      case "quiz":
        return <div className="card fade-up">Recorder and upload UI - coming soon</div>;
      case "plan":
        return <div className="card fade-up">Therapy and coaching recommendations - coming soon</div>;
      case "library":
        return <Library onNavigate={setActive} onBack={() => setActive("dashboard")} />;
      case "settings":
        return <div className="card fade-up">Settings - coming soon</div>;
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar active={active} onNavigate={setActive} />
      <div className="flex-1 flex flex-col md:ml-[260px]">
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-4 md:px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {auth?.user && (
              <button className="btn btn-ghost focus-ring" onClick={logout}>
                Logout
              </button>
            )}
          </div>
        </header>
        <main className="p-4 md:p-6">{render()}</main>
      </div>
    </div>
  );
}