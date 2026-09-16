// src/pages/Dashboard.jsx
import { useCallback, useEffect, useRef, useState } from "react"
import { format, parseISO } from "date-fns"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ComposedChart,
  Line,
} from "recharts"

import { useAuth } from "../contexts/AuthContext"
import { useToast } from "../contexts/ToastContext"
import {
  deleteAudioSample,
  listAudioSamples,
  triggerInference,
  uploadAudioSample,
  fetchStatsSummary,
} from "../lib/api"

// Import new components
import AudioRecorder from "../components/AudioRecorder"
import EmotionDisplay from "../components/EmotionDisplay"
import EmotionInsights from "../components/EmotionInsights"
import AISettings from "../components/AISettings"
import TranscriptionDisplay from "../components/TranscriptionDisplay"
import Navigation from "../components/Navigation"

const MAX_FILE_BYTES = 10 * 1024 * 1024
const EMOTIONS = ["angry", "happy", "sad", "neutral"]
const RANGE_OPTIONS = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
]

const STATUS_META = {
  running: { label: "Analysing", tone: "text-[color:var(--primary)]" },
  succeeded: { label: "Complete", tone: "text-emerald-300" },
  failed: { label: "Failed", tone: "text-red-300" },
  pending: { label: "Pending", tone: "text-[color:var(--muted)]" },
}

function emptyStats(range = "30d") {
  return {
    range,
    days: [],
    totals: {
      counts_by_label: Object.fromEntries(EMOTIONS.map((label) => [label, 0])),
      avg_confidence: 0,
      sample_count: 0,
      days: 0,
    },
    sessions_today: 0,
  }
}

function formatBytes(bytes) {
  if (bytes === undefined || bytes === null) return "-"
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB"]
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  const precision = value < 10 && unitIndex > 0 ? 1 : 0
  return `${value.toFixed(precision)} ${units[unitIndex]}`
}

function formatDuration(seconds) {
  if (!seconds) return "-"
  return `${Number(seconds).toFixed(1)}s`
}

function formatDate(timestamp) {
  if (!timestamp) return "-"
  const date = new Date(timestamp)
  return date.toLocaleString()
}

async function computeDuration(file) {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const audio = new Audio(objectUrl)
    audio.preload = "metadata"
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(Number.isFinite(audio.duration) ? Number(audio.duration.toFixed(2)) : null)
    }
    audio.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(null)
    }
  })
}

