[🇹🇷 Türkçe](README.md)

# RAG Document Q&A — Frontend

Next.js frontend for the RAG Document Q&A system. Upload PDFs, filter by document, ask questions, and see answers with source citations.

**Live demo:** [rag.ahmethamdiozen.site](https://rag.ahmethamdiozen.site) · **Backend repo:** [rag-project](https://github.com/ahmethamdiozen/rag-project)

---

## Features

- Drag-and-drop PDF upload (max 10 MB)
- Multi-document filtering via checkboxes
- Question input with ⌘+Enter shortcut
- Streaming answers token by token (SSE)
- Page-level source citations
- Upload progress bar
- Loading states and error handling

---

## Stack

Next.js 16 · TypeScript · Tailwind CSS v4

---

## Local setup

```bash
npm install
```

Create `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

```bash
npm run dev
```

Requires the [backend](https://github.com/ahmethamdiozen/rag-project) running on port 8000.

---

## Docker

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.rag.ahmethamdiozen.site \
  -t rag-frontend .

docker run -p 3000:3000 rag-frontend
```

> `NEXT_PUBLIC_API_URL` must be passed at **build time** — Next.js bakes it into the bundle.
