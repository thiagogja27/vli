"use client"

import { useCallback, useRef, useState } from "react"
import {
  Check,
  Copy,
  Download,
  FileText,
  Loader2,
  RotateCcw,
  Upload,
  X,
} from "lucide-react"
import { extractPdfText } from "@/lib/pdf-extract"
import { parseNfe, type NfeData } from "@/lib/nfe-parser"
import { buildXml } from "@/lib/xml-builder"
import { Button } from "@/components/ui/button"
import { NfePreview } from "@/components/nfe-preview"

type Status = "idle" | "reading" | "done" | "error"

export function NfeConverter() {
  const [status, setStatus] = useState<Status>("idle")
  const [fileName, setFileName] = useState<string>("")
  const [data, setData] = useState<NfeData | null>(null)
  const [xml, setXml] = useState<string>("")
  const [error, setError] = useState<string>("")
  const [dragging, setDragging] = useState(false)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file) return
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      setStatus("error")
      setError("Por favor, envie um arquivo PDF.")
      return
    }

    setFileName(file.name)
    setStatus("reading")
    setError("")
    setData(null)
    setXml("")

    try {
      const { fullText } = await extractPdfText(file)
      if (!fullText.trim()) {
        throw new Error(
          "Não foi possível ler texto deste PDF. Ele pode ser uma imagem escaneada.",
        )
      }
      const parsed = parseNfe(fullText)
      const generated = buildXml(parsed)
      setData(parsed)
      setXml(generated)
      setStatus("done")
    } catch (err) {
      setStatus("error")
      setError(
        err instanceof Error ? err.message : "Erro ao processar o arquivo.",
      )
    }
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const download = useCallback(() => {
    const blob = new Blob([xml], { type: "application/xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = fileName.replace(/\.pdf$/i, "") + ".xml"
    a.click()
    URL.revokeObjectURL(url)
  }, [xml, fileName])

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(xml)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [xml])

  const reset = useCallback(() => {
    setStatus("idle")
    setFileName("")
    setData(null)
    setXml("")
    setError("")
    if (inputRef.current) inputRef.current.value = ""
  }, [])

  return (
    <div className="flex flex-col gap-6">
      {/* Área de upload */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-primary/50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          id="pdf-input"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />

        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
          {status === "reading" ? (
            <Loader2 className="size-7 animate-spin text-primary" />
          ) : (
            <Upload className="size-7 text-primary" />
          )}
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-base font-medium text-foreground">
            {status === "reading"
              ? "Processando o PDF..."
              : "Arraste a nota fiscal em PDF aqui"}
          </p>
          <p className="text-sm text-muted-foreground">
            ou clique no botão abaixo para selecionar o arquivo
          </p>
        </div>

        <Button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={status === "reading"}
        >
          <FileText className="size-4" />
          Selecionar PDF
        </Button>

        {fileName && status !== "reading" && (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-sm text-muted-foreground">
            <FileText className="size-4 shrink-0" />
            <span className="max-w-[240px] truncate">{fileName}</span>
            <button
              type="button"
              onClick={reset}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Remover arquivo"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
      </div>

      {/* Erro */}
      {status === "error" && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <X className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Resultado */}
      {status === "done" && data && (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Campos detectados
            </h2>
            <NfePreview data={data} />
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                XML gerado
              </h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copy}>
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
                <Button size="sm" onClick={download}>
                  <Download className="size-4" />
                  Baixar XML
                </Button>
              </div>
            </div>
            <pre className="max-h-[480px] overflow-auto rounded-xl border border-border bg-card p-4 font-mono text-xs leading-relaxed text-foreground">
              <code>{xml}</code>
            </pre>
            <Button variant="ghost" size="sm" onClick={reset} className="self-start">
              <RotateCcw className="size-4" />
              Converter outra nota
            </Button>
          </section>
        </div>
      )}
    </div>
  )
}
