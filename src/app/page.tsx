"use client"

import { useState, useEffect } from "react"
import { Source, AskResponse, FileItem} from "./types"

export default function Home() {
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sources, setSources] = useState<Source[]>([])
  const [files, setFiles] = useState<FileItem[]>([])
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const isBusy = loading || uploading

  useEffect(() => {
    async function fetchFiles() {
      try {
        const response = await fetch("http://localhost:8000/files")
        const data: string[] = await response.json()
        setFiles(data.map((name) => ({name})))
      } catch (error) {
        console.error("Files couldn't fetch.", error)
      }
    }
    fetchFiles()
  }, [])

  function toggleFile(fileName: string) {
    setSelectedFiles((prev) =>
    prev.includes(fileName)
      ? prev.filter((f) => f !== fileName)
      : [...prev, fileName] 
    )
  }

  async function handleAsk() {
    setSources([])
    if (!question.trim()) return

    setLoading(true)
    setError(null)
    setAnswer("")

    try {
      const response = await fetch("http://localhost:8000/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: question,
          files: selectedFiles.length > 0 ? selectedFiles : undefined,
        }),
      })

      if (!response.ok) {
        throw new Error("Backend error")
      }

      const data: AskResponse = await response.json()
      setAnswer(data.answer)
      setSources(data.sources)
    } catch (err) {
      setError("An error occured")
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload(file: File) {
    setUploading(true)
    setUploadError(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData
      })

      if(!res.ok) {
        throw new Error("Upload failed")
      }

      const filesRes = await fetch("http://localhost:8000/files")
      const data: string[] = await filesRes.json()
      setFiles(data.map((name) => ({ name })))


    } catch (err) {
      setUploadError("Upload failed")
    } finally {
      setUploading(false)
    }

  }

  return (
    <main className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className="text-3xl font-semibold text-gray-900 mb-6">
          Internal Document Q&A
        </h1>

        {/* Upload */}
        <div className="bg-white border rounded-lg p-4 mb-6 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload PDF
          </label>

          <div className="flex items-center gap-3">
            {/* Hidden file input */}
            <input
              id="pdf-upload"
              type="file"
              accept="application/pdf"
              disabled={loading}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return

                if (file.type !== "application/pdf") {
                  setUploadError("Only PDF files are allowed")
                  e.target.value = ""
                  return
                }

                if (file.size > 100 * 1024 * 1024) {
                  setUploadError("File size must be less than 100MB")
                  e.target.value = ""
                  return
                }

                handleUpload(file)
                e.target.value = ""
              }}
            />

            {/* Clickable button */}
            <label
              htmlFor="pdf-upload"
              className={`inline-flex items-center px-4 py-2 rounded-md border text-sm font-medium cursor-pointer
                ${
                  loading
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
            >
              Choose PDF file
            </label>

            <span className="text-sm text-gray-500">
              No file selected
            </span>
          </div>

          {uploading && (
            <p className="text-sm text-gray-500 mt-2">Uploading...</p>
          )}
          {uploadError && (
            <p className="text-sm text-red-500 mt-2">{uploadError}</p>
          )}
        </div>


        {/* Files */}
        {files.length > 0 && (
          <div className="bg-white border rounded-lg p-4 mb-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Documents
            </h3>

            <div
              className={`space-y-2 ${
                isBusy ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              {files.map((file) => (
                <label
                  key={file.name}
                  className="flex items-center gap-2 text-sm text-gray-800"
                >
                  <input
                    disabled={isBusy}
                    type="checkbox"
                    checked={selectedFiles.includes(file.name)}
                    onChange={() => toggleFile(file.name)}
                  />
                  {file.name}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Selected files badges */}
        {selectedFiles.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {selectedFiles.map((file) => (
              <span
                key={file}
                className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-indigo-100 text-indigo-700 rounded-full"
              >
                {file}
                <button
                  onClick={() => toggleFile(file)}
                  className="hover:text-indigo-900"
                >
                  ×
                </button>
              </span>
            ))}
            <button
              onClick={() => setSelectedFiles([])}
              className="text-sm text-indigo-600 underline ml-2"
            >
              Clear selection
            </button>
          </div>
        )}

        {selectedFiles.length === 0 && (
          <div className="mb-4 text-sm text-gray-500 italic">
            Searching across all documents
          </div>
        )}

        {/* Ask */}
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <textarea
            className="w-full border border-gray-300 rounded-md p-3 mb-4 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            rows={4}
            placeholder="Type your question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />

          <button
            onClick={handleAsk}
            disabled={isBusy}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md disabled:opacity-50"
          >
            {loading ? "Asking..." : "Ask"}
          </button>

          {error && (
            <p className="text-red-500 text-sm mt-4">{error}</p>
          )}

          {answer && (
            <div className="mt-6 border-t pt-4">
              <h2 className="text-sm font-medium text-gray-700 mb-2">
                Response
              </h2>
              <p className="text-gray-800 mb-4">{answer}</p>

              {sources.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-1">
                    Sources
                  </h3>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    {sources.map((source, index) => (
                      <li key={index}>
                        {source.file_name} — Page {source.page}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )

}
