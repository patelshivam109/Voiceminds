// src/pages/Landing.jsx
import ThemeToggle from "../components/ThemeToggle"
import { useState } from "react"
import logo from "../assets/logo.png"
import GetStarted from "./GetStarted"

export default function Landing({ onGetStarted }) {
  const [demoStep, setDemoStep] = useState(1)
  const [showGetStarted, setShowGetStarted] = useState(false)

  const handleGetStarted = () => {
    setShowGetStarted(true)
  }

  const handleBack = () => {
    setShowGetStarted(false)
  }

  if (showGetStarted) {
    return <GetStarted onPrimary={onGetStarted} onBack={handleBack} />
  }

  return (
    <div className="min-h-dvh bg-[color:var(--bg)] text-[color:var(--text)]">
      {/* Top bar (theme only) */}
      <header className="h-16 flex items-center justify-end px-4 md:px-8">
        <ThemeToggle />
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 md:px-8 pt-4 md:pt-10">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          {/* Left: Title + CTA */}
          <div className="hero-ring fade-up">
            {/* Centered brand row with logo.png */}
            <div className="flex items-center gap-4">
              <img
                src={logo}
                alt="VoiceMind"
                width={100}
                height={100}
                className="rounded-2xl"
              />
              <h1 className="text-5xl md:text-6xl font-semibold tracking-tight">
                <span style={{ color: 'var(--primary)' }}>VoiceMind</span>
              </h1>
            </div>

            <h2 className="mt-4 text-2xl md:text-3xl font-medium">
              Speech Emotion Detector
            </h2>

            <p className="mt-4 text-lg text-[color:var(--muted)] max-w-xl">
              Detect <span className="pill">happiness</span>, <span className="pill">sadness</span>, <span className="pill">anger</span>, and <span className="pill">neutral</span>
              from short voice clips. We analyze pitch, tone, and energy to infer emotional state - ideal
              for mental health check-ins, customer support, and empathetic AI.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button className="btn focus-ring" onClick={handleGetStarted}>Get Started</button>
              <a className="btn btn-ghost focus-ring" href="#demo">Try a Demo</a>
            </div>

            <div className="mt-6 flex items-center gap-3 text-sm text-[color:var(--muted)]">
              <span className="pill">On-device capable</span>
              <span className="pill">Real-time inference</span>
              <span className="pill">Privacy-first</span>
            </div>
          </div>

          {/* Right: Animated audio preview mock */}
          <div className="relative fade-up">
            {/* Ambient blobs */}
            <div className="absolute -top-12 -right-6 h-64 w-64 rounded-full blur-3xl opacity-25 float"
                 style={{ background: 'radial-gradient(50% 50% at 50% 50%, var(--primary), transparent)' }} />
            <div className="absolute top-24 -left-10 h-72 w-72 rounded-full blur-3xl opacity-20 float"
                 style={{ background: 'radial-gradient(50% 50% at 50% 50%, color-mix(in oklab,var(--accent), var(--primary) 40%), transparent)' }} />

            <div className="glass rounded-3xl p-4 md:p-6 shadow-xl">
              <div className="text-sm mb-3 text-[color:var(--muted)]">Live Preview</div>

              {/* Waveform mock */}
              <div className="card">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">Audio Waveform</div>
                  <div className="badge">Demo</div>
                </div>

                <div className="mt-4 h-24 w-full grid grid-cols-48 gap-1">
                  {Array.from({ length: 48 }).map((_, i) => {
                    const base = 8 + Math.sin(i / 2) * 6
                    const variance = (i % 3 === 0 ? 10 : i % 5 === 0 ? 14 : 6)
                    const h = Math.max(6, base + Math.random() * variance)
                    return (
                      <div key={i} className="bg-[color:var(--primary)]/80 rounded-sm"
                           style={{
                             height: `${h}px`,
                             alignSelf: 'end',
                             transition: 'height .7s ease',
                           }} />
                    )
                  })}
                </div>

                {/* Emotion chip row */}
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="pill">Pitch range</span>
                  <span className="pill">Energy steady</span>
                  <span className="pill">Timbre detail</span>
                </div>
                <div className="mt-5">
                  <div className="flex justify-between text-sm text-[color:var(--muted)]">
                    <span>Predicted: <span className="text-[color:var(--text)] font-medium">Happiness</span></span>
                    <span>Confidence</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-[color:var(--primary)]"
                      style={{ width: '74%', transition: 'width .8s ease' }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3 text-xs text-[color:var(--muted)]">
                *Mock waveform for visual effect. Real analysis runs in-app.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive 3-step Demo */}
      <section id="demo" className="mx-auto max-w-6xl px-4 md:px-8 py-14">
        <div className="grid md:grid-cols-3 gap-5">
          {/* Step 1 */}
          <button
            onClick={() => setDemoStep(1)}
            className={`card fade-up text-left transition ${demoStep===1 ? 'ring-2' : ''}`}
            style={{ boxShadow: demoStep===1 ? 'var(--ring)' : 'none' }}
          >
            <div className="badge">Step 1</div>
            <h3 className="mt-3 text-lg font-semibold">Realtime Audio Input</h3>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              3-10 seconds is enough. We support WAV/MP3 and direct mic input.</p>
            <div className="mt-4 h-10 w-full rounded-md skeleton" />
          </button>

          {/* Step 2 */}
          <button
            onClick={() => setDemoStep(2)}
            className={`card fade-up text-left transition ${demoStep===2 ? 'ring-2' : ''}`}
            style={{ animationDelay: '120ms', boxShadow: demoStep===2 ? 'var(--ring)' : 'none' }}
          >
            <div className="badge">Step 2</div>
            <h3 className="mt-3 text-lg font-semibold">Analyze prosody</h3>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              We extract pitch (F0), energy, spectral features (MFCC), and tempo cues.
            </p>
            <div className="mt-4 space-y-2">
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-[color:var(--accent)]" style={{ width: demoStep===2 ? '42%' : '12%', transition: 'width .7s ease' }} />
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-[color:var(--primary)]" style={{ width: demoStep===2 ? '76%' : '36%', transition: 'width .7s ease' }} />
              </div>
            </div>
          </button>

          {/* Step 3 */}
          <button
            onClick={() => setDemoStep(3)}
            className={`card fade-up text-left transition ${demoStep===3 ? 'ring-2' : ''}`}
            style={{ animationDelay: '240ms', boxShadow: demoStep===3 ? 'var(--ring)' : 'none' }}
          >
            <div className="badge">Step 3</div>
            <h3 className="mt-3 text-lg font-semibold">Detect emotion + confidence</h3>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Multi-class classifier predicts <em>happy</em>, <em>sad</em>, <em>angry</em>, or <em>neutral</em>.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="h-16 rounded-xl glass" />
              <div className="h-16 rounded-xl glass" />
              <div className="h-16 rounded-xl glass" />
            </div>
          </button>
        </div>

        {/* CTA */}
        <div className="mt-10 flex items-center gap-3">
          <span className="kbd">Enter</span>
          <span className="text-sm text-[color:var(--muted)]">press to begin</span>
          <button className="btn focus-ring ml-auto" onClick={handleGetStarted}>
            Get Started
          </button>
        </div>
      </section>
    </div>
  )
}