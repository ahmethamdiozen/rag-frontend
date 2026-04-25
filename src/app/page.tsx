"use client"

import { useState, useEffect, useRef } from "react"
import { Source, FileItem } from "./types"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

function Spinner({ size = 4 }: { size?: number }) {
  return (
    <svg className={`animate-spin h-${size} w-${size}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

export default function Home() {
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noResults, setNoResults] = useState(false)
  const [sources, setSources] = useState<Source[]>([])
  const [files, setFiles] = useState<FileItem[]>([])
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadPhase, setUploadPhase] = useState<"uploading" | "indexing" | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isBusy = loading || uploading

  useEffect(() => { fetchFiles() }, [])

  async function fetchFiles() {
    try {
      const res = await fetch(`${API_URL}/files`)
      const data: string[] = await res.json()
      setFiles(data.map((name) => ({ name })))
    } catch { /* backend may not be running locally */ }
  }

  function toggleFile(fileName: string) {
    setSelectedFiles((prev) =>
      prev.includes(fileName) ? prev.filter((f) => f !== fileName) : [...prev, fileName]
    )
  }

  async function handleAsk() {
    if (!question.trim() || isBusy) return
    setSources([])
    setNoResults(false)
    setLoading(true)
    setError(null)
    setAnswer("")

    try {
      const res = await fetch(`${API_URL}/ask/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          files: selectedFiles.length > 0 ? selectedFiles : undefined,
        }),
      })

      if (!res.ok || !res.body) throw new Error()

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split("\n\n")
        buffer = parts.pop() ?? ""

        for (const part of parts) {
          for (const line of part.split("\n")) {
            if (!line.startsWith("data: ")) continue
            try {
              const event = JSON.parse(line.slice(6))
              if (event.type === "token") setAnswer((prev) => prev + event.content)
              else if (event.type === "sources") setSources(event.sources)
              else if (event.type === "no_results") setNoResults(true)
            } catch { /* malformed chunk */ }
          }
        }
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  function handleUpload(file: File) {
    if (file.type !== "application/pdf") {
      setUploadError("Only PDF files are allowed.")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File must be under 10 MB.")
      return
    }

    setUploading(true)
    setUploadError(null)
    setUploadProgress(0)
    setUploadPhase("uploading")

    const formData = new FormData()
    formData.append("file", file)

    const xhr = new XMLHttpRequest()

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setUploadProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setUploadPhase("indexing")
        await fetchFiles()
      } else {
        setUploadError("Upload failed. Please try again.")
      }
      setUploading(false)
      setUploadPhase(null)
      setUploadProgress(0)
    }

    xhr.onerror = () => {
      setUploadError("Upload failed. Please try again.")
      setUploading(false)
      setUploadPhase(null)
      setUploadProgress(0)
    }

    xhr.open("POST", `${API_URL}/upload`)
    xhr.send(formData)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  return (
    <main className="min-h-screen py-12 px-4" style={{ background: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: "var(--accent)" }}>
            RAG Demo
          </p>
          <h1 className="text-3xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
            Document Q&amp;A
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Upload a PDF, then ask anything about its content.
          </p>
        </div>

        {/* Upload card */}
        <div
          className="rounded-2xl border p-6 mb-4 transition-shadow duration-200 hover:shadow-md"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-secondary)" }}>
            Upload PDF
          </p>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !isBusy && fileInputRef.current?.click()}
            className="relative rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-8 gap-2 cursor-pointer select-none transition-all duration-200"
            style={{
              borderColor: dragOver ? "var(--accent)" : "var(--border)",
              background: dragOver ? "rgba(99,102,241,0.04)" : "transparent",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              disabled={isBusy}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleUpload(file)
                e.target.value = ""
              }}
            />

            {uploadPhase === "uploading" ? (
              <div className="w-full px-6 flex flex-col items-center gap-3">
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%`, background: "var(--accent)" }}
                  />
                </div>
                <span className="text-sm" style={{ color: "var(--accent)" }}>
                  Uploading… {uploadProgress}%
                </span>
              </div>
            ) : uploadPhase === "indexing" ? (
              <span className="flex items-center gap-2 text-sm" style={{ color: "var(--accent)" }}>
                <Spinner /> Indexing document…
              </span>
            ) : (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)" }}>
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  <span className="font-medium" style={{ color: "var(--accent)" }}>Click to upload</span> or drag &amp; drop
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>PDF only · max 10 MB</p>
              </>
            )}
          </div>

          {uploadError && <p className="text-xs mt-3 text-red-500">{uploadError}</p>}
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div
            className="rounded-2xl border p-5 mb-4 transition-shadow duration-200 hover:shadow-md"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                Documents ({files.length})
              </p>
              {selectedFiles.length > 0 && (
                <button
                  onClick={() => setSelectedFiles([])}
                  className="text-xs transition-opacity duration-150 hover:opacity-60"
                  style={{ color: "var(--accent)" }}
                >
                  Clear selection
                </button>
              )}
            </div>

            <div className={`space-y-1 ${isBusy ? "opacity-40 pointer-events-none" : ""}`}>
              {files.map((file) => {
                const checked = selectedFiles.includes(file.name)
                return (
                  <label
                    key={file.name}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors duration-150"
                    style={{ background: checked ? "rgba(99,102,241,0.06)" : "transparent" }}
                    onMouseEnter={e => { if (!checked) (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.03)" }}
                    onMouseLeave={e => { if (!checked) (e.currentTarget as HTMLElement).style.background = "transparent" }}
                  >
                    <div
                      className="flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all duration-150"
                      style={{ borderColor: checked ? "var(--accent)" : "var(--border)", background: checked ? "var(--accent)" : "transparent" }}
                    >
                      {checked && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <input type="checkbox" checked={checked} onChange={() => toggleFile(file.name)} disabled={isBusy} className="hidden" />
                    <span className="text-sm truncate" style={{ color: "var(--text-primary)" }}>{file.name}</span>
                  </label>
                )
              })}
            </div>

            {selectedFiles.length === 0 && (
              <p className="text-xs mt-3 italic" style={{ color: "var(--text-muted)" }}>
                No filter — searching all documents
              </p>
            )}
          </div>
        )}

        {/* Selected badges */}
        {selectedFiles.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {selectedFiles.map((file) => (
              <span
                key={file}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs rounded-full"
                style={{ background: "rgba(99,102,241,0.1)", color: "var(--accent)" }}
              >
                {file}
                <button onClick={() => toggleFile(file)} className="hover:opacity-60 transition-opacity leading-none">×</button>
              </span>
            ))}
          </div>
        )}

        {/* Ask card */}
        <div
          className="rounded-2xl border p-6 transition-shadow duration-200 hover:shadow-md"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-secondary)" }}>
            Ask a Question
          </p>

          <textarea
            rows={4}
            placeholder="What does the document say about…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAsk() }}
            disabled={isBusy}
            className="w-full rounded-xl border px-4 py-3 text-sm mb-4 resize-none outline-none transition-all duration-200 disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)", background: "transparent" }}
            onFocus={e => e.currentTarget.style.borderColor = "var(--border-focus)"}
            onBlur={e => e.currentTarget.style.borderColor = "var(--border)"}
          />

          <div className="flex items-center gap-3">
            <button
              onClick={handleAsk}
              disabled={isBusy || !question.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-all duration-200 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--accent)" }}
              onMouseEnter={e => { if (!isBusy) (e.currentTarget as HTMLElement).style.background = "var(--accent-hover)" }}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "var(--accent)"}
            >
              {loading ? <><Spinner /> Thinking…</> : "Ask"}
            </button>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>⌘ + Enter</span>
          </div>

          {error && <p className="text-xs mt-4 text-red-500">{error}</p>}

          {/* No results */}
          {noResults && !loading && (
            <div
              className="mt-6 pt-6 border-t rounded-xl p-4"
              style={{ borderColor: "var(--border)", background: "rgba(99,102,241,0.04)" }}
            >
              <div className="flex items-start gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: 1 }}>
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>No relevant content found</p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                    The documents don't seem to contain information about this topic. Try rephrasing or upload a more relevant document.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Answer */}
          {(answer || loading) && !noResults && (
            <div className="mt-6 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-secondary)" }}>
                Answer
              </p>
              <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text-primary)" }}>
                {answer}
                {loading && (
                  <span className="inline-block w-0.5 h-4 ml-0.5 align-middle animate-pulse" style={{ background: "var(--accent)" }} />
                )}
              </p>

              {sources.length > 0 && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-secondary)" }}>
                    Sources
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {sources.map((source, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg"
                        style={{ background: "rgba(99,102,241,0.06)", color: "var(--accent)" }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        {source.file_name} · p. {source.page}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
