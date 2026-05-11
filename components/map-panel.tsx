'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { type NFEData } from "@/lib/nfe-parser"
import { Map, Pin, PinOff } from "lucide-react"

interface ProcessedFile {
  fileName: string
  nfeData: NFEData | null
}

interface MapPanelProps {
  files: Array<ProcessedFile>
}

export function MapPanel({ files }: MapPanelProps) {
  const filesWithAddress = files.filter(
    (file) =>
      file.nfeData &&
      file.nfeData.emitente.cidade &&
      file.nfeData.destinatario.cidade
  )

  const handleOpenMap = (nfe: NFEData) => {
    const origin = `${nfe.emitente.endereco || ''}, ${nfe.emitente.cidade}, ${nfe.emitente.uf}`
    const destination = `${nfe.destinatario.endereco || ''}, ${nfe.destinatario.cidade}, ${nfe.destinatario.uf}`
    
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`
    
    window.open(url, '_blank')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Map className="h-5 w-5" />
          Mapa de Rotas
        </CardTitle>
        <CardDescription>
          Visualize a rota entre o remetente e o destinatário de cada nota fiscal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {filesWithAddress.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
             <PinOff className="h-10 w-10 text-muted-foreground" />
            <p className="mt-4 text-sm font-medium text-muted-foreground">
              Nenhuma nota com dados de endereço suficientes foi encontrada.
            </p>
             <p className="mt-1 text-xs text-muted-foreground">
              Verifique se os arquivos XML contêm o endereço do emitente e do destinatário.
            </p>
          </div>
        ) : (
          <div className="max-h-[500px] space-y-3 overflow-y-auto">
            {filesWithAddress.map((file, index) => (
              <div key={index} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                         <p className="truncate font-semibold">{`NF ${file.nfeData!.numero} - ${file.fileName}`}</p>
                         <div className="mt-2 text-sm text-muted-foreground space-y-1">
                            <div className="flex items-start gap-2">
                                <Pin className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                                <p><span className="font-medium">Origem:</span> {`${file.nfeData!.emitente.cidade}-${file.nfeData!.emitente.uf}`}</p>
                            </div>
                            <div className="flex items-start gap-2">
                                <Pin className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                                 <p><span className="font-medium">Destino:</span> {`${file.nfeData!.destinatario.cidade}-${file.nfeData!.destinatario.uf}`}</p>
                            </div>
                         </div>
                    </div>
                    <Button onClick={() => handleOpenMap(file.nfeData!)} size="sm" variant="outline" className="ml-4 gap-2">
                        <Map className="h-4 w-4" />
                        Ver Rota
                    </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