function distributionName(label) {
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export default function Dashboard({ onNavigate }) {
  const { auth } = useAuth()
  const { showToast } = useToast()

  
  const [samples, setSamples] = useState([])
  const [loadingSamples, setLoadingSamples] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const [includeTranscript, setIncludeTranscript] = useState(false)
 
  const [selectedAIModel, setSelectedAIModel] = useState('mistral')
  const [showAISettings, setShowAISettings] = useState(false)

  const [statsRange, setStatsRange] = useState("30d")
  const [stats, setStats] = useState(() => emptyStats("30d"))
  const [loadingStats, setLoadingStats] = useState(true)

  const dropZoneRef = useRef(null)
  const pollRef = useRef(null)

  const refreshSamples = useCallback(async () => {
    try {
      setLoadingSamples(true)
      const data = await listAudioSamples({ limit: 50, offset: 0 })
      setSamples(data.items || [])
      return data.items || []
    } catch (error) {
      console.error(error)
      showToast(error.message || "Unable to load audio samples", { type: "error" })
      return []
    } finally {
      setLoadingSamples(false)
    }
  }, [showToast])

  const loadStats = useCallback(
    async (range) => {
      setLoadingStats(true)
      setStats((current) => (current.range === range ? current : emptyStats(range)))
      try {
        const summary = await fetchStatsSummary(range)
        setStats(summary)
      } catch (error) {
        console.error(error)
        setStats(emptyStats(range))
        showToast(error.message || "Unable to load analytics", { type: "error" })
      } finally {
        setLoadingStats(false)
      }
    },
    [showToast]
  )

  useEffect(() => {
    refreshSamples()
  }, [refreshSamples])

  useEffect(() => {
    loadStats(statsRange)
  }, [loadStats, statsRange])

  useEffect(() => {
    const pending = samples.some((sample) => {
      const status = sample.latest_result?.status || "running"
      return status === "running" || status === "pending"
    })

    if (pending && !pollRef.current) {
      pollRef.current = setInterval(() => {
        refreshSamples()
        loadStats(statsRange)
      }, 4000)
    }

    if (!pending && pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [samples, refreshSamples, loadStats, statsRange])

  const latestDay = stats.days.length ? stats.days[stats.days.length - 1] : null
  const latestEmotion = latestDay?.top_label || "-"
  const averageConfidence = stats.totals.avg_confidence || 0
  const sessionsToday = stats.sessions_today || 0
  const totalSamples = stats.totals.sample_count || 0

 

  const distributionData = EMOTIONS.map((label) => ({
    label: distributionName(label),
    value: stats.totals.counts_by_label?.[label] ?? 0,
  }))

  const trendData = (stats.days || []).map((day) => {
    const parsed = parseISO(day.day)
    const label = statsRange === "7d" ? format(parsed, "EEE") : format(parsed, "MMM d")
    return {
      day: label,
      avg: Math.round((day.avg_confidence || 0) * 100),
      sampleCount: day.sample_count || 0,
      top: day.top_label || "-",
    }
  })

  const handleFileUpload = useCallback(
    async (file, options = {}) => {
      if (!file) return
      if (file.size > MAX_FILE_BYTES) {
        showToast("Audio must be 10MB or smaller", { type: "error" })
        return
      }

      setUploading(true)
      try {
        let duration = options.durationSec
        if (duration === undefined || duration === null) {
          duration = await computeDuration(file)
        }

        await uploadAudioSample(file, { 
          durationSec: duration,
          includeTranscript: includeTranscript
        })
        showToast("Audio uploaded", { type: "success" })
        await refreshSamples()
        await loadStats(statsRange)
      } catch (error) {
        console.error(error)
        showToast(error.message || "Upload failed", { type: "error" })
      } finally {
        setUploading(false)
      }
    },
    [loadStats, refreshSamples, showToast, statsRange, includeTranscript]
  )

  const handleRecordingComplete = useCallback(
    async (blob, duration) => {
      const file = new File([blob], "recording.webm", { type: blob.type || "audio/webm" })
      await handleFileUpload(file, { durationSec: duration })
    },
    [handleFileUpload]
  )

  const handleFilesSelected = useCallback(
    (files) => {
      if (!files || !files.length) return
      handleFileUpload(files[0])
    },
    [handleFileUpload]
  )

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault()
      if (event.dataTransfer.files?.length) {
        handleFileUpload(event.dataTransfer.files[0])
      }
    },
    [handleFileUpload]
  )

  const handleDragOver = useCallback((event) => {
    event.preventDefault()
  }, [])

  const handleDelete = useCallback(
    async (sampleId) => {
      try {
        await deleteAudioSample(sampleId)
        showToast("Sample deleted", { type: "info" })
        setSamples((current) => current.filter((sample) => sample.id !== sampleId))
        setExpandedId((current) => (current === sampleId ? null : current))
        await loadStats(statsRange)
      } catch (error) {
        console.error(error)
        showToast(error.message || "Unable to delete sample", { type: "error" })
      }
    },
    [loadStats, showToast, statsRange]
  )

 const handleRetry = useCallback(
    async (sampleId) => {
      try {
        await triggerInference(sampleId, { 
          includeTranscript: includeTranscript,
          include_ai_analysis: true,
          ai_model: selectedAIModel
        })
        showToast("Inference queued", { type: "info" })
        await refreshSamples()
        await loadStats(statsRange)
      } catch (error) {
        console.error(error)
        showToast(error.message || "Unable to queue inference", { type: "error" })
      }
    },
    [loadStats, refreshSamples, showToast, statsRange, includeTranscript, selectedAIModel]
  )

  const handleAIModelChange = (model) => {
    setSelectedAIModel(model);
  };

 

  return (
    <div className="app-container">
     
      
      <div className="main-content">
        <div className="fade-up">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-semibold">VoiceMind Dashboard</h2>
              <p className="mt-2 text-[color:var(--muted)]">
                Welcome back, {auth?.user?.name || "User"}! Upload or record audio clips and track your emotional trends.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={`btn btn-ghost focus-ring text-sm ${option.value === statsRange ? "bg-white/10" : ""}`}
                  onClick={() => setStatsRange(option.value)}
                  disabled={loadingStats && option.value === statsRange}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="card">
              <div className="text-sm text-[color:var(--muted)]">Last detected emotion</div>
              <div className="mt-3 text-3xl font-semibold capitalize">{latestEmotion}</div>
              <p className="mt-2 text-xs text-[color:var(--muted)]">Based on recent analysis</p>
            </div>

            <div className="card">
              <div className="text-sm text-[color:var(--muted)]">Average confidence</div>
              <div className="mt-3 text-3xl font-semibold">{Math.round(averageConfidence * 100)}%</div>
              <p className="mt-2 text-xs text-[color:var(--muted)]">Across {stats.totals.days} active days</p>
            </div>

            <div className="card">
              <div className="text-sm text-[color:var(--muted)]">Sessions today</div>
              <div className="mt-3 text-3xl font-semibold">{sessionsToday}</div>
              <p className="mt-2 text-xs text-[color:var(--muted)]">Total clips analysed: {totalSamples}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <div className="card">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Emotion distribution ({statsRange})</div>
                <span className="text-xs text-[color:var(--muted)]">Total: {totalSamples}</span>
              </div>
              <div className="mt-4" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distributionData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="label" stroke="rgba(255,255,255,0.6)" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} stroke="rgba(255,255,255,0.6)" tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(15,23,41,0.92)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "12px",
                        color: "#e6edf7",
                      }}
                    />
                    <Bar dataKey="value" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div className="font-semibold">Confidence & sessions trend</div>
                <span className="text-xs text-[color:var(--muted)]">Average confidence vs. sessions</span>
              </div>
              <div className="mt-4" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="day" stroke="rgba(255,255,255,0.6)" tickLine={false} axisLine={false} />
                    <YAxis
                      yAxisId="left"
                      domain={[0, 100]}
                      stroke="rgba(255,255,255,0.6)"
                      tickFormatter={(value) => `${value}%`}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="rgba(255,255,255,0.4)"
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "rgba(15,23,41,0.92)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "12px",
                        color: "#e6edf7",
                      }}
                    />
                    <Bar yAxisId="right" dataKey="sampleCount" barSize={18} fill="rgba(41,163,255,0.28)" radius={[6, 6, 0, 0]} />
                    <Line yAxisId="left" type="monotone" dataKey="avg" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="card md:col-span-2 flex flex-col gap-4">
              <div className="font-semibold">Quick actions</div>
              <p className="text-sm text-[color:var(--muted)]">Record a new clip or upload an existing file (wav, mp3, m4a, webm up to 10MB).</p>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <h3 className="font-medium">Microphone</h3>
                  <div className="mt-3">
                    <AudioRecorder onRecordingComplete={handleRecordingComplete} />
                  </div>
                  <div className="mt-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={includeTranscript}
                        onChange={(e) => setIncludeTranscript(e.target.checked)}
                      />
                      <span className="text-sm">Include transcript</span>
                    </label>
                  </div>
                </div>

                <div
                  ref={dropZoneRef}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="rounded-2xl border border-dashed p-4 transition-all border-white/20 bg-white/[0.02]"
                >
                  <h3 className="font-medium">Upload a file</h3>
                  <p className="mt-2 text-sm text-[color:var(--muted)]">Drag & drop audio here or choose from your device.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <label className="btn focus-ring cursor-pointer">
                      Select file
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(event) => {
                          handleFilesSelected(event.target.files)
                          event.target.value = ""
                        }}
                      />
                    </label>
                    {uploading && <span className="text-sm text-[color:var(--muted)]">Uploading...</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="card space-y-3">
              <div className="font-semibold">Upload tips</div>
              <ul className="list-disc space-y-1 pl-5 text-sm text-[color:var(--muted)]">
                <li>3-15 second clips give the best results.</li>
                <li>Supported formats: wav, mp3, m4a, webm, ogg.</li>
                <li>Max size: 10MB per clip.</li>
                <li>Speak clearly for better emotion detection.</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 card">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Recent clips</div>
              <div className="flex items-center gap-2">
                <button className="btn btn-ghost focus-ring text-sm" onClick={refreshSamples} disabled={loadingSamples}>
                  Refresh
                </button>
                <button 
                  className="btn btn-ghost focus-ring text-sm" 
                  onClick={() => setShowAISettings(!showAISettings)}
                >
                  AI Settings
                </button>
                {onNavigate && (
                  <button className="btn btn-ghost focus-ring text-sm" onClick={() => onNavigate("library")}>
                    View all
                  </button>
                )}
              </div>
            </div>

            {showAISettings && (
              <div className="mt-4">
                <AISettings onModelChange={handleAIModelChange} />
              </div>
            )}

            {loadingSamples ? (
              <div className="py-6 text-center text-sm text-[color:var(--muted)]">Loading samples...</div>
            ) : samples.length === 0 ? (
              <div className="py-6 text-center text-sm text-[color:var(--muted)]">No audio samples yet. Upload your first clip!</div>
            ) : (
              <div className="mt-4 divide-y divide-white/10">
                {samples.map((sample) => {
                  const result = sample.latest_result
                  const status = result?.status || "running"
                  const statusMeta = STATUS_META[status] || STATUS_META.pending
                  const isExpanded = expandedId === sample.id
                  return (
                    <div key={sample.id} className="py-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="truncate font-medium" title={sample.filename}>{sample.filename}</div>
                          <div className="text-xs text-[color:var(--muted)]">
                            Uploaded {formatDate(sample.created_at)} - {formatBytes(sample.size_bytes)} - {formatDuration(sample.duration_sec)}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-xs uppercase tracking-wide ${statusMeta.tone}`}>
                            {statusMeta.label}
                          </span>
                          {status === "succeeded" && (
                            <span className="text-xs text-[color:var(--muted)]">
                              {Math.round((result.confidence || 0) * 100)}% confidence
                            </span>
                          )}
                          {status === "failed" && (
                            <button className="btn btn-ghost focus-ring text-sm" onClick={() => handleRetry(sample.id)}>
                              Retry
                            </button>
                          )}
                          <button
                            className="btn btn-ghost focus-ring text-sm"
                            onClick={() => setExpandedId(isExpanded ? null : sample.id)}
                          >
                            {isExpanded ? "Hide details" : "View details"}
                          </button>
                          <button
                            className="btn btn-ghost focus-ring text-sm text-red-300 hover:text-red-200"
                            onClick={() => handleDelete(sample.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                          {status === "succeeded" && result ? (
                            <div className="space-y-3">
                              <EmotionDisplay result={result} />
                              {result.transcript && (
                                <TranscriptionDisplay 
                                  transcript={result.transcript} 
                                  isLoading={false} 
                                />
                              )}
                              {result.ai_analysis && (
                                <div className="ai-analysis">
                                  <h4>AI Analysis</h4>
                                  <p>{result.ai_analysis.analysis}</p>
                                  <span className="text-xs text-[color:var(--muted)]">
                                    Powered by {result.ai_analysis.model}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : status === "failed" ? (
                            <div className="text-sm text-red-300">Analysis failed: {result?.error_message || "Unknown error"}</div>
                          ) : (
                            <div className="text-sm text-[color:var(--muted)] animate-pulse">Awaiting inference results...</div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="mt-6 card">
            <EmotionInsights userId={auth?.user?.id} timeRange={statsRange} />
          </div>
        </div>
      </div>
    </div>
  )
}