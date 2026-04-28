[🇬🇧 English](README.EN.md)

# RAG Doküman Soru-Cevap — Frontend

RAG Doküman Soru-Cevap sisteminin Next.js frontend'i. PDF yükle, dosyaya göre filtrele, soru sor — cevaplar kaynak atıflarıyla birlikte token token akar.

**Canlı demo:** [rag.ahmethamdiozen.com](https://rag.ahmethamdiozen.com) · **Backend repo:** [rag-project](https://github.com/ahmethamdiozen/rag-project)

---

## Özellikler

- Sürükle-bırak PDF yükleme (maks 10 MB)
- Checkbox'larla çoklu doküman filtreleme
- ⌘+Enter kısayoluyla soru girişi
- SSE ile token token akan cevaplar
- Sayfa düzeyinde kaynak atıfları
- Yükleme ilerleme çubuğu
- Yükleniyor durumları ve hata yönetimi

---

## Teknoloji Yığını

Next.js 16 · TypeScript · Tailwind CSS v4

---

## Yerel Kurulum

```bash
npm install
```

`.env.local` oluştur:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

```bash
npm run dev
```

Port 8000'de çalışan [backend](https://github.com/ahmethamdiozen/rag-project) gereklidir.

---

## Docker

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.rag.ahmethamdiozen.site \
  -t rag-frontend .

docker run -p 3000:3000 rag-frontend
```

> `NEXT_PUBLIC_API_URL` **build anında** geçirilmelidir — Next.js bu değeri bundle'a gömer.
