"use client";

import { useState, useRef, type FormEvent, type DragEvent } from "react";
import { useRouter } from "next/navigation";

export default function SearchPage() {
  const router = useRouter();

  // Search state
  const [query, setQuery] = useState("");

  // PDF upload state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDragging, setPdfDragging] = useState(false);
  const [pdfUploading, setPdfUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // URL paste state
  const [url, setUrl] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);

  // --- Handlers ---

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/results?q=${encodeURIComponent(trimmed)}`);
  }

  function handleFileChange(file: File | null) {
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    setPdfDragging(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    setPdfDragging(false);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setPdfDragging(false);
    const file = e.dataTransfer.files?.[0] ?? null;
    handleFileChange(file);
  }

  async function handlePdfUpload() {
    if (!pdfFile) return;
    setPdfUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", pdfFile);
      const res = await fetch("/api/parse", { method: "POST", body: formData });
      const data = await res.json();
      router.push(`/read?paperId=${data.paperId}`);
    } catch {
      console.error("PDF upload failed");
    } finally {
      setPdfUploading(false);
    }
  }

  async function handleUrlSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    setUrlLoading(true);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data = await res.json();
      router.push(`/read?paperId=${data.paperId}`);
    } catch {
      console.error("URL parse failed");
    } finally {
      setUrlLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* ---- Search Section ---- */}
      <section className="mb-8">
        <h1 className="mb-4 font-bodoni text-2xl font-bold text-forest">
          Search Papers
        </h1>
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search research papers..."
            className="flex-1 rounded-lg border-2 border-forest bg-cream px-4 py-3 font-avenir text-forest placeholder:text-forest/50 focus:border-orange focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-orange px-6 py-3 font-avenir font-semibold text-white transition-colors hover:bg-orange-light active:scale-[0.97]"
          >
            Search
          </button>
        </form>
      </section>

      {/* Divider */}
      <hr className="mb-8 border-cream-dark" />

      {/* ---- PDF Upload Section ---- */}
      <section className="mb-8">
        <h2 className="mb-4 font-bodoni text-2xl font-bold text-forest">
          Upload PDF
        </h2>

        {/* Drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 transition-colors ${
            pdfDragging
              ? "border-orange bg-cream/60"
              : "border-cream-dark bg-cream/30 hover:border-orange/60"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mb-3 h-10 w-10 text-forest/40"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="12" y2="12" />
            <line x1="15" y1="15" x2="12" y2="12" />
          </svg>

          {pdfFile ? (
            <p className="font-avenir text-sm font-medium text-forest">
              {pdfFile.name}
            </p>
          ) : (
            <p className="font-avenir text-sm text-forest/60">
              Drag & drop a PDF here, or click to select
            </p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          />
        </div>

        {pdfFile && (
          <button
            onClick={handlePdfUpload}
            disabled={pdfUploading}
            className="mt-4 w-full rounded-lg bg-orange px-6 py-3 font-avenir font-semibold text-white transition-colors hover:bg-orange-light disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.97]"
          >
            {pdfUploading ? "Uploading..." : "Upload & Read"}
          </button>
        )}
      </section>

      {/* Divider */}
      <hr className="mb-8 border-cream-dark" />

      {/* ---- URL Paste Section ---- */}
      <section>
        <h2 className="mb-4 font-bodoni text-2xl font-bold text-forest">
          Paste URL
        </h2>
        <form onSubmit={handleUrlSubmit} className="flex gap-3">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://arxiv.org/..."
            className="flex-1 rounded-lg border-2 border-forest bg-cream px-4 py-3 font-avenir text-forest placeholder:text-forest/50 focus:border-orange focus:outline-none"
          />
          <button
            type="submit"
            disabled={urlLoading}
            className="rounded-lg bg-orange px-6 py-3 font-avenir font-semibold text-white transition-colors hover:bg-orange-light disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.97]"
          >
            {urlLoading ? "Loading..." : "Load"}
          </button>
        </form>
      </section>
    </div>
  );
}
