// src/pages/Login.jsx
import { loginReq, registerReq, setToken } from '../lib/api'
import ThemeToggle from "../components/ThemeToggle"
import logo from "../assets/logo.png"
import { useEffect, useMemo, useRef, useState } from "react"

function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.826 31.64 29.316 35 24 35c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.153 7.961 3.039l5.657-5.657C34.642 5.057 29.567 3 24 3 12.955 3 4 11.955 4 23s8.955 20 20 20 20-8.955 20-20c0-1.34-.138-2.646-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.818C14.406 16.018 18.77 13 24 13c3.059 0 5.842 1.153 7.961 3.039l5.657-5.657C34.642 5.057 29.567 3 24 3 16.318 3 9.73 7.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 43c5.243 0 10.034-2.01 13.6-5.291l-6.271-5.3C29.306 34.453 26.824 35 24 35c-5.292 0-9.783-3.387-11.387-8.096l-6.53 5.028C9.46 38.884 16.18 43 24 43z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.063 3.036-3.27 5.58-6.272 7.009l.001.001 6.271 5.3c-.444.408 8.697-5.062 8.697-16.31 0-1.34-.138-2.646-.389-3.917z"/>
    </svg>
  )
}

export default function Login({ onLoginSuccess, onBack }) {
  const [mode, setMode] = useState("login") // 'login' | 'register'
  const isLogin = mode === "login"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [audioActive, setAudioActive] = useState(false)
  const [error, setError] = useState("")

  const canSubmit = isLogin
    ? email && password && !loading
    : name && email && password && confirm && password === confirm && !loading

  // Enhanced tilt effect with more sensitivity
  const containerRef = useRef(null)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 })
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onMove = (e) => {
      const r = el.getBoundingClientRect()
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height
      setTilt({ rx: dy * -8, ry: dx * 10 })
    }
    const onLeave = () => setTilt({ rx: 0, ry: 0 })
    el.addEventListener("mousemove", onMove)
    el.addEventListener("mouseleave", onLeave)
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave)
    }
  }, [])

  // Activate audio animation on focus
  useEffect(() => {
    const inputs = document.querySelectorAll('input');
    const activateAudio = () => setAudioActive(true);
    const deactivateAudio = () => setAudioActive(false);
    
    inputs.forEach(input => {
      input.addEventListener('focus', activateAudio);
      input.addEventListener('blur', deactivateAudio);
    });
    
    return () => {
      inputs.forEach(input => {
        input.removeEventListener('focus', activateAudio);
        input.removeEventListener('blur', deactivateAudio);
      });
    };
  }, [mode]);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      let data;
      
      if (isLogin) {
        console.log("Attempting login with:", email);
        data = await loginReq(email, password);
      } else {
        if (password !== confirm) {
          throw new Error("Passwords do not match");
        }
        console.log("Attempting registration with:", email);
        data = await registerReq(name, email, password);
      }
      
      // Store token in localStorage using the setToken function
      console.log("Storing token in localStorage");
      setToken(data.token);
      
      // Call onLoginSuccess with the session data
      onLoginSuccess?.({ token: data.token, user: data.user });
    } catch (err) {
      console.error("Authentication error:", err);
      setError(err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  // Generate audio bars with varying heights
  const bars = useMemo(() =>
    Array.from({ length: 96 }, (_, i) => ({
      id: i,
      height: Math.random() * 0.6 + 0.4, // Random height between 40% and 100%
      delay: Math.random() * 1.5 // Random delay
    })), []
  )

  return (
    <div className="relative min-h-screen w-full bg-[color:var(--bg)] text-[color:var(--text)] overflow-hidden">
      {/* header */}
      <header className="fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-4 md:px-8 z-50">
        <button className="btn btn-ghost focus-ring micro-hover micro-press" onClick={onBack}>&lt; Back</button>
        <ThemeToggle />
      </header>

      {/* SYMMETRIC Enhanced background layers */}
      <div className="aurora-symmetric" aria-hidden />
      
      {/* Audio bars - more prominent with enhanced interactivity */}
      <div className={`audio-rail audio-rail--top transition-opacity duration-1000 ${audioActive ? 'opacity-30' : 'opacity-18'}`} aria-hidden>
        {bars.map((bar) => (
          <div
            className="audio-bar"
            key={`t-${bar.id}`}
            style={{
              height: `${bar.height * 100}%`,
              animationDelay: `${bar.delay}s`,
              animationDuration: `${1.5 + Math.random()}s`
            }}
          />
        ))}
      </div>
      <div className={`audio-rail audio-rail--bot transition-opacity duration-1000 ${audioActive ? 'opacity-30' : 'opacity-18'}`} aria-hidden>
        {bars.map((bar) => (
          <div
            className="audio-bar"
            key={`b-${bar.id}`}
            style={{
              height: `${bar.height * 100}%`,
              animationDelay: `${bar.delay + 0.5}s`,
              animationDuration: `${1.5 + Math.random()}s`
            }}
          />
        ))}
      </div>

      {/* Additional audio visualizer at the bottom */}
      <div className={`fixed bottom-0 left-0 right-0 h-32 flex items-end justify-center gap-1 transition-opacity duration-1000 ${audioActive ? 'opacity-60' : 'opacity-20'}`} aria-hidden>
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={`bottom-${i}`}
            className="w-1 sm:w-2 bg-gradient-to-t from-[color:var(--primary)] to-[color:var(--accent)] rounded-t"
            style={{
              height: `${Math.random() * 100}%`,
              animation: `barPulse ${1.5 + Math.random() * 0.5}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 0.5}s`
            }}
          />
        ))}
      </div>

      {/* Main content container - PERFECTLY CENTERED */}
      <div className="fixed inset-0 flex flex-col items-center justify-center px-4 py-16">
        {/* STATIC Logo stack - separate from card */}


        {/* Enhanced Auth card with better glass effect - FIXED WIDTH */}
        <div
          ref={containerRef}
          className="w-full max-w-[400px] card glass fade-up micro-hover"
          style={{
            transform: `perspective(1100px) rotateX(${tilt.rx/4}deg) rotateY(${tilt.ry/4}deg)`,
            backdropFilter: 'blur(16px)',
            background: 'color-mix(in oklab, var(--card), transparent 60%)',
            border: '1px solid color-mix(in oklab, var(--text), transparent 85%)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), 0 0 0 1px color-mix(in oklab, var(--primary), transparent 90%)'
          }}
        >
          <div className="flex flex-col items-center text-center gap-3 mb-6">
            <img
              src={logo}
              alt="VoiceMind logo"
              className="h-16 w-16 rounded-2xl border border-white/10 shadow-lg"
            />
            <div>
              <h1 className="text-xl font-semibold tracking-tight">VoiceMind</h1>
              <p className="text-sm text-[color:var(--muted)]">Speech Emotion Detector</p>
            </div>
          </div>

          {/* tabs with enhanced styling */}
          <div className="flex rounded-xl bg-white/5 p-1 border border-white/10">
            <button
              className={`flex-1 py-2 rounded-lg transition-all duration-300 ${isLogin ? 'bg-white/10 shadow-sm' : 'bg-transparent'} hover:bg-white/[.08]`}
              onClick={() => setMode("login")}
            >
              Login
            </button>
            <button
              className={`flex-1 py-2 rounded-lg transition-all duration-300 ${!isLogin ? 'bg-white/10 shadow-sm' : 'bg-transparent'} hover:bg-white/[.08]`}
              onClick={() => setMode("register")}
            >
              Register
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* forms with enhanced inputs - FIXED HEIGHT CONTAINER */}
          <div className="mt-5 relative h-[280px] sm:h-[300px]">
            {/* LOGIN */}
            <form
              onSubmit={submit}
              className={`space-y-3 sm:space-y-4 transition-all duration-300 ${isLogin ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 -translate-y-2 absolute inset-0'}`}
            >
              <div>
                <label className="text-sm text-[color:var(--muted)]">Email</label>
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 input-shadow bg-[color:var(--bg-soft)] px-3 py-2 focus-ring transition-all duration-200"
                  type="email"
                  value={email}
                  onChange={(e)=>setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  style={{
                    background: 'color-mix(in oklab, var(--bg-soft), transparent 30%)',
                    backdropFilter: 'blur(8px)'
                  }}
                />
              </div>
              <div>
                <label className="text-sm text-[color:var(--muted)]">Password</label>
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 input-shadow bg-[color:var(--bg-soft)] px-3 py-2 focus-ring transition-all duration-200"
                  type="password"
                  value={password}
                  onChange={(e)=>setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{
                    background: 'color-mix(in oklab, var(--bg-soft), transparent 30%)',
                    backdropFilter: 'blur(8px)'
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" className="accent-[color:var(--primary)]" /> Remember me
                </label>
                <button type="button" className="hover:underline">Forgot password?</button>
              </div>
              <button className="btn w-full focus-ring micro-press" disabled={!canSubmit}>
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            {/* REGISTER */}
            <form
              onSubmit={submit}
              className={`space-y-3 sm:space-y-4 transition-all duration-300 ${!isLogin ? 'opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-2 absolute inset-0'}`}
            >
              <div>
                <label className="text-sm text-[color:var(--muted)]">Name</label>
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 input-shadow bg-[color:var(--bg-soft)] px-3 py-2 focus-ring transition-all duration-200"
                  type="text"
                  value={name}
                  onChange={(e)=>setName(e.target.value)}
                  placeholder="Your name"
                  required={!isLogin}
                  style={{
                    background: 'color-mix(in oklab, var(--bg-soft), transparent 30%)',
                    backdropFilter: 'blur(8px)'
                  }}
                />
              </div>
              <div>
                <label className="text-sm text-[color:var(--muted)]">Email</label>
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 input-shadow bg-[color:var(--bg-soft)] px-3 py-2 focus-ring transition-all duration-200"
                  type="email"
                  value={email}
                  onChange={(e)=>setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required={!isLogin}
                  style={{
                    background: 'color-mix(in oklab, var(--bg-soft), transparent 30%)',
                    backdropFilter: 'blur(8px)'
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div>
                  <label className="text-sm text-[color:var(--muted)]">Password</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-white/10 input-shadow bg-[color:var(--bg-soft)] px-2 sm:px-3 py-2 focus-ring transition-all duration-200 text-sm"
                    type="password"
                    value={password}
                    onChange={(e)=>setPassword(e.target.value)}
                    placeholder="Create password"
                    required={!isLogin}
                    style={{
                      background: 'color-mix(in oklab, var(--bg-soft), transparent 30%)',
                      backdropFilter: 'blur(8px)'
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm text-[color:var(--muted)]">Confirm</label>
                  <input
                    className="mt-1 w-full rounded-xl border border-white/10 input-shadow bg-[color:var(--bg-soft)] px-2 sm:px-3 py-2 focus-ring transition-all duration-200 text-sm"
                    type="password"
                    value={confirm}
                    onChange={(e)=>setConfirm(e.target.value)}
                    placeholder="Repeat password"
                    required={!isLogin}
                    style={{
                      background: 'color-mix(in oklab, var(--bg-soft), transparent 30%)',
                      backdropFilter: 'blur(8px)'
                    }}
                  />
                </div>
              </div>
              <button className="btn w-full focus-ring micro-press" disabled={!canSubmit}>
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>
          </div>

          {/* Divider with enhanced styling */}
          <div className="my-4 flex items-center gap-3 text-xs text-[color:var(--muted)]">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <span>OR</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent via-white/20 to-transparent" />
          </div>

          {/* Google button with enhanced styling */}
          <button
            className="btn btn-ghost w-full focus-ring micro-hover micro-press flex items-center justify-center gap-2"
            onClick={() => alert("Google Sign-In - coming soon")}
            style={{
              background: 'color-mix(in oklab, var(--bg-soft), transparent 50%)',
              backdropFilter: 'blur(8px)'
            }}
          >
            <GoogleIcon /> Continue with Google
          </button>

          <p className="mt-3 text-xs text-center text-[color:var(--muted)]">
            By continuing, you agree to minimal analytics for emotion trends.
          </p>
        </div>
      </div>
    </div>
)
}  

