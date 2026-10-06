/**
 * Opens a print-ready window with formatted content. Browser's "Save as PDF"
 * generates the file that can be attached to WhatsApp.
 */
export function openPrintWindow(title, bodyHtml) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>${title}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Nunito', -apple-system, sans-serif; color: #0f172a; margin: 0; }
  .brand { display: flex; align-items: center; justify-content: space-between; padding-bottom: 16px; border-bottom: 3px solid #FF6B35; margin-bottom: 24px; }
  .brand .logo { font-family: 'Fredoka', sans-serif; font-size: 26px; color: #004E98; font-weight: 700; }
  .brand .sub { font-size: 12px; color: #64748b; }
  h1 { font-family: 'Fredoka', sans-serif; color: #004E98; font-size: 24px; margin: 0 0 4px 0; }
  h2 { font-family: 'Fredoka', sans-serif; color: #004E98; font-size: 16px; margin: 20px 0 8px; }
  .meta { color: #64748b; font-size: 12px; margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th { text-align: left; background: #FFF3EB; color: #FF6B35; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; }
  td { padding: 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
  .totals { margin-top: 16px; width: 260px; margin-left: auto; }
  .totals .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
  .totals .grand { font-family: 'Fredoka', sans-serif; font-size: 20px; color: #FF6B35; border-top: 2px solid #FF6B35; margin-top: 8px; padding-top: 8px; }
  pre { font-family: 'Nunito', sans-serif; white-space: pre-wrap; font-size: 12px; line-height: 1.55; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
  .b-in { background: #dcfce7; color: #15803d; }
  .b-out { background: #fee2e2; color: #b91c1c; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center; }
  .sign { display: flex; justify-content: space-between; margin-top: 60px; gap: 40px; }
  .sign > div { flex: 1; text-align: center; border-top: 1px solid #0f172a; padding-top: 6px; font-size: 12px; }
  @media print { .no-print { display: none; } }
</style>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@600;700&family=Nunito:wght@400;600;700&display=swap" rel="stylesheet">
</head><body>
${bodyHtml}
<div class="footer">Lany Infláveis · @lanyinflaveis · Documento gerado em ${new Date().toLocaleString("pt-BR")}</div>
<div class="no-print" style="position:fixed;top:12px;right:12px;">
  <button onclick="window.print()" style="background:#FF6B35;color:#fff;border:0;padding:10px 18px;border-radius:999px;font-weight:700;cursor:pointer">Salvar como PDF</button>
</div>
<script>setTimeout(() => window.print(), 500);</script>
</body></html>`);
  w.document.close();
}

const brand = (company) => `
<div class="brand">
  <div>
    <div class="logo">${company?.nome_fantasia || "Lany Infláveis"}</div>
    <div class="sub">${company?.instagram || "@lanyinflaveis"} · ${company?.whatsapp || ""}</div>
  </div>
  <div class="sub" style="text-align:right">${company?.cidade || ""} ${company?.estado ? "/ " + company.estado : ""}<br>${company?.email || ""}</div>
</div>`;

const money = (v) => `R$ ${(+v || 0).toFixed(2).replace(".", ",")}`;

export function printQuote({ quote, customer, toys, company }) {
  const itemsRows = (quote.toy_ids || []).map(id => {
    const t = toys.find(x => x.id === id);
    return `<tr><td>${t?.nome || id}</td><td>${t?.categoria || ""}</td><td style="text-align:right">${money(t?.valor_promocional || t?.valor_diaria || 0)}</td></tr>`;
  }).join("");
  const body = `
${brand(company)}
<h1>Orçamento ${quote.numero || ""}</h1>
<div class="meta">Emitido em ${new Date(quote.created_at).toLocaleDateString("pt-BR")} · Válido até ${quote.validade ? new Date(quote.validade).toLocaleDateString("pt-BR") : "—"}</div>

<h2>Cliente</h2>
<div>${customer?.nome || "—"}<br>${customer?.email || ""} · ${customer?.telefone || customer?.whatsapp || ""}</div>

<h2>Evento</h2>
<div>Início: ${quote.start_datetime ? new Date(quote.start_datetime).toLocaleString("pt-BR") : "—"}<br>
Término: ${quote.end_datetime ? new Date(quote.end_datetime).toLocaleString("pt-BR") : "—"}<br>
Local: ${quote.endereco_evento || "—"}</div>

<h2>Itens</h2>
<table><thead><tr><th>Brinquedo</th><th>Categoria</th><th style="text-align:right">Valor</th></tr></thead>
<tbody>${itemsRows || '<tr><td colspan="3">Sem itens</td></tr>'}</tbody></table>

<div class="totals">
  <div class="row"><span>Brinquedos</span><b>${money(quote.valor_brinquedos)}</b></div>
  <div class="row"><span>Serviços adicionais</span><b>${money(quote.servicos_adicionais)}</b></div>
  <div class="row"><span>Deslocamento</span><b>${money(quote.taxa_deslocamento)}</b></div>
  <div class="row"><span>Desconto</span><b>- ${money(quote.desconto)}</b></div>
  <div class="row grand"><span>TOTAL</span><span>${money(quote.valor_total)}</span></div>
</div>

<h2>Observações</h2>
<div style="font-size:13px;color:#475569">${quote.observacoes || "—"}</div>`;
  openPrintWindow(`Orcamento-${quote.numero}`, body);
}

export function printContract({ contract, company }) {
  const body = `
${brand(company)}
<h1>Contrato de Locação</h1>
<div class="meta">Emitido em ${new Date(contract.created_at).toLocaleDateString("pt-BR")}
${contract.status === "assinado" ? ` · <span class="badge b-in">Assinado</span>` : ` · <span class="badge b-out">Pendente</span>`}</div>
<pre>${(contract.content || "").replace(/[<>&]/g, c => ({"<":"&lt;",">":"&gt;","&":"&amp;"}[c]))}</pre>
${contract.status === "assinado" ? `
<div class="meta" style="margin-top:24px">
Assinado por <b>${contract.signed_by_name || ""}</b> (CPF ${contract.signed_by_cpf || ""})<br>
Data/hora: ${contract.signed_at ? new Date(contract.signed_at).toLocaleString("pt-BR") : ""}<br>
IP: ${contract.signed_ip || ""}<br>
Hash: <span style="font-family:monospace;font-size:10px">${contract.hash || ""}</span>
</div>` : `
<div class="sign">
  <div>Lany Infláveis (Locadora)</div>
  <div>Cliente (Locatário)</div>
</div>`}`;
  openPrintWindow(`Contrato-${contract.id}`, body);
}

export function printFinancial({ entries, company, filters = {} }) {
  const totalIn = entries.filter(e => e.tipo === "entrada").reduce((s, e) => s + (e.valor || 0), 0);
  const totalOut = entries.filter(e => e.tipo === "saida").reduce((s, e) => s + (e.valor || 0), 0);
  const rows = entries.map(e => `<tr>
    <td>${new Date(e.data).toLocaleDateString("pt-BR")}</td>
    <td><span class="badge ${e.tipo === "entrada" ? "b-in" : "b-out"}">${e.tipo}</span></td>
    <td>${e.categoria || ""}</td>
    <td>${e.descricao || ""}</td>
    <td style="text-align:right"><b>${money(e.valor)}</b></td></tr>`).join("");
  const body = `
${brand(company)}
<h1>Relatório Financeiro</h1>
<div class="meta">${filters.periodo || "Todos os lançamentos"} · Gerado em ${new Date().toLocaleDateString("pt-BR")}</div>

<table><thead><tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Descrição</th><th style="text-align:right">Valor</th></tr></thead>
<tbody>${rows || '<tr><td colspan="5">Sem lançamentos</td></tr>'}</tbody></table>

<div class="totals">
  <div class="row"><span>Total entradas</span><b style="color:#15803d">${money(totalIn)}</b></div>
  <div class="row"><span>Total saídas</span><b style="color:#b91c1c">${money(totalOut)}</b></div>
  <div class="row grand"><span>SALDO</span><span>${money(totalIn - totalOut)}</span></div>
</div>`;
  openPrintWindow(`Financeiro`, body);
}
