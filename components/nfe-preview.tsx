import type { NfeData } from "@/lib/nfe-parser"

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">
        {value || <span className="text-muted-foreground">—</span>}
      </span>
    </div>
  )
}

export function NfePreview({ data }: { data: NfeData }) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Número" value={data.numero} />
        <Field label="Série" value={data.serie} />
        <Field label="Emissão" value={data.dataEmissao} />
        <Field label="Valor total" value={data.valorTotal} />
      </div>

      <Field label="Chave de acesso" value={data.chaveAcesso} />
      <Field label="Natureza da operação" value={data.naturezaOperacao} />

      <div className="border-t border-border pt-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Emitente
        </span>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nome" value={data.emitente.nome} />
          <Field label="CNPJ/CPF" value={data.emitente.documento} />
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Destinatário
        </span>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nome" value={data.destinatario.nome} />
          <Field label="CNPJ/CPF" value={data.destinatario.documento} />
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Itens ({data.itens.length})
        </span>
        {data.itens.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-2">
            {data.itens.slice(0, 8).map((item, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm text-foreground">
                    {item.descricao}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    Qtd: {item.quantidade ?? "—"}
                    {item.unidade ? ` ${item.unidade}` : ""}
                    {item.valorUnitario ? ` × ${item.valorUnitario}` : ""}
                  </span>
                </div>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {item.valorTotal ?? "—"}
                </span>
              </li>
            ))}
            {data.itens.length > 8 && (
              <li className="text-xs text-muted-foreground">
                + {data.itens.length - 8} item(ns) no XML
              </li>
            )}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Nenhum item identificado automaticamente.
          </p>
        )}
      </div>
    </div>
  )
}
