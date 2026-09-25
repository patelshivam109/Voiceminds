// src/pages/Library.jsx
import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO, differenceInDays } from "date-fns"

import { useToast } from "../contexts/ToastContext"
import {
  deleteAudioSample,
  listAudioSamples,
  triggerInference,
} from "../lib/api"

const EMOTIONS = ["all", "angry", "happy", "sad", "neutral"]
const RANGE_FILTERS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
]

function formatDuration(seconds) {
  if (!seconds) return "-"
  return `${Number(seconds).toFixed(1)}s`
}

function formatDate(timestamp) {
  if (!timestamp) return "-"
  return format(parseISO(timestamp), "PPpp")
}

export default function Library({ onNavigate, onBack }) {
  const { showToast } = useToast()
  const [samples, setSamples] = useState([])
  const [loading, setLoading] = useState(true)
  const [emotionFilter, setEmotionFilter] = useState("all")
  const [rangeFilter, setRangeFilter] = useState("30")
  const [searchTerm, setSearchTerm] = useState("")

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const data = await listAudioSamples({ limit: 100, offset: 0 })
      setSamples(data.items || [])
    } catch (error) {
      console.error(error)
      showToast(error.message || "Unable to load clips", { type: "error" })
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    refresh()
  }, [refresh])

  const filteredSamples = useMemo(() => {
    return (samples || []).filter((sample) => {
      const result = sample.latest_result
      const label = result?.pred_label || "unknown"
      if (emotionFilter !== "all" && label !== emotionFilter) {
        return false
      }

      if (rangeFilter !== "all") {
        const days = Number(rangeFilter)
        const created = parseISO(sample.created_at)
        if (differenceInDays(new Date(), created) > days) {
          return false
        }
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const combined = `${sample.filename} ${label}`.toLowerCase()
        if (!combined.includes(term)) {
          return false
        }
      }

      return true
    })
  }, [samples, emotionFilter, rangeFilter, searchTerm])

  const handleRetry = async (sampleId) => {
    try {
      await triggerInference(sampleId)
      showToast("Inference queued", { type: "info" })
      await refresh()
    } catch (error) {
      console.error(error)
      showToast(error.message || "Unable to queue inference", { type: "error" })
    }
  }

  const handleDelete = async (sampleId) => {
    try {
      await deleteAudioSample(sampleId)
      setSamples((current) => current.filter((sample) => sample.id !== sampleId))
      showToast("Sample deleted", { type: "info" })
    } catch (error) {
      console.error(error)
      showToast(error.message || "Unable to delete sample", { type: "error" })
    }
  }

  return (
    <div className="fade-up space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">All clips</h2>
          <p className="text-sm text-[color:var(--muted)]">Filter by emotion, timeframe, or name to inspect specific clips.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ghost focus-ring" onClick={refresh} disabled={loading}>
            Refresh
          </button>
          {onBack && (
            <button className="btn focus-ring" onClick={onBack}>
              Back to dashboard
            </button>
          )}
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[color:var(--muted)]">Emotion</span>
            <select
              className="input max-w-[160px]"
              value={emotionFilter}
              onChange={(event) => setEmotionFilter(event.target.value)}
            >
              {EMOTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "All" : option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-[color:var(--muted)]">Range</span>
            <select
              className="input max-w-[160px]"
              value={rangeFilter}
              onChange={(event) => setRangeFilter(event.target.value)}
            >
              {RANGE_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <input
              className="input"
              placeholder="Search by file name or label"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="grid grid-cols-12 bg-white/5 px-4 py-3 text-xs uppercase tracking-wide text-[color:var(--muted)]">
            <div className="col-span-4">File</div>
            <div className="col-span-2">Emotion</div>
            <div className="col-span-2">Confidence</div>
            <div className="col-span-2">Duration</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          {loading ? (
            <div className="px-4 py-6 text-center text-sm text-[color:var(--muted)]">Loading clips...</div>
          ) : filteredSamples.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-[color:var(--muted)]">No clips match the selected filters.</div>
          ) : (
            filteredSamples.map((sample) => {
              const result = sample.latest_result
              const label = result?.pred_label || "-"
              const confidence = result?.confidence ? `${Math.round(result.confidence * 100)}%` : "-"
              const status = result?.status || "pending"
              return (
                <div key={sample.id} className="grid grid-cols-12 items-center border-t border-white/5 px-4 py-3 text-sm">
                  <div className="col-span-4 truncate" title={sample.filename}>
                    <div className="font-medium text-[color:var(--text)]">{sample.filename}</div>
                    <div className="text-xs text-[color:var(--muted)]">{formatDate(sample.created_at)}</div>
                  </div>
                  <div className="col-span-2 capitalize">{label}</div>
                  <div className="col-span-2">{confidence}</div>
                  <div className="col-span-2">{formatDuration(sample.duration_sec)}</div>
                  <div className="col-span-2 flex justify-end gap-2 text-xs">
                    {status === "failed" && (
                      <button className="btn btn-ghost focus-ring" onClick={() => handleRetry(sample.id)}>
                        Retry
                      </button>
                    )}
                    <button className="btn btn-ghost focus-ring" onClick={() => handleDelete(sample.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
