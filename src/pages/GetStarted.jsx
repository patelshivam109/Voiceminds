// src/pages/GetStarted.jsx
export default function GetStarted({ onPrimary, onBack }) {
  return (
    <div className="relative min-h-screen bg-[color:var(--bg)] text-[color:var(--text)]">
      {/* Back button */}
      <header className="h-16 flex items-center px-4 md:px-8">
        <button className="btn btn-ghost focus-ring" onClick={onBack}>
          &lt; Back
        </button>
      </header>

      {/* Animated gradient blobs */}
      <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full blur-3xl opacity-30 float"
           style={{ background: 'radial-gradient(60% 60% at 50% 50%, var(--primary), transparent)' }} />
      <div className="pointer-events-none absolute top-40 -left-16 h-72 w-72 rounded-full blur-3xl opacity-25 float"
           style={{ background: 'radial-gradient(60% 60% at 50% 50%, color-mix(in oklab, var(--primary), #a855f7 40%), transparent)' }} />

      <section className="fade-up max-w-4xl mx-auto px-4 md:px-8 pt-8">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
          Meet <span style={{ color: 'var(--primary)' }}>VoiceMind</span>
        </h1>
        <p className="mt-3 max-w-2xl text-[color:var(--muted)]">
          Your personalized emotion detection assistant. We analyze speech patterns to detect emotions,
          helping you understand your emotional state and track patterns over time.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <button className="btn focus-ring" onClick={onPrimary}>Get Started</button>
          <a className="btn btn-secondary focus-ring" href="#how-it-works">How it works</a>
        </div>
      </section>

      <section id="how-it-works" className="max-w-4xl mx-auto px-4 md:px-8 py-12">
        <h2 className="text-2xl font-semibold mb-8">How It Works</h2>
        <div className="grid gap-5 md:grid-cols-3">
          <div className="card fade-up">
            <div className="badge">Step 1</div>
            <h3 className="mt-3 text-lg font-semibold">Record or Upload</h3>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Record a short audio clip directly in your browser or upload an existing file.
            </p>
          </div>
          <div className="card fade-up" style={{ animationDelay: '120ms' }}>
            <div className="badge">Step 2</div>
            <h3 className="mt-3 text-lg font-semibold">AI Analysis</h3>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Our advanced AI analyzes pitch, tone, and other vocal characteristics to detect emotions.
            </p>
          </div>
          <div className="card fade-up" style={{ animationDelay: '240ms' }}>
            <div className="badge">Step 3</div>
            <h3 className="mt-3 text-lg font-semibold">Get Insights</h3>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              Receive detailed emotion analysis with confidence scores and track patterns over time.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}