"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { parseNFE, type NFEData } from "@/lib/nfe-parser"
import { generatePDF } from "@/lib/pdf-generator"
import { FileText, Upload, Download, AlertCircle, CheckCircle2, X } from "lucide-react"

export function XMLConverter() {
  const [file, setFile] = useState<File | null>(null)
  const [nfeData, setNfeData] = useState<NFEData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const processFile = useCallback(async (selectedFile: File) => {
    setError(null)
    setNfeData(null)

    if (!selectedFile.name.toLowerCase().endsWith(".xml")) {
      setError("Por favor, selecione um arquivo XML valido.")
      return
    }

    try {
      const text = await selectedFile.text()
      const data = parseNFE(text)
      setNfeData(data)
      setFile(selectedFile)
    } catch (err) {
      console.error(err)
      setError("Erro ao processar o arquivo XML. Verifique se o arquivo esta correto.")
    }
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      processFile(selectedFile)
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) {
        processFile(droppedFile)
      }
    },
    [processFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDownloadPDF = () => {
    if (!nfeData) return

    const doc = generatePDF(nfeData)
    const fileName = `NF_${nfeData.numero || "documento"}_${Date.now()}.pdf`
    doc.save(fileName)
  }

  const handleClear = () => {
    setFile(null)
    setNfeData(null)
    setError(null)
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex items-center justify-center rounded-full bg-primary/10 p-3">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Conversor XML para PDF
          </h1>
          <p className="mt-2 text-muted-foreground">
            Converta suas notas fiscais (NF-e / NFS-e) de XML para PDF
          </p>
        </div>

        {/* Upload Area */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Upload do Arquivo</CardTitle>
            <CardDescription>
              Arraste e solte ou clique para selecionar o arquivo XML
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <input
                type="file"
                accept=".xml"
                onChange={handleFileChange}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
              <Upload
                className={`mb-4 h-12 w-12 ${isDragOver ? "text-primary" : "text-muted-foreground"}`}
              />
              <p className="mb-1 text-sm font-medium text-foreground">
                {isDragOver ? "Solte o arquivo aqui" : "Arraste o arquivo XML aqui"}
              </p>
              <p className="text-xs text-muted-foreground">ou clique para selecionar</p>
              {file && (
                <div className="mt-4 flex items-center gap-2 rounded-md bg-muted px-3 py-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm">{file.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleClear()
                    }}
                    className="ml-2 rounded p-1 hover:bg-background"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-destructive">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        {nfeData && (
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Documento Processado
                </CardTitle>
                <CardDescription>
                  {nfeData.tipo === "NFe"
                    ? "Nota Fiscal Eletronica"
                    : nfeData.tipo === "NFSe"
                      ? "Nota Fiscal de Servicos"
                      : "Documento Fiscal"}
                </CardDescription>
              </div>
              <Button onClick={handleDownloadPDF} className="gap-2">
                <Download className="h-4 w-4" />
                Baixar PDF
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Info Geral */}
              <div className="grid gap-4 rounded-lg bg-muted/50 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Numero</p>
                  <p className="text-lg font-semibold">{nfeData.numero || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Serie</p>
                  <p className="text-lg font-semibold">{nfeData.serie || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Data Emissao</p>
                  <p className="text-lg font-semibold">{nfeData.dataEmissao || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">Valor Total</p>
                  <p className="text-lg font-semibold text-primary">
                    {formatCurrency(nfeData.totais.valorTotal)}
                  </p>
                </div>
              </div>

              {/* Emitente e Destinatario */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <h3 className="mb-3 font-semibold text-foreground">Emitente</h3>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">{nfeData.emitente.nome || "N/A"}</p>
                    {nfeData.emitente.nomeFantasia && (
                      <p className="text-muted-foreground">{nfeData.emitente.nomeFantasia}</p>
                    )}
                    <p className="text-muted-foreground">CNPJ: {nfeData.emitente.cnpj || "N/A"}</p>
                    {nfeData.emitente.endereco && (
                      <p className="text-muted-foreground">{nfeData.emitente.endereco}</p>
                    )}
                    {(nfeData.emitente.cidade || nfeData.emitente.uf) && (
                      <p className="text-muted-foreground">
                        {nfeData.emitente.cidade} - {nfeData.emitente.uf}
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <h3 className="mb-3 font-semibold text-foreground">Destinatario</h3>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">{nfeData.destinatario.nome || "N/A"}</p>
                    <p className="text-muted-foreground">
                      CPF/CNPJ: {nfeData.destinatario.cpfCnpj || "N/A"}
                    </p>
                    {nfeData.destinatario.endereco && (
                      <p className="text-muted-foreground">{nfeData.destinatario.endereco}</p>
                    )}
                    {(nfeData.destinatario.cidade || nfeData.destinatario.uf) && (
                      <p className="text-muted-foreground">
                        {nfeData.destinatario.cidade} - {nfeData.destinatario.uf}
                      </p>
                    )}
                    {nfeData.destinatario.email && (
                      <p className="text-muted-foreground">{nfeData.destinatario.email}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Itens */}
              {nfeData.itens.length > 0 && (
                <div>
                  <h3 className="mb-3 font-semibold text-foreground">Produtos / Servicos</h3>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">Descricao</th>
                          <th className="px-4 py-3 text-center font-medium">Qtd</th>
                          <th className="px-4 py-3 text-right font-medium">V. Unit</th>
                          <th className="px-4 py-3 text-right font-medium">V. Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {nfeData.itens.map((item, index) => (
                          <tr key={index} className="hover:bg-muted/50">
                            <td className="px-4 py-3">
                              <p className="font-medium">{item.descricao}</p>
                              {item.ncm && (
                                <p className="text-xs text-muted-foreground">NCM: {item.ncm}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {item.quantidade.toFixed(2)} {item.unidade}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {formatCurrency(item.valorUnitario)}
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {formatCurrency(item.valorTotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Totais */}
              <div className="rounded-lg border p-4">
                <h3 className="mb-3 font-semibold text-foreground">Resumo dos Valores</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Produtos/Servicos:</span>
                    <span className="font-medium">{formatCurrency(nfeData.totais.valorProdutos)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Desconto:</span>
                    <span className="font-medium">{formatCurrency(nfeData.totais.valorDesconto)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frete:</span>
                    <span className="font-medium">{formatCurrency(nfeData.totais.valorFrete)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ICMS:</span>
                    <span className="font-medium">{formatCurrency(nfeData.totais.valorICMS)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PIS:</span>
                    <span className="font-medium">{formatCurrency(nfeData.totais.valorPIS)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">COFINS:</span>
                    <span className="font-medium">{formatCurrency(nfeData.totais.valorCOFINS)}</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <span className="text-lg font-semibold">Valor Total:</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(nfeData.totais.valorTotal)}
                  </span>
                </div>
              </div>

              {/* Chave de Acesso */}
              {nfeData.chaveAcesso && (
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Chave de Acesso
                  </p>
                  <p className="mt-1 break-all font-mono text-sm">{nfeData.chaveAcesso}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
