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

  return (
    <main className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        Internal Document Q&A
      </h1>

      {files.length > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Files</h3>

          <div className="space-y-1">
            {files.map((file) => (
              <label key={file.name} className="flex items-center gap-2">
                <input
                type="checkbox"
                checked={selectedFiles.includes(file.name)}
                onChange={() => toggleFile(file.name)}
                />
                <span>{file.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}


      <textarea
        className="w-full border p-2 mb-4"
        rows={4}
        placeholder="Type question here..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />

      <button
        onClick={handleAsk}
        disabled={loading}
        className="px-4 py-2 bg-black text-white disabled:opacity-50"
      >
        {loading ? "Asking..." : "Sor"}
      </button>

      {error && (
        <p className="text-red-500 mt-4">{error}</p>
      )}

      {answer && (
        <div className="mt-6 p-4 border rounded">
          <h2 className="font-semibold mb-2">Response</h2>
          <p className="mb-4">{answer}</p>

          {sources.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Sources</h3>
              <ul className="list-disc list-inside text-sm text-gray-700">
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

    </main>
  )
}
