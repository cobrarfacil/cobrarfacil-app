import { useState, useEffect, useRef } from "react";

const BACKEND_URL = "https://cobrarfacil-backend-production.up.railway.app";

const fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtData = (d) => d ? new Date(d + "T12:00:00").toLocaleDateString("pt-BR") : "—";

// CSS global — micro-interações que dão sensação de resposta/qualidade sem
// precisar reescrever cada componente em inline style.
const GLOBAL_STYLES = `
  .cf-btn { transition: transform .12s ease, box-shadow .12s ease, filter .12s ease, opacity .12s ease; }
  .cf-btn:active:not(:disabled) { transform: scale(0.96); filter: brightness(0.96); }
  .cf-card { transition: transform .15s ease, box-shadow .15s ease; }
  .cf-card:active { transform: scale(0.98); }
  @keyframes cfFadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .cf-fade { animation: cfFadeUp .5s cubic-bezier(.16,1,.3,1) both; }
  @keyframes cfBarGrow { from { width: 0%; } }
  .cf-bar { animation: cfBarGrow 1.1s cubic-bezier(.16,1,.3,1) both; }
  @keyframes cfPulseRing { 0% { box-shadow: 0 0 0 0 rgba(74,222,128,0.5); } 70% { box-shadow: 0 0 0 6px rgba(74,222,128,0); } 100% { box-shadow: 0 0 0 0 rgba(74,222,128,0); } }
  * { -webkit-tap-highlight-color: transparent; }
`;

const statusColor = {
  pendente:   { bg: "#FEF3C7", text: "#D97706", label: "Pendente" },
  atrasado:   { bg: "#FEE2E2", text: "#DC2626", label: "Atrasado" },
  pago:       { bg: "#DCFCE7", text: "#16A34A", label: "Pago" },
  blacklist:  { bg: "#1F2937", text: "#F9FAFB", label: "🚫 Blacklist" },
};

const ETAPAS_INFO = {
  "d-3":  { label: "3 dias antes",  tom: "Amigável",  cor: "#3B82F6" },
  "d0":   { label: "No dia",        tom: "Urgente",   cor: "#EF4444" },
  "d+3":  { label: "3 dias após",   tom: "Cordial",   cor: "#F59E0B" },
  "d+15": { label: "15 dias após",  tom: "Firme",     cor: "#DC2626" },
  "d+30": { label: "30 dias após",  tom: "Final",     cor: "#7F1D1D" },
};

// ─── IMPORTAÇÃO INTELIGENTE DE PLANILHA ──────────────────────────────────────
// Detecta automaticamente as colunas certas mesmo em planilhas de outros
// sistemas (ex: exportação de sistema de salão), não só do nosso modelo.
function normalizarCabecalho(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// "unico": campo já vem sempre positivo (nosso modelo). "sinalizado": pode vir
// negativo (dívida) ou positivo (crédito, não cobrar) — comum em sistemas de
// salão que controlam saldo do cliente.
const ALIASES_COLUNA = {
  nome:      { tipo: "texto", aliases: ["nome", "cliente", "name", "nomecliente", "clientenome"] },
  telefone:  { tipo: "texto", aliases: ["telefone", "celular", "whatsapp", "fone", "contato", "tel", "numero", "numerocelular"] },
  valor:     { tipo: "unico", aliases: ["valor", "divida", "valordivida", "totaldivida"] },
  valorSinalizado: { tipo: "sinalizado", aliases: ["creditooudivida", "saldo", "debito", "creditodivida"] },
  vencimento:      { tipo: "texto", aliases: ["vencimento", "datavencimento", "prazo", "datalimite", "datadevencimento"] },
  dataReferencia:  { tipo: "texto", aliases: ["ultimamovimentacao", "ultimomovimento", "movimentacao", "dataultimacompra", "data"] },
  cpf:       { tipo: "texto", aliases: ["cpf", "documento", "cpfcnpj"] },
  email:     { tipo: "texto", aliases: ["email", "emailcliente", "mail"] },
  parcelas:  { tipo: "texto", aliases: ["parcelas", "parcela", "numparcelas", "qtdparcelas"] },
};

function parseValorBR(bruto) {
  if (bruto === null || bruto === undefined || bruto === "") return null;
  let s = String(bruto).replace(/[R$\s]/g, "");
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function parseDataBR(bruto) {
  if (!bruto) return null;
  const s = String(bruto).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = "20" + y;
    return y + "-" + mo.padStart(2, "0") + "-" + d.padStart(2, "0");
  }
  return null;
}

function mapearLinhaPlanilha(linhaOriginal) {
  const mapaNormalizado = {};
  Object.keys(linhaOriginal).forEach(chaveOriginal => {
    const norm = normalizarCabecalho(chaveOriginal);
    if (mapaNormalizado[norm] === undefined) mapaNormalizado[norm] = chaveOriginal;
  });

  const pegarBruto = (aliases) => {
    for (const alias of aliases) {
      if (mapaNormalizado[alias] !== undefined) {
        const v = linhaOriginal[mapaNormalizado[alias]];
        if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
      }
    }
    return "";
  };

  const nome = pegarBruto(ALIASES_COLUNA.nome.aliases);
  const telefone = pegarBruto(ALIASES_COLUNA.telefone.aliases);
  const cpf = pegarBruto(ALIASES_COLUNA.cpf.aliases);
  const email = pegarBruto(ALIASES_COLUNA.email.aliases);
  const parcelasBruto = pegarBruto(ALIASES_COLUNA.parcelas.aliases);

  // Valor: tenta coluna "única" (sempre positiva) primeiro, depois "sinalizada"
  let valorAbs = null, pular = false, motivoPular = "";
  const valorUnicoBruto = pegarBruto(ALIASES_COLUNA.valor.aliases);
  if (valorUnicoBruto) {
    valorAbs = Math.abs(parseValorBR(valorUnicoBruto) || 0);
  } else {
    const valorSinalizadoBruto = pegarBruto(ALIASES_COLUNA.valorSinalizado.aliases);
    const n = parseValorBR(valorSinalizadoBruto);
    if (n !== null) {
      if (n > 0) { pular = true; motivoPular = "Saldo positivo (crédito, não deve)"; valorAbs = n; }
      else valorAbs = Math.abs(n);
    }
  }

  // Vencimento: usa coluna explícita se existir; senão, infere da última movimentação
  let vencimento = parseDataBR(pegarBruto(ALIASES_COLUNA.vencimento.aliases));
  let vencimentoInferido = false;
  if (!vencimento) {
    const dataRef = parseDataBR(pegarBruto(ALIASES_COLUNA.dataReferencia.aliases));
    if (dataRef) { vencimento = dataRef; vencimentoInferido = true; }
  }

  if (!nome) pular = true, motivoPular = motivoPular || "Sem nome";
  if (!telefone) pular = true, motivoPular = motivoPular || "Sem telefone";
  if (valorAbs === null || valorAbs === 0) pular = pular || false; // valor 0 ainda é válido de importar, só não teria pra que cobrar — deixa passar, lojista decide

  return {
    nome, telefone, cpf, email,
    total_divida: valorAbs || 0,
    vencimento,
    vencimentoInferido,
    parcelas: parseInt(parcelasBruto) || 1,
    pular,
    motivoPular,
  };
}

// ─── DETECTA SE ESSA LINHA JÁ EXISTE NO CADASTRO (mesmo telefone ou nome) ────
// Compara pelos últimos 8 dígitos do telefone (ignora diferença de DDI/DDD já
// incluso ou não) e por nome exato (sem o sufixo "— Parcela X/Y"). Se achar,
// o lojista decide o que fazer — não substitui nem ignora sozinho.
function anotarDuplicado(linha, clientesExistentes) {
  const telNorm = String(linha.telefone || "").replace(/\D/g, "").slice(-8);
  const nomeNorm = String(linha.nome || "").trim().toLowerCase();
  const match = (clientesExistentes || []).find(c => {
    const cTelNorm = String(c.telefone || "").replace(/\D/g, "").slice(-8);
    const cNomeNorm = String(c.nome || "").replace(/ — Parcela \d+\/\d+$/, "").trim().toLowerCase();
    return (telNorm.length >= 8 && telNorm === cTelNorm) || (nomeNorm.length > 2 && nomeNorm === cNomeNorm);
  });
  if (!match) return { ...linha, duplicado: null, decisao: null };
  const ehPago = match.status === "pago";
  return {
    ...linha,
    duplicado: {
      clienteId: match.id,
      valorAntigo: match.total_divida,
      vencimentoAntigo: match.vencimento,
      pago: ehPago,
      dataPagamento: match.ultima_cobranca,
    },
    decisao: ehPago ? "nao_incluir" : "manter", // decisão padrão segura — lojista pode trocar
  };
}

const TIPOS_PIX = {
  cpf_cnpj:  { label: "CPF ou CNPJ",      placeholder: "000.000.000-00", normalizar: v => v.replace(/\D/g, ""), validar: v => { const d = v.replace(/\D/g, ""); return d.length === 11 || d.length === 14; }, erro: "CPF precisa ter 11 números, CNPJ 14 números." },
  telefone:  { label: "Telefone",         placeholder: "(44) 99999-0000", normalizar: v => { const d = v.replace(/\D/g, ""); const comPais = (d.length === 10 || d.length === 11) ? "55" + d : d; return "+" + comPais; }, validar: v => { const d = v.replace(/\D/g, ""); return d.length === 10 || d.length === 11; }, erro: "Telefone precisa ter DDD + número." },
  email:     { label: "E-mail",           placeholder: "seu@email.com", normalizar: v => v.trim().toLowerCase(), validar: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), erro: "E-mail inválido." },
  aleatoria: { label: "Chave aleatória",  placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", normalizar: v => v.trim(), validar: v => v.trim().length >= 20, erro: "Chave aleatória parece incompleta — copie certinho do seu banco." },
};

const MENSAGENS_PADRAO = {
  "d-3":  (n, v) => "Olá " + n.split(" ")[0] + "! 😊 Sua conta de *R$ " + parseFloat(v).toFixed(2).replace(".", ",") + "* vence em 3 dias. Qualquer dúvida é só chamar!",
  "d0":   (n, v) => "🔔 " + n.split(" ")[0] + ", hoje é o dia! Sua conta de *R$ " + parseFloat(v).toFixed(2).replace(".", ",") + "* vence hoje. Pague agora e fique em dia!",
  "d+3":  (n, v) => "Olá " + n.split(" ")[0] + "! Notamos que sua conta de *R$ " + parseFloat(v).toFixed(2).replace(".", ",") + "* ainda está em aberto. Podemos resolver juntos? 🤝",
  "d+15": (n, v) => n.split(" ")[0] + ", sua conta de *R$ " + parseFloat(v).toFixed(2).replace(".", ",") + "* está em atraso há 15 dias. Vamos resolver? 📞",
  "d+30": (n, v) => "AVISO: " + n.split(" ")[0] + ", seu débito de *R$ " + parseFloat(v).toFixed(2).replace(".", ",") + "* está há 30 dias em atraso. Entre em contato urgente.",
};

function useMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return isMobile;
}

const Ic = {
  dash:     () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  clients:  () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  charge:   () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  history:  () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  settings: () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  whatsapp: () => <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12.004 2C6.478 2 2 6.478 2 12.004c0 1.85.488 3.585 1.337 5.09L2 22l4.992-1.311A10 10 0 0 0 12.004 22C17.53 22 22 17.522 22 12.004 22 6.478 17.53 2 12.004 2z" opacity=".3"/></svg>,
  plus:     () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  send:     () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  alert:    () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  check:    () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>,
  close:    () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  money:    () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  trend:    () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  users:    () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>,
  bell:     () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  upload:   () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  qr:       () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM17 17h3v3h-3zM14 20h3"/></svg>,
  refresh:  () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  eye:      () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff:   () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  regua:    () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 12h18M3 6h18M3 18h18"/></svg>,
  edit:     () => <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash:    () => <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  report:   () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
};

const Badge = ({ status }) => {
  const s = statusColor[status] || { bg: "#F1F5F9", text: "#64748B", label: status };
  return <span style={{ background: s.bg, color: s.text, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{s.label}</span>;
};

const Modal = ({ title, children, onClose, wide }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    onClick={e => e.target === e.currentTarget && onClose()}>
    <div style={{ background: "#fff", borderRadius: 20, width: "100%", maxWidth: wide ? 760 : 560, maxHeight: "92vh", overflow: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.25)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", borderBottom: "1px solid #F1F5F9", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0B2B24" }}>{title}</h3>
        <button onClick={onClose} style={{ background: "#F1F5F9", border: "none", borderRadius: 8, width: 34, height: 34, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B" }}><Ic.close /></button>
      </div>
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  </div>
);

const Inp = ({ label, ...props }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5 }}>{label}</label>}
    <input {...props} style={{ width: "100%", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "12px 14px", fontSize: 15, color: "#0B2B24", outline: "none", boxSizing: "border-box", background: "#F8FAFC", ...props.style }} />
  </div>
);

const Sel = ({ label, children, ...props }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5 }}>{label}</label>}
    <select {...props} style={{ width: "100%", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "12px 14px", fontSize: 15, color: "#0B2B24", outline: "none", background: "#F8FAFC", cursor: "pointer", boxSizing: "border-box" }}>{children}</select>
  </div>
);

const Btn = ({ children, onClick, variant = "primary", small, style: s = {}, disabled }) => {
  const v = {
    primary: { background: "linear-gradient(135deg, #2563EB, #1E3A8A)", color: "#fff", border: "none", boxShadow: "0 3px 10px rgba(30,64,175,0.3)" },
    green:   { background: "linear-gradient(135deg, #22C55E, #15803D)", color: "#fff", border: "none", boxShadow: "0 3px 10px rgba(21,128,61,0.3)" },
    danger:  { background: "linear-gradient(135deg, #EF4444, #B91C1C)", color: "#fff", border: "none", boxShadow: "0 3px 10px rgba(185,28,28,0.28)" },
    ghost:   { background: "#F1F5F9", color: "#374151", border: "none", boxShadow: "none" },
    outline: { background: "transparent", color: "#1E40AF", border: "1.5px solid #1E40AF", boxShadow: "none" },
    orange:  { background: "linear-gradient(135deg, #FBBF24, #D97706)", color: "#fff", border: "none", boxShadow: "0 3px 10px rgba(217,119,6,0.28)" },
  };
  return <button className="cf-btn" onClick={onClick} disabled={disabled} style={{ ...v[variant], borderRadius: 11, padding: small ? "8px 14px" : "12px 20px", fontSize: small ? 13 : 15, fontWeight: 700, letterSpacing: "-0.1px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1, display: "inline-flex", alignItems: "center", gap: 6, ...s }}>{children}</button>;
};

const ToastMsg = ({ msg, type }) => (
  <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", background: type === "success" ? "#16A34A" : "#DC2626", color: "#fff", borderRadius: 12, padding: "12px 24px", fontSize: 14, fontWeight: 600, zIndex: 3000, boxShadow: "0 4px 20px rgba(0,0,0,0.25)", maxWidth: "90vw", textAlign: "center" }}>{msg}</div>
);

const SenhaInput = ({ label, value, onChange, placeholder, onKeyDown }) => {
  const [mostrar, setMostrar] = useState(false);
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5 }}>{label}</label>}
      <div style={{ position: "relative" }}>
        <input type={mostrar ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder} onKeyDown={onKeyDown}
          style={{ width: "100%", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "12px 48px 12px 14px", fontSize: 15, color: "#0B2B24", outline: "none", boxSizing: "border-box", background: "#F8FAFC" }} />
        <button type="button" onClick={() => setMostrar(p => !p)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94A3B8", display: "flex", alignItems: "center", padding: 0 }}>
          {mostrar ? <Ic.eyeOff /> : <Ic.eye />}
        </button>
      </div>
    </div>
  );
};

function api(path, options = {}, token = "") {
  return fetch(BACKEND_URL + path, {
    ...options,
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token, ...(options.headers || {}) }
  }).then(r => r.json()).catch(() => ({ erro: "Erro de conexão" }));
}

function TrocarSenha({ token, onSucesso }) {
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const trocar = async () => {
    setErro("");
    if (novaSenha.length < 6) { setErro("Mínimo 6 caracteres"); return; }
    if (novaSenha !== confirmar) { setErro("Senhas não coincidem"); return; }
    setLoading(true);
    const data = await api("/auth/trocar-senha", { method: "POST", body: JSON.stringify({ senha_nova: novaSenha }) }, token);
    if (data.sucesso) onSucesso(); else setErro(data.erro || "Erro");
    setLoading(false);
  };
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0B2B24, #1E40AF)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, background: "linear-gradient(135deg, #F59E0B, #D97706)", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 30 }}>🔑</div>
          <h2 style={{ color: "#fff", fontSize: 24, fontWeight: 800, margin: "0 0 8px" }}>Crie sua senha</h2>
          <p style={{ color: "#94A3B8", fontSize: 15, margin: 0 }}>Por segurança, defina sua senha antes de continuar</p>
        </div>
        <div style={{ background: "#fff", borderRadius: 20, padding: 28, boxShadow: "0 25px 80px rgba(0,0,0,0.3)" }}>
          <SenhaInput label="Nova senha" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
          <SenhaInput label="Confirmar senha" value={confirmar} onChange={e => setConfirmar(e.target.value)} placeholder="Repita a nova senha" onKeyDown={e => e.key === "Enter" && trocar()} />
          {erro && <div style={{ background: "#FEF2F2", color: "#DC2626", borderRadius: 8, padding: "10px 14px", fontSize: 14, marginBottom: 14 }}>{erro}</div>}
          <Btn onClick={trocar} disabled={loading || !novaSenha || !confirmar} style={{ width: "100%", justifyContent: "center" }}>{loading ? "Salvando..." : "🔑 Definir senha e entrar"}</Btn>
        </div>
      </div>
    </div>
  );
}

function OnboardingWizard({ token, onCompleto, onPular }) {
  const [etapa, setEtapa] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const [qrCode, setQrCode] = useState(null);
  const [wppStatus, setWppStatus] = useState(null);
  const [loadingQr, setLoadingQr] = useState(false);

  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [salvandoNome, setSalvandoNome] = useState(false);

  const [pixTipo, setPixTipo] = useState("cpf_cnpj");
  const [pixInput, setPixInput] = useState("");
  const [salvandoPix, setSalvandoPix] = useState(false);

  const [modoAdd, setModoAdd] = useState(null);
  const [novoCliente, setNovoCliente] = useState({ nome: "", telefone: "", total_divida: "", vencimento: "" });
  const [csvPreview, setCsvPreview] = useState([]);
  const [salvandoCliente, setSalvandoCliente] = useState(false);
  const fileRef = useRef();

  const [mostrarCelebra, setMostrarCelebra] = useState(false);

  useEffect(() => {
    (async () => {
      const [me, wpp, clis] = await Promise.all([
        api("/usuarios/me", {}, token),
        api("/whatsapp/status", {}, token).catch(() => ({})),
        api("/clientes", {}, token).catch(() => []),
      ]);
      const conectado = wpp?.state === "open" || wpp?.instance?.state === "open";
      if (me.nome_empresa) setNomeEmpresa(me.nome_empresa);
      if (me.pix_key) { setPixInput(me.pix_key); if (me.pix_key_tipo && TIPOS_PIX[me.pix_key_tipo]) setPixTipo(me.pix_key_tipo); }

      if (!conectado) setEtapa(1);
      else if (!me.nome_empresa) setEtapa(2);
      else if (!me.pix_key) setEtapa(3);
      else if (!Array.isArray(clis) || clis.length === 0) setEtapa(4);
      else { onCompleto(); return; }
      setCarregando(false);
    })();
  }, []);

  const conectarWpp = async () => {
    setLoadingQr(true); setQrCode(null); setWppStatus(null);
    const data = await api("/whatsapp/qrcode", {}, token);
    if (data.base64) { const src = data.base64.startsWith("data:") ? data.base64 : "data:image/png;base64," + data.base64; setQrCode(src); }
    else setWppStatus("Erro ao gerar QR Code. Tente de novo.");
    setLoadingQr(false);
  };
  useEffect(() => {
    if (!qrCode) return;
    const interval = setInterval(async () => {
      const data = await api("/whatsapp/status", {}, token);
      if (data.state === "open" || data.instance?.state === "open") {
        setQrCode(null); clearInterval(interval);
        showToast("✅ WhatsApp conectado!");
        setTimeout(() => setEtapa(2), 700);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [qrCode]);

  const salvarNomeEmpresa = async () => {
    if (!nomeEmpresa.trim()) return;
    setSalvandoNome(true);
    const data = await api("/usuarios/nome-empresa", { method: "PUT", body: JSON.stringify({ nome_empresa: nomeEmpresa.trim() }) }, token);
    setSalvandoNome(false);
    if (data.sucesso) { showToast("Nome salvo!"); setEtapa(3); }
    else showToast(data.erro || "Erro", "error");
  };

  const salvarPix = async () => {
    if (!pixInput.trim()) return;
    const config = TIPOS_PIX[pixTipo];
    if (!config.validar(pixInput)) { showToast(config.erro, "error"); return; }
    setSalvandoPix(true);
    const chaveNormalizada = config.normalizar(pixInput);
    const data = await api("/usuarios/pix-key", { method: "PUT", body: JSON.stringify({ pix_key: chaveNormalizada, pix_key_tipo: pixTipo }) }, token);
    setSalvandoPix(false);
    if (data.sucesso) { showToast("Chave Pix salva!"); setEtapa(4); }
    else showToast(data.erro || "Erro", "error");
  };

  const salvarClienteManual = async () => {
    if (!novoCliente.nome || !novoCliente.telefone || !novoCliente.total_divida) { showToast("Preencha nome, telefone e valor", "error"); return; }
    setSalvandoCliente(true);
    const data = await api("/clientes", { method: "POST", body: JSON.stringify(novoCliente) }, token);
    setSalvandoCliente(false);
    if (data.id || data.criados) setMostrarCelebra(true);
    else showToast(data.erro || "Erro", "error");
  };

  const handleCSVWizard = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const texto = await file.text();
    const linhas = texto.split("\n").filter(l => l.trim());
    const header = linhas[0].split(/[,;]/);
    const mapeado = linhas.slice(1).map(linha => {
      const cols = linha.split(/[,;]/); const obj = {};
      header.forEach((h, i) => { obj[h.trim()] = (cols[i] || "").trim().replace(/"/g, ""); });
      return mapearLinhaPlanilha(obj);
    });
    setCsvPreview(mapeado);
  };

  const importarWizard = async () => {
    const lista = csvPreview.filter(c => !c.pular).map(c => ({ nome: c.nome, telefone: c.telefone, total_divida: c.total_divida, cpf: c.cpf, email: c.email, vencimento: c.vencimento, parcelas: c.parcelas }));
    if (lista.length === 0) { showToast("Nenhum cliente válido encontrado no arquivo", "error"); return; }
    setSalvandoCliente(true);
    const data = await api("/clientes/importar", { method: "POST", body: JSON.stringify({ clientes: lista }) }, token);
    setSalvandoCliente(false);
    if (data.sucesso && data.importados > 0) setMostrarCelebra(true);
    else showToast(data.erro || "Erro ao importar", "error");
  };

  if (carregando) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0B2B24", color: "#fff", fontFamily: "'Inter', sans-serif" }}>Carregando...</div>;

  const passos = [{ n: 1, label: "WhatsApp" }, { n: 2, label: "Negócio" }, { n: 3, label: "Pix" }, { n: 4, label: "Clientes" }];
  const proximaHora8h = () => {
    const agora = new Date(); const hoje8 = new Date(); hoje8.setHours(8, 0, 0, 0);
    return agora < hoje8 ? "hoje às 8h" : "amanhã às 8h";
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0B2B24 0%, #023B32 100%)", display: "flex", flexDirection: "column", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{GLOBAL_STYLES}</style>
      {toast && <div className="cf-fade" style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", background: toast.type === "error" ? "#DC2626" : "#16A34A", color: "#fff", padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600, zIndex: 200, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>{toast.msg}</div>}

      {mostrarCelebra && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 20 }}>
          <div className="cf-fade" style={{ background: "#fff", borderRadius: 20, padding: "34px 26px", maxWidth: 380, textAlign: "center" }}>
            <div style={{ fontSize: 54, marginBottom: 14 }}>🎉</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", marginBottom: 10 }}>Tudo pronto!</div>
            <div style={{ fontSize: 14.5, color: "#374151", lineHeight: 1.65, marginBottom: 20 }}>
              Fique tranquilo — a partir de <strong>{proximaHora8h()}</strong>, o sistema confere sozinho quem está no dia certo e manda a cobrança, com QR Code Pix.
              <br /><br />
              <strong style={{ color: "#0E8F63" }}>E não para no primeiro aviso:</strong> continua cobrando até seu cliente pagar — ou até você decidir suspender.
            </div>
            <Btn onClick={onCompleto} style={{ width: "100%", justifyContent: "center" }}>Entrar no sistema →</Btn>
          </div>
        </div>
      )}

      <div style={{ padding: "22px 20px 0", display: "flex", alignItems: "center", gap: 10 }}>
        <img src="/logo-192.png" alt="CobrarFácil" style={{ width: 34, height: 34, borderRadius: "50%" }} />
        <div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>CobrarFácil</div>
      </div>

      <div style={{ padding: "20px 20px 0", display: "flex", gap: 8, justifyContent: "center", maxWidth: 400, margin: "0 auto", width: "100%" }}>
        {passos.map(p => (
          <div key={p.n} style={{ flex: 1 }}>
            <div style={{ height: 4, borderRadius: 99, background: p.n <= etapa ? "#4ADE80" : "rgba(255,255,255,0.15)", marginBottom: 6, transition: "background .3s" }} />
            <div style={{ fontSize: 10, color: p.n <= etapa ? "#4ADE80" : "#64748B", textAlign: "center", fontWeight: 700 }}>{p.label}</div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div key={etapa} className="cf-fade" style={{ background: "#fff", borderRadius: 20, padding: "28px 24px", maxWidth: 400, width: "100%" }}>

          {etapa === 1 && (
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0E8F63", marginBottom: 6, letterSpacing: 0.5 }}>PASSO 1 DE 4</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", margin: "0 0 8px" }}>Conecte seu WhatsApp</h2>
              <p style={{ fontSize: 13.5, color: "#64748B", marginBottom: 18, lineHeight: 1.5 }}>É por esse número que as cobranças vão sair — seu cliente reconhece quem está cobrando.</p>
              {qrCode ? (
                <div style={{ textAlign: "center" }}>
                  <img src={qrCode} alt="QR Code" style={{ width: 200, height: 200, borderRadius: 10, border: "2px solid #E2E8F0", marginBottom: 12 }} />
                  <div style={{ fontSize: 12, color: "#64748B" }}>Escaneie com o WhatsApp do seu negócio — confirma sozinho, não precisa clicar em nada.</div>
                </div>
              ) : (
                <Btn onClick={conectarWpp} disabled={loadingQr} style={{ width: "100%", justifyContent: "center" }}>{loadingQr ? "Gerando..." : "📱 Gerar QR Code"}</Btn>
              )}
              {wppStatus && <div style={{ marginTop: 10, fontSize: 13, color: "#DC2626" }}>{wppStatus}</div>}
            </div>
          )}

          {etapa === 2 && (
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0E8F63", marginBottom: 6, letterSpacing: 0.5 }}>PASSO 2 DE 4</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", margin: "0 0 8px" }}>Qual o nome do seu negócio?</h2>
              <p style={{ fontSize: 13.5, color: "#64748B", marginBottom: 18, lineHeight: 1.5 }}>Esse nome aparece em toda cobrança — use o que seu cliente reconhece (ex: "Salão Bella").</p>
              <Inp label="Nome do negócio" value={nomeEmpresa} onChange={e => setNomeEmpresa(e.target.value)} placeholder="Ex: Salão Bella" />
              <Btn onClick={salvarNomeEmpresa} disabled={salvandoNome || !nomeEmpresa.trim()} style={{ width: "100%", justifyContent: "center" }}>{salvandoNome ? "Salvando..." : "Continuar →"}</Btn>
            </div>
          )}

          {etapa === 3 && (
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0E8F63", marginBottom: 6, letterSpacing: 0.5 }}>PASSO 3 DE 4</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", margin: "0 0 8px" }}>Sua chave Pix</h2>
              <p style={{ fontSize: 13.5, color: "#64748B", marginBottom: 18, lineHeight: 1.5 }}>Aparece automaticamente em toda cobrança com QR Code — o valor já cai direto na sua conta.</p>
              <Sel label="Tipo de chave" value={pixTipo} onChange={e => setPixTipo(e.target.value)}>
                {Object.entries(TIPOS_PIX).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Sel>
              <Inp label="Chave Pix" value={pixInput} onChange={e => setPixInput(e.target.value)} placeholder={TIPOS_PIX[pixTipo].placeholder} />
              <Btn onClick={salvarPix} disabled={salvandoPix || !pixInput.trim()} style={{ width: "100%", justifyContent: "center" }}>{salvandoPix ? "Salvando..." : "Continuar →"}</Btn>
            </div>
          )}

          {etapa === 4 && (
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0E8F63", marginBottom: 6, letterSpacing: 0.5 }}>PASSO 4 DE 4 · ÚLTIMO PASSO</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", margin: "0 0 8px" }}>Cadastre seus clientes</h2>
              <p style={{ fontSize: 13.5, color: "#64748B", marginBottom: 18, lineHeight: 1.5 }}>Assim que tiver o primeiro cliente, o sistema já entra em ação.</p>

              {!modoAdd && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <Btn onClick={() => setModoAdd("manual")} style={{ width: "100%", justifyContent: "center" }}>+ Cadastrar um cliente</Btn>
                  <Btn variant="outline" onClick={() => setModoAdd("planilha")} style={{ width: "100%", justifyContent: "center" }}>📎 Importar planilha (CSV)</Btn>
                </div>
              )}

              {modoAdd === "manual" && (
                <div>
                  <Inp label="Nome do cliente" value={novoCliente.nome} onChange={e => setNovoCliente(p => ({ ...p, nome: e.target.value }))} />
                  <Inp label="Telefone (WhatsApp)" value={novoCliente.telefone} onChange={e => setNovoCliente(p => ({ ...p, telefone: e.target.value }))} placeholder="(44) 99999-0000" />
                  <Inp label="Valor da dívida (R$)" type="number" value={novoCliente.total_divida} onChange={e => setNovoCliente(p => ({ ...p, total_divida: e.target.value }))} />
                  <Inp label="Vencimento" type="date" value={novoCliente.vencimento} onChange={e => setNovoCliente(p => ({ ...p, vencimento: e.target.value }))} />
                  <Btn onClick={salvarClienteManual} disabled={salvandoCliente} style={{ width: "100%", justifyContent: "center", marginTop: 6 }}>{salvandoCliente ? "Salvando..." : "Finalizar →"}</Btn>
                  <Btn variant="ghost" onClick={() => setModoAdd(null)} style={{ width: "100%", justifyContent: "center", marginTop: 8 }}>← Voltar</Btn>
                </div>
              )}

              {modoAdd === "planilha" && (
                <div>
                  {csvPreview.length === 0 ? (
                    <div>
                      <input ref={fileRef} type="file" accept=".csv" onChange={handleCSVWizard} style={{ display: "none" }} />
                      <Btn onClick={() => fileRef.current.click()} style={{ width: "100%", justifyContent: "center" }}>📎 Escolher arquivo CSV</Btn>
                      <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 10, textAlign: "center", lineHeight: 1.5 }}>Planilha grande, Excel, ou de outro sistema? Depois de entrar, use a tela "Clientes" — lá tem o importador completo, com detecção automática de coluna.</div>
                      <Btn variant="ghost" onClick={() => setModoAdd(null)} style={{ width: "100%", justifyContent: "center", marginTop: 12 }}>← Voltar</Btn>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 13.5, marginBottom: 14, color: "#374151" }}><strong>{csvPreview.filter(c => !c.pular).length}</strong> cliente(s) prontos pra importar</div>
                      <Btn onClick={importarWizard} disabled={salvandoCliente} style={{ width: "100%", justifyContent: "center" }}>{salvandoCliente ? "Importando..." : "Finalizar →"}</Btn>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "0 20px 8px" }}>
        <button onClick={onPular} className="cf-btn" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}>Pular por agora, configuro depois</button>
      </div>
      <div style={{ textAlign: "center", padding: "0 20px 24px", fontSize: 12, color: "#64748B" }}>
        💡 Um dia sem cadastrar é um dia sem cobrar — pode terminar em menos de 5 minutos.
      </div>
    </div>
  );
}

function Checkout({ planoInicial, onVoltar }) {
  const [step, setStep] = useState(1);
  const [plano, setPlano] = useState(planoInicial || "trimestral");
  const [formaPag, setFormaPag] = useState("pix");
  const [dados, setDados] = useState({ nome: "", email: "", cpf: "", telefone: "" });
  const [cartao, setCartao] = useState({ numero: "", nome: "", validade: "", cvv: "" });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState(null);
  const planos = {
    mensal:     { nome: "Mensal",     valor: 14700,  label: "R$147/mês",  economia: null,              parcelas: 1 },
    trimestral: { nome: "Trimestral", valor: 35700,  label: "R$119/mês",  economia: "Economize R$84",  parcelas: 2 },
    anual:      { nome: "Anual",      valor: 116400, label: "R$97/mês",   economia: "Economize R$600", parcelas: 3 },
  };
  const planoSel = planos[plano];
  const pagar = async () => {
    setErro(""); setLoading(true);
    try {
      const res = await fetch(BACKEND_URL + "/checkout/criar-pedido", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...dados, plano, metodo_pagamento: formaPag, parcelas: planoSel.parcelas }) });
      const data = await res.json();
      if (data.id) { setResultado(data); setStep(3); } else setErro(data.erro || "Erro");
    } catch { setErro("Erro de conexão"); }
    setLoading(false);
  };
  const pixCode = resultado?.charges?.[0]?.last_transaction?.qr_code;
  const pixUrl  = resultado?.charges?.[0]?.last_transaction?.qr_code_url;
  const [pagamentoConfirmado, setPagamentoConfirmado] = useState(false);

  // Confirma sozinho quando o Pix cai — sem navegar pra lugar nenhum. O login
  // continua manual, porque a senha só chega por WhatsApp alguns segundos depois.
  useEffect(() => {
    if (!pixCode || pagamentoConfirmado || !dados.email) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(BACKEND_URL + "/checkout/status?email=" + encodeURIComponent(dados.email));
        const data = await res.json();
        if (data.pago) { setPagamentoConfirmado(true); clearInterval(interval); }
      } catch {}
    }, 4000);
    return () => clearInterval(interval);
  }, [pixCode, pagamentoConfirmado, dados.email]);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0B2B24, #1E40AF)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <button onClick={onVoltar} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10, width: 38, height: 38, cursor: "pointer", color: "#fff", fontSize: 20 }}>←</button>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>CobrarFácil</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 20, padding: 24, boxShadow: "0 25px 80px rgba(0,0,0,0.3)" }}>
          {step === 1 && (
            <div>
              <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 800 }}>Seus dados</h2>
              <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                {Object.entries(planos).map(([k, p]) => (
                  <div key={k} onClick={() => setPlano(k)} style={{ flex: 1, background: plano === k ? "#EFF6FF" : "#F8FAFC", border: "2px solid " + (plano === k ? "#1E40AF" : "#E2E8F0"), borderRadius: 12, padding: "10px 6px", textAlign: "center", cursor: "pointer" }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: plano === k ? "#1E40AF" : "#0B2B24" }}>{p.nome}</div>
                    <div style={{ fontSize: 12, color: "#64748B" }}>{p.label}</div>
                    {p.economia && <div style={{ fontSize: 10, color: "#16A34A", fontWeight: 700 }}>🎁 {p.economia}</div>}
                  </div>
                ))}
              </div>
              <Inp label="Nome completo *" value={dados.nome} onChange={e => setDados(p => ({ ...p, nome: e.target.value }))} placeholder="João da Silva" />
              <Inp label="E-mail *" type="email" value={dados.email} onChange={e => setDados(p => ({ ...p, email: e.target.value }))} placeholder="seu@email.com" />
              <Inp label="CPF *" value={dados.cpf} onChange={e => setDados(p => ({ ...p, cpf: e.target.value }))} placeholder="000.000.000-00" />
              <Inp label="WhatsApp *" value={dados.telefone} onChange={e => setDados(p => ({ ...p, telefone: e.target.value }))} placeholder="(44) 99999-0000" />
              {erro && <div style={{ background: "#FEF2F2", color: "#DC2626", borderRadius: 8, padding: "10px 14px", fontSize: 14, marginBottom: 14 }}>{erro}</div>}
              <Btn onClick={() => { if (!dados.nome || !dados.email || !dados.cpf || !dados.telefone) { setErro("Preencha todos os campos"); return; } setErro(""); setStep(2); }} style={{ width: "100%", justifyContent: "center" }}>Continuar →</Btn>
            </div>
          )}
          {step === 2 && (
            <div>
              <h2 style={{ margin: "0 0 16px", fontSize: 20, fontWeight: 800 }}>Pagamento</h2>
              <div style={{ background: "#F0FDF4", borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 700 }}>Plano {planoSel.nome}</div>
                <div style={{ fontWeight: 900, fontSize: 22, color: "#1E40AF" }}>{(planoSel.valor / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {[["pix", "💠 Pix"], ["cartao", "💳 Cartão"]].map(([k, l]) => (
                  <div key={k} onClick={() => setFormaPag(k)} style={{ flex: 1, background: formaPag === k ? "#EFF6FF" : "#F8FAFC", border: "2px solid " + (formaPag === k ? "#1E40AF" : "#E2E8F0"), borderRadius: 12, padding: "14px", textAlign: "center", cursor: "pointer", fontSize: 15, fontWeight: 600, color: formaPag === k ? "#1E40AF" : "#64748B" }}>{l}</div>
                ))}
              </div>
              {formaPag === "pix" && (
                <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#1E40AF", lineHeight: 1.5 }}>
                  💡 Ao pagar, o Pix vai mostrar <strong>"Look Up Moda"</strong> como recebedor — é a razão social que processa nossos pagamentos com segurança. Tudo certo, é assim que funciona pelo Banco Central.
                </div>
              )}
              {formaPag === "cartao" && (
                <div>
                  <Inp label="Número do cartão" value={cartao.numero} onChange={e => setCartao(p => ({ ...p, numero: e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim() }))} placeholder="0000 0000 0000 0000" maxLength={19} />
                  <Inp label="Nome no cartão" value={cartao.nome} onChange={e => setCartao(p => ({ ...p, nome: e.target.value.toUpperCase() }))} placeholder="NOME SOBRENOME" />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Inp label="Validade" value={cartao.validade} onChange={e => { let v = e.target.value.replace(/\D/g, ''); if (v.length >= 2) v = v.slice(0,2) + '/' + v.slice(2,4); setCartao(p => ({ ...p, validade: v })); }} placeholder="MM/AA" maxLength={5} />
                    <Inp label="CVV" value={cartao.cvv} onChange={e => setCartao(p => ({ ...p, cvv: e.target.value.replace(/\D/g, '') }))} placeholder="123" maxLength={4} />
                  </div>
                </div>
              )}
              {erro && <div style={{ background: "#FEF2F2", color: "#DC2626", borderRadius: 8, padding: "10px 14px", fontSize: 14, marginBottom: 14 }}>{erro}</div>}
              <Btn onClick={pagar} disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "16px" }}>{loading ? "Processando..." : formaPag === "pix" ? "💠 Gerar QR Code Pix" : "💳 Pagar com cartão"}</Btn>
              <div style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", marginTop: 10 }}>🔒 Pagamento seguro via Pagar.me · 7 dias de garantia</div>
            </div>
          )}
          {step === 3 && (
            <div style={{ textAlign: "center" }}>
              {pagamentoConfirmado ? (
                <>
                  <div style={{ fontSize: 60, marginBottom: 16 }}>✅</div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: "#16A34A" }}>Pagamento confirmado!</h2>
                  <p style={{ color: "#64748B", fontSize: 15, marginBottom: 24 }}>Seu login e senha já foram enviados no WhatsApp <strong>{dados.telefone}</strong>. Confira lá e acesse quando quiser — sem pressa.</p>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Pedido confirmado!</h2>
                  <p style={{ color: "#64748B", fontSize: 15, marginBottom: 24 }}>Você receberá seu login via WhatsApp em instantes no número <strong>{dados.telefone}</strong>.</p>
                </>
              )}
              {pixCode && !pagamentoConfirmado && (
                <div style={{ background: "#F8FAFC", borderRadius: 14, padding: 20, marginBottom: 20, border: "1px solid #E2E8F0" }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>💠 QR Code Pix</div>
                  {pixUrl && <img src={pixUrl} alt="QR Code Pix" style={{ width: 200, height: 200, borderRadius: 8 }} />}
                  <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 12px", fontFamily: "monospace", fontSize: 11, wordBreak: "break-all", color: "#374151", marginTop: 12 }}>{pixCode}</div>
                  <button onClick={() => navigator.clipboard?.writeText(pixCode)} style={{ marginTop: 10, background: "#1E40AF", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>📋 Copiar código Pix</button>
                  <div style={{ marginTop: 14, fontSize: 12, color: "#94A3B8" }}>⏳ Assim que o Pix cair, esta tela confirma sozinha — não precisa recarregar nem sair daqui.</div>
                </div>
              )}
              <button onClick={onVoltar} style={{ background: "#F1F5F9", border: "none", borderRadius: 10, padding: "12px 24px", fontSize: 15, fontWeight: 600, cursor: "pointer", color: "#374151" }}>Voltar ao login</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [aba, setAba] = useState("login");
  const [checkout, setCheckout] = useState(false);
  const [planoCheckout, setPlanoCheckout] = useState("trimestral");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [recuperando, setRecuperando] = useState(false);
  const [emailRec, setEmailRec] = useState("");
  const [recEnviada, setRecEnviada] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get("plano");
    if (p && ["mensal", "trimestral", "anual"].includes(p)) { setPlanoCheckout(p); setCheckout(true); }
  }, []);

  if (checkout) return <Checkout planoInicial={planoCheckout} onVoltar={() => setCheckout(false)} />;

  const go = async () => {
    setErro("");
    if (!email || !senha) { setErro("Preencha e-mail e senha"); return; }
    setLoading(true);
    const data = await api("/auth/login", { method: "POST", body: JSON.stringify({ email, senha }) });
    if (data.token) {
      localStorage.setItem("cobrarfacil_token", data.token);
      localStorage.setItem("cobrarfacil_usuario", JSON.stringify(data.usuario));
      onLogin({ isAdmin: data.usuario?.plano === "admin", usuario: data.usuario, token: data.token });
    } else setErro(data.erro || "Email ou senha incorretos");
    setLoading(false);
  };

  const recuperar = async () => {
    if (!emailRec) return;
    setLoading(true);
    await api("/auth/recuperar-senha", { method: "POST", body: JSON.stringify({ email: emailRec }) });
    setRecEnviada(true);
    setLoading(false);
  };

  const planos = [
    { key: "mensal",     nome: "Mensal",     preco: "R$147", sub: "/mês", cor: "#3B82F6" },
    { key: "trimestral", nome: "Trimestral", preco: "R$119", sub: "/mês", cor: "#7C3AED", destaque: true, eco: "Economize R$84" },
    { key: "anual",      nome: "Anual",      preco: "R$97",  sub: "/mês", cor: "#16A34A", eco: "Economize R$600" },
  ];

  if (recuperando) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0B2B24, #1E40AF)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: 28, boxShadow: "0 25px 80px rgba(0,0,0,0.3)" }}>
          {recEnviada ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>📱</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Senha enviada!</h2>
              <p style={{ color: "#64748B", fontSize: 14, marginBottom: 24 }}>Se o e-mail estiver cadastrado, você receberá uma nova senha via WhatsApp.</p>
              <Btn onClick={() => { setRecuperando(false); setRecEnviada(false); setEmailRec(""); }} style={{ width: "100%", justifyContent: "center" }}>← Voltar ao login</Btn>
            </div>
          ) : (
            <div>
              <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800 }}>Recuperar senha</h2>
              <p style={{ margin: "0 0 20px", fontSize: 14, color: "#64748B" }}>Enviaremos uma nova senha temporária via WhatsApp.</p>
              <Inp label="E-mail cadastrado" type="email" value={emailRec} onChange={e => setEmailRec(e.target.value)} placeholder="seu@email.com" />
              <Btn onClick={recuperar} disabled={loading || !emailRec} style={{ width: "100%", justifyContent: "center" }}>{loading ? "Enviando..." : "📱 Enviar nova senha"}</Btn>
              <div style={{ textAlign: "center", marginTop: 16 }}><span onClick={() => setRecuperando(false)} style={{ fontSize: 14, color: "#1E40AF", cursor: "pointer", fontWeight: 600 }}>← Voltar</span></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0B2B24 0%, #1E3A5F 50%, #1E40AF 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: aba === "planos" ? 680 : 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <img src="/logo-192.png" alt="CobrarFácil" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", display: "block" }} />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#fff", letterSpacing: -1 }}>CobrarFácil</div>
              <div style={{ fontSize: 11, color: "#93C5FD", fontWeight: 500 }}>SISTEMA DE COBRANÇA</div>
            </div>
          </div>
          <p style={{ color: "#94A3B8", fontSize: 15, margin: 0 }}>Seus clientes pagam. Você recebe.</p>
        </div>
        <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.1)", borderRadius: 14, padding: 4, marginBottom: 20 }}>
          {[["login", "Entrar"], ["planos", "Assinar"]].map(([k, l]) => (
            <button key={k} onClick={() => setAba(k)} style={{ flex: 1, background: aba === k ? "#fff" : "transparent", color: aba === k ? "#1E40AF" : "#94A3B8", border: "none", borderRadius: 10, padding: "11px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>{l}</button>
          ))}
        </div>
        {aba === "login" && (
          <div style={{ background: "#fff", borderRadius: 20, padding: 28, boxShadow: "0 25px 80px rgba(0,0,0,0.3)" }}>
            <h2 style={{ margin: "0 0 22px", fontSize: 20, fontWeight: 700 }}>Entrar na plataforma</h2>
            <Inp label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
            <SenhaInput label="Senha" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && go()} />
            {erro && <div style={{ background: "#FEF2F2", color: "#DC2626", borderRadius: 8, padding: "10px 14px", fontSize: 14, marginBottom: 14 }}>{erro}</div>}
            <div style={{ textAlign: "right", marginBottom: 18 }}><span onClick={() => setRecuperando(true)} style={{ fontSize: 14, color: "#1E40AF", cursor: "pointer", fontWeight: 600 }}>Esqueci minha senha</span></div>
            <Btn onClick={go} disabled={loading} style={{ width: "100%", justifyContent: "center" }}>{loading ? "Entrando..." : "Entrar na plataforma →"}</Btn>
            <div style={{ textAlign: "center", marginTop: 18, fontSize: 14, color: "#64748B" }}>Não tem conta? <span onClick={() => setAba("planos")} style={{ color: "#1E40AF", fontWeight: 600, cursor: "pointer" }}>Assinar agora</span></div>
          </div>
        )}
        {aba === "planos" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
              {planos.map(p => (
                <div key={p.key} style={{ background: "#fff", borderRadius: 16, padding: 18, border: p.destaque ? "2px solid " + p.cor : "1px solid #E2E8F0", position: "relative" }}>
                  {p.destaque && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: p.cor, color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99, whiteSpace: "nowrap" }}>⭐ MAIS ESCOLHIDO</div>}
                  <div style={{ fontWeight: 800, fontSize: 14, color: "#0B2B24", marginBottom: 4 }}>{p.nome}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: p.cor }}>{p.preco}<span style={{ fontSize: 12, fontWeight: 400, color: "#64748B" }}>{p.sub}</span></div>
                  {p.eco && <div style={{ fontSize: 11, color: "#16A34A", fontWeight: 700, marginTop: 2 }}>🎁 {p.eco}</div>}
                  <ul style={{ margin: "10px 0 0", padding: "0 0 0 14px", fontSize: 12, color: "#374151", lineHeight: 2 }}><li>WhatsApp automático</li><li>Régua completa</li><li>QR Code Pix real</li><li>7 dias garantia</li></ul>
                  <button onClick={() => { setPlanoCheckout(p.key); setCheckout(true); }} style={{ display: "block", width: "100%", marginTop: 12, background: p.cor, color: "#fff", border: "none", borderRadius: 10, padding: "11px", textAlign: "center", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Assinar</button>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", fontSize: 12, color: "#94A3B8" }}>🔒 Pagamento seguro · 7 dias de garantia · Cancele quando quiser</div>
          </div>
        )}
        <div style={{ display: "flex", gap: 16, marginTop: 24, justifyContent: "center", flexWrap: "wrap" }}>
          {["✅ 7 dias de garantia", "📱 WhatsApp automático", "💳 Pix ou Cartão"].map(f => <div key={f} style={{ fontSize: 13, color: "#94A3B8", fontWeight: 500 }}>{f}</div>)}
        </div>
      </div>
    </div>
  );
}

function AdminPanel({ onLogout, token, onImpersonar }) {
  const [lojistas, setLojistas] = useState([]);
  const [metricas, setMetricas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalCriar, setModalCriar] = useState(false);
  const [novoUsuario, setNovoUsuario] = useState({ nome: "", email: "", senha: "", plano: "mensal", whatsapp: "", dias: 30 });
  const [toast, setToast] = useState(null);
  const [busca, setBusca] = useState("");
  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  const carregar = async () => {
    setLoading(true);
    const [u, m] = await Promise.all([api("/admin/usuarios", {}, token), api("/admin/metricas", {}, token)]);
    if (Array.isArray(u)) setLojistas(u);
    if (m.mrr !== undefined) setMetricas(m);
    setLoading(false);
  };
  useEffect(() => { carregar(); }, []);
  const criarUsuario = async () => {
    const data = await api("/admin/usuarios", { method: "POST", body: JSON.stringify(novoUsuario) }, token);
    if (data.sucesso) { showToast("Usuário criado!"); setModalCriar(false); carregar(); } else showToast(data.erro || "Erro", "error");
  };
  const resetarSenha = async (email) => {
    const nova = prompt("Nova senha para " + email + ":"); if (!nova) return;
    const data = await api("/admin/reset-senha", { method: "POST", body: JSON.stringify({ email, senha_nova: nova }) }, token);
    if (data.sucesso) showToast("Senha resetada!"); else showToast(data.erro || "Erro", "error");
  };
  const acessarComoUsuario = async (l) => {
    const data = await api("/admin/usuarios/" + l.id + "/impersonar", { method: "POST", body: JSON.stringify({}) }, token);
    if (data.token) onImpersonar(data); else showToast(data.erro || "Erro ao acessar conta", "error");
  };
  const alterarStatus = async (id, status) => { await api("/admin/usuarios/" + id, { method: "PATCH", body: JSON.stringify({ status }) }, token); showToast("Status atualizado!"); carregar(); };
  const adicionarDias = async (id, dias) => { await api("/admin/usuarios/" + id, { method: "PATCH", body: JSON.stringify({ dias_adicionais: dias }) }, token); showToast(dias + " dias adicionados!"); carregar(); };
  const alternarModoDemo = async (id, valorAtual) => { await api("/admin/usuarios/" + id, { method: "PATCH", body: JSON.stringify({ modo_demo: !valorAtual }) }, token); showToast(!valorAtual ? "🎭 Modo demonstração ATIVADO — nenhuma mensagem real será enviada" : "Modo demonstração desativado — volta a enviar mensagens reais"); carregar(); };
  const lojFiltrados = lojistas.filter(l => l.plano !== "admin" && (l.nome?.toLowerCase().includes(busca.toLowerCase()) || l.email?.toLowerCase().includes(busca.toLowerCase())));
  const vencendo = lojistas.filter(l => { if (!l.expira_em || l.plano === "admin") return false; const d = Math.floor((new Date(l.expira_em) - new Date()) / 86400000); return d >= 0 && d <= 7; });
  return (
    <div style={{ minHeight: "100vh", background: "#0B2B24", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {toast && <ToastMsg {...toast} />}
      <div style={{ background: "#1E293B", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo-192.png" alt="CobrarFácil" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", display: "block" }} />
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>Admin</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {metricas && <div style={{ background: "#16A34A", color: "#fff", fontSize: 13, fontWeight: 700, padding: "5px 12px", borderRadius: 99 }}>MRR: {fmt(metricas.mrr)}</div>}
          <Btn small variant="primary" onClick={() => setModalCriar(true)}><Ic.plus /></Btn>
          <Btn small variant="ghost" onClick={onLogout}>Sair</Btn>
        </div>
      </div>
      <div style={{ padding: 16 }}>
        {vencendo.length > 0 && <div style={{ background: "#7C2D12", border: "1px solid #DC2626", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "#FCA5A5", fontSize: 13, fontWeight: 600 }}>⚠️ {vencendo.length} assinatura(s) vencendo em 7 dias: {vencendo.map(l => l.nome).join(", ")}</div>}
        {metricas && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
            {[
              { label: "MRR", value: fmt(metricas.mrr), color: "#22C55E", bg: "#052e16" },
              { label: "Ativos", value: lojistas.filter(l => l.status === "ativo" && l.plano !== "admin").length, color: "#3B82F6", bg: "#0c1a3a" },
              { label: "Novos hoje", value: metricas.novos_hoje, color: "#A78BFA", bg: "#1e1040" },
              { label: "Venc. 7d", value: metricas.vencendo_em_7_dias, color: "#F59E0B", bg: "#2a1a00" },
              { label: "Devedores", value: metricas.total_clientes, color: "#06B6D4", bg: "#0a2030" },
              { label: "Cobranças", value: metricas.total_cobrancas, color: "#EC4899", bg: "#2d0a1a" },
            ].map(c => (
              <div key={c.label} style={{ background: c.bg, borderRadius: 12, padding: "14px 12px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: c.color }}>{c.value}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", marginTop: 2 }}>{c.label}</div>
              </div>
            ))}
          </div>
        )}
        <input placeholder="🔍 Buscar..." value={busca} onChange={e => setBusca(e.target.value)} style={{ width: "100%", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "11px 14px", fontSize: 14, background: "#1E293B", color: "#fff", outline: "none", boxSizing: "border-box", marginBottom: 14 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {lojFiltrados.map(l => {
            const expira = l.expira_em ? fmtData(l.expira_em.split("T")[0]) : "—";
            const diasExp = l.expira_em ? Math.floor((new Date(l.expira_em) - new Date()) / 86400000) : null;
            return (
              <div key={l.id} style={{ background: "#1E293B", borderRadius: 14, padding: "16px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, color: "#E2E8F0", fontSize: 15 }}>{l.nome}</div>
                    <div style={{ fontSize: 12, color: "#64748B" }}>{l.email}</div>
                    {l.whatsapp && <div style={{ fontSize: 12, color: "#22C55E" }}>📱 {l.whatsapp}</div>}
                  </div>
                  <span style={{ background: l.status === "ativo" ? "#16A34A" : "#D97706", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 99 }}>{l.status}</span>
                </div>
                {l.modo_demo && <div style={{ background: "#581C87", color: "#E9D5FF", fontSize: 11.5, fontWeight: 700, padding: "5px 10px", borderRadius: 8, marginBottom: 10, display: "inline-block" }}>🎭 MODO DEMONSTRAÇÃO ATIVO — mensagens não são enviadas de verdade</div>}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  <span style={{ background: l.whatsapp_conectado ? "#052e16" : "#3f1212", color: l.whatsapp_conectado ? "#4ADE80" : "#F87171", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99, border: "1px solid " + (l.whatsapp_conectado ? "#166534" : "#7F1D1D") }}>{l.whatsapp_conectado ? "🟢 WhatsApp conectado" : "🔴 WhatsApp desconectado"}</span>
                  <span style={{ background: l.pix_configurado ? "#052e16" : "#2a1a00", color: l.pix_configurado ? "#4ADE80" : "#FBBF24", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99, border: "1px solid " + (l.pix_configurado ? "#166534" : "#78350F") }}>{l.pix_configurado ? "🟢 Pix configurado" : "🟡 Sem chave Pix"}</span>
                  {l.erros_7d > 0 && <span style={{ background: "#3f1212", color: "#F87171", fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99, border: "1px solid #7F1D1D" }}>⚠️ {l.erros_7d} erro(s) em 7d</span>}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 12, color: "#94A3B8", marginBottom: 10 }}>
                  <span>Plano: <strong style={{ color: "#60A5FA" }}>{l.plano}</strong></span>
                  <span>Vence: <strong style={{ color: diasExp !== null && diasExp <= 7 ? "#FCA5A5" : "#94A3B8" }}>{expira}</strong></span>
                  <span>Clientes: <strong style={{ color: "#fff" }}>{l.total_clientes || 0}</strong></span>
                  <span>Enviadas (7d): <strong style={{ color: "#fff" }}>{l.enviadas_7d}</strong></span>
                  <span>Último acesso: <strong style={{ color: "#fff" }}>{l.ultimo_acesso ? new Date(l.ultimo_acesso).toLocaleDateString("pt-BR") : "nunca"}</strong></span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button onClick={() => acessarComoUsuario(l)} style={{ background: "linear-gradient(135deg, #0EA5E9, #0284C7)", color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, cursor: "pointer", fontWeight: 700 }}>🔧 Acessar pra ajudar</button>
                  <button onClick={() => resetarSenha(l.email)} style={{ background: "#1E40AF", color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>🔑 Senha</button>
                  <button onClick={() => adicionarDias(l.id, 30)} style={{ background: "#16A34A", color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>+30d</button>
                  {l.status === "ativo" ? <button onClick={() => alterarStatus(l.id, "inativo")} style={{ background: "#D97706", color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Bloquear</button>
                    : <button onClick={() => alterarStatus(l.id, "ativo")} style={{ background: "#16A34A", color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Ativar</button>}
                  <button onClick={() => alternarModoDemo(l.id, l.modo_demo)} style={{ background: l.modo_demo ? "#7C3AED" : "#374151", color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>🎭 {l.modo_demo ? "Desligar demo" : "Ligar modo demo"}</button>
                </div>
              </div>
            );
          })}
          {lojFiltrados.length === 0 && !loading && <div style={{ textAlign: "center", color: "#64748B", padding: 40 }}>Nenhum cliente ainda</div>}
        </div>
      </div>
      {modalCriar && (
        <Modal title="Criar Novo Cliente" onClose={() => setModalCriar(false)}>
          <Inp label="Nome *" value={novoUsuario.nome} onChange={e => setNovoUsuario(p => ({ ...p, nome: e.target.value }))} placeholder="Nome completo" />
          <Inp label="E-mail *" type="email" value={novoUsuario.email} onChange={e => setNovoUsuario(p => ({ ...p, email: e.target.value }))} placeholder="email@exemplo.com" />
          <SenhaInput label="Senha inicial *" value={novoUsuario.senha} onChange={e => setNovoUsuario(p => ({ ...p, senha: e.target.value }))} placeholder="Mínimo 6 caracteres" />
          <Inp label="WhatsApp" value={novoUsuario.whatsapp} onChange={e => setNovoUsuario(p => ({ ...p, whatsapp: e.target.value }))} placeholder="5544999990000" />
          <Sel label="Plano" value={novoUsuario.plano} onChange={e => setNovoUsuario(p => ({ ...p, plano: e.target.value }))}>
            <option value="mensal">Mensal</option><option value="trimestral">Trimestral</option><option value="anual">Anual</option>
          </Sel>
          <Inp label="Dias de acesso" type="number" value={novoUsuario.dias} onChange={e => setNovoUsuario(p => ({ ...p, dias: e.target.value }))} placeholder="30" />
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="ghost" onClick={() => setModalCriar(false)} style={{ flex: 1, justifyContent: "center" }}>Cancelar</Btn>
            <Btn onClick={criarUsuario} disabled={!novoUsuario.nome || !novoUsuario.email || !novoUsuario.senha} style={{ flex: 1, justifyContent: "center" }}>Criar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ModalDetalheLista({ titulo, lista, onClose }) {
  const totalValor = lista.reduce((a, c) => a + parseFloat(c.total_divida || 0), 0);
  return (
    <Modal title={titulo} onClose={onClose} wide>
      <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 14, color: "#1E40AF", fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
        <span>{lista.length} cliente(s)</span>
        <span>{fmt(totalValor)}</span>
      </div>
      {lista.length === 0 ? (
        <div style={{ textAlign: "center", color: "#94A3B8", padding: 30, fontSize: 14 }}>Nenhum cliente neste grupo</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {lista.map(c => (
            <div key={c.id} style={{ background: "#F8FAFC", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#0B2B24" }}>{c.nome}</div>
                <div style={{ fontSize: 12, color: "#64748B" }}>{c.telefone} {c.vencimento && "· Vence " + fmtData(c.vencimento.split("T")[0])}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Badge status={c.status} />
                <div style={{ fontWeight: 800, color: "#0B2B24" }}>{fmt(c.total_divida)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function Dashboard({ clientes, token }) {
  const [metricas, setMetricas] = useState(null);
  const [relatorio, setRelatorio] = useState(null);
  const [periodo, setPeriodo] = useState({ inicio: new Date().toISOString().split('T')[0], fim: new Date(Date.now() + 30*86400000).toISOString().split('T')[0] });
  const [filtrando, setFiltrando] = useState(false);
  const [detalhe, setDetalhe] = useState(null);
  const [mostrarCompleto, setMostrarCompleto] = useState(false);
  const [periodoHero, setPeriodoHero] = useState("mes");

  useEffect(() => {
    api("/metricas", {}, token).then(d => { if (d.total_em_aberto !== undefined) setMetricas(d); });
  }, [clientes]);

  const filtrarPeriodo = async () => {
    setFiltrando(true);
    const data = await api("/metricas/periodo?inicio=" + periodo.inicio + "&fim=" + periodo.fim, {}, token);
    setRelatorio(data);
    setFiltrando(false);
  };

  const total = clientes.reduce((a, c) => a + parseFloat(c.total_divida || 0), 0);
  const pagos = clientes.filter(c => c.status === "pago");
  const atrasados = clientes.filter(c => c.status === "atrasado");
  const abertos = clientes.filter(c => c.status !== "pago" && c.status !== "blacklist");
  const totalPagoSoma = pagos.reduce((a, c) => a + parseFloat(c.total_divida || 0), 0);
  const percentual = total > 0 ? Math.round((totalPagoSoma / total) * 100) : 0;

  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const fimSemana = new Date(hoje); fimSemana.setDate(fimSemana.getDate() + 7);
  const fimMes = new Date(hoje); fimMes.setMonth(fimMes.getMonth() + 1);

  const venceHojeList = clientes.filter(c => c.status !== "pago" && c.status !== "blacklist" && c.vencimento && new Date(c.vencimento.split("T")[0] + "T12:00:00").toDateString() === hoje.toDateString());
  const venceSemanaList = clientes.filter(c => c.status !== "pago" && c.status !== "blacklist" && c.vencimento && new Date(c.vencimento.split("T")[0] + "T12:00:00") >= hoje && new Date(c.vencimento.split("T")[0] + "T12:00:00") <= fimSemana);
  const venceMesList = clientes.filter(c => c.status !== "pago" && c.status !== "blacklist" && c.vencimento && new Date(c.vencimento.split("T")[0] + "T12:00:00") >= hoje && new Date(c.vencimento.split("T")[0] + "T12:00:00") <= fimMes);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0B2B24", letterSpacing: "-0.3px" }}>Painel Geral</h1>
        <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600 }}>{new Date().toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" }).replace(/^\w/, c => c.toUpperCase())}</span>
      </div>

      {detalhe && <ModalDetalheLista titulo={detalhe.titulo} lista={detalhe.lista} onClose={() => setDetalhe(null)} />}

      {/* HERO — valor recebido, número absoluto que só cresce. Trocamos o
          "% do total histórico" porque comparar dinheiro recebido contra
          dívida antiga (parte dela praticamente impossível de cobrar) sempre
          gera um número baixo e desanimador, mesmo com o sistema funcionando
          bem — nenhuma agência de cobrança usa essa conta como KPI principal. */}
      {(() => {
        const OPCOES_PERIODO = {
          hoje:   { label: "Hoje",       valor: metricas?.recebido_hoje },
          semana: { label: "7 dias",     valor: metricas?.recebido_semana },
          mes:    { label: "Este mês",   valor: metricas?.recebido_mes },
          total:  { label: "Desde sempre", valor: metricas?.total_recebido ?? totalPagoSoma },
        };
        const valorHero = OPCOES_PERIODO[periodoHero]?.valor ?? 0;
        return (
          <div className="cf-fade" style={{ background: "linear-gradient(160deg, #081512 0%, #0E2620 55%, #023B32 100%)", borderRadius: 22, padding: "24px 22px", marginBottom: 12, boxShadow: "0 16px 36px rgba(2,20,16,0.4), inset 0 1px 0 rgba(255,255,255,0.06)", border: "1px solid rgba(74,222,128,0.12)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -50, right: -40, width: 180, height: 180, background: "radial-gradient(circle, rgba(74,222,128,0.22), transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: -60, left: -40, width: 160, height: 160, background: "radial-gradient(circle, rgba(14,143,99,0.18), transparent 70%)", pointerEvents: "none" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, position: "relative" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10.5, fontWeight: 700, color: "#4ADE80", letterSpacing: 1.3, textTransform: "uppercase", background: "rgba(74,222,128,0.1)", padding: "4px 10px", borderRadius: 99, border: "1px solid rgba(74,222,128,0.2)" }}>● RECEBIDO</div>
              <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, padding: 3 }}>
                {Object.entries(OPCOES_PERIODO).map(([key, o]) => (
                  <button key={key} onClick={() => setPeriodoHero(key)} className="cf-btn" style={{ border: "none", background: periodoHero === key ? "#4ADE80" : "transparent", color: periodoHero === key ? "#052B1E" : "#7C8B87", fontSize: 10.5, fontWeight: 700, padding: "4px 9px", borderRadius: 99, cursor: "pointer" }}>{o.label}</button>
                ))}
              </div>
            </div>
            <div onClick={() => setDetalhe({ titulo: "Clientes que pagaram", lista: pagos })} style={{ cursor: "pointer", position: "relative", marginBottom: 18 }}>
              <span style={{ fontSize: 42, fontWeight: 900, color: "#fff", fontFamily: "'JetBrains Mono', 'SF Mono', monospace", letterSpacing: -1.5, lineHeight: 1 }}>{fmt(valorHero)}</span>
            </div>
            <div style={{ display: "flex", gap: 16, position: "relative", paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div onClick={() => setDetalhe({ titulo: "Clientes em aberto", lista: abertos })} style={{ flex: 1, cursor: "pointer" }}>
                <div style={{ fontSize: 10.5, color: "#7C8B87", marginBottom: 4, fontWeight: 700, letterSpacing: "0.4px" }}>EM ABERTO</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(metricas?.total_em_aberto ?? total)}</div>
              </div>
              <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
              <div onClick={() => setDetalhe({ titulo: "Clientes em atraso", lista: atrasados })} style={{ flex: 1, cursor: "pointer" }}>
                <div style={{ fontSize: 10.5, color: "#7C8B87", marginBottom: 4, fontWeight: 700, letterSpacing: "0.4px" }}>EM ATRASO</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#FCA5A5", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(metricas?.atrasados?.valor ?? 0)}</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Lembrete: a baixa é manual (sem integração bancária automática) — se
          o lojista esquecer de marcar "Pago", o sistema continua cobrando
          quem já pagou E o valor não aparece aqui como recebido. */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: "10px 12px", marginBottom: 14, fontSize: 12, color: "#92400E", lineHeight: 1.5 }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
        <span><strong>Não esqueça de dar baixa:</strong> quando o cliente mandar o comprovante do Pix pelo WhatsApp, marque "✓ Pago" na lista de Clientes. Sem isso, o sistema continua cobrando quem já pagou, e o valor não aparece aqui como recebido.</span>
      </div>

      {/* Stats secundárias — cards com affordance clara de clicável */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 14 }}>
        {[
          { label: "Em atraso", value: fmt(metricas?.atrasados?.valor ?? 0), sub: (metricas?.atrasados?.qtd ?? atrasados.length) + " clientes", icon: <Ic.alert />, color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", lista: atrasados, titulo: "Clientes em atraso" },
          { label: "Total de clientes", value: clientes.length, sub: "cadastrados", icon: <Ic.users />, color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE", lista: clientes, titulo: "Todos os clientes" },
        ].map(c => (
          <div key={c.label} className="cf-card" onClick={() => setDetalhe({ titulo: c.titulo, lista: c.lista })} style={{ background: "#fff", borderRadius: 16, padding: "16px", border: "1px solid #F1F5F9", boxShadow: "0 1px 8px rgba(0,0,0,0.05)", cursor: "pointer", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ width: 34, height: 34, background: c.bg, border: "1px solid " + c.border, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: c.color, flexShrink: 0 }}>{c.icon}</div>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", color: "#CBD5E1", fontSize: 12 }}>→</div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#0B2B24", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.5px", marginBottom: 3 }}>{c.value}</div>
            <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>{c.label}{c.sub ? " · " + c.sub : ""}</div>
          </div>
        ))}
      </div>

      {/* Vencimentos — uma linha compacta, não 3 blocos */}
      {metricas && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 16, border: "1px solid #F1F5F9", marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#374151", marginBottom: 12 }}>📅 Próximos vencimentos</div>
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { label: "Hoje", dados: metricas.vence_hoje, cor: "#EF4444", bg: "#FEF2F2", border: "#FECACA", lista: venceHojeList },
              { label: "7 dias", dados: metricas.vence_semana, cor: "#D97706", bg: "#FFFBEB", border: "#FDE68A", lista: venceSemanaList },
              { label: "30 dias", dados: metricas.vence_mes, cor: "#2563EB", bg: "#EFF6FF", border: "#BFDBFE", lista: venceMesList },
            ].map(v => (
              <div key={v.label} className="cf-card" onClick={() => setDetalhe({ titulo: v.label, lista: v.lista })} style={{ flex: 1, background: v.bg, border: "1px solid " + v.border, borderRadius: 12, padding: "12px 8px", textAlign: "center", cursor: "pointer" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: v.cor, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(v.dados?.valor ?? 0)}</div>
                <div style={{ fontSize: 10, color: v.cor, fontWeight: 700, marginTop: 2 }}>{v.label} · {v.dados?.qtd ?? 0}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tudo o resto fica dobrado — não força scroll pra quem só quer o resumo */}
      <button onClick={() => setMostrarCompleto(p => !p)} className="cf-btn" style={{ width: "100%", background: "none", border: "1.5px dashed #CBD5E1", borderRadius: 12, padding: "11px", color: "#64748B", fontSize: 13, fontWeight: 700, cursor: "pointer", marginBottom: mostrarCompleto ? 12 : 0 }}>
        {mostrarCompleto ? "▲ Esconder relatório completo" : "▼ Ver relatório completo e filtrar por período"}
      </button>

      {mostrarCompleto && (
        <div className="cf-fade">
          <div style={{ background: "#fff", borderRadius: 16, padding: 18, border: "1px solid #F1F5F9", marginBottom: 12 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>💰 Recebimentos</h3>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { label: "Hoje", valor: metricas?.recebido_hoje },
                { label: "Semana", valor: metricas?.recebido_semana },
                { label: "Mês", valor: metricas?.recebido_mes },
              ].map(r => (
                <div key={r.label} onClick={() => setDetalhe({ titulo: "Recebidos — " + r.label, lista: pagos })} style={{ flex: 1, background: "#F0FDF4", borderRadius: 10, padding: "12px 8px", textAlign: "center", cursor: "pointer" }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#16A34A", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(r.valor)}</div>
                  <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>{r.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "#fff", borderRadius: 16, padding: 18, border: "1px solid #F1F5F9", marginBottom: 12 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>🔍 Filtrar por período</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <Inp label="De" type="date" value={periodo.inicio} onChange={e => setPeriodo(p => ({ ...p, inicio: e.target.value }))} />
              <Inp label="Até" type="date" value={periodo.fim} onChange={e => setPeriodo(p => ({ ...p, fim: e.target.value }))} />
            </div>
            <Btn onClick={filtrarPeriodo} disabled={filtrando} style={{ width: "100%", justifyContent: "center" }}>{filtrando ? "Filtrando..." : "📊 Ver relatório do período"}</Btn>
            {relatorio && (
              <div style={{ marginTop: 14 }}>
                {relatorio.por_status?.map(r => (
                  <div key={r.status} onClick={() => setDetalhe({ titulo: "Período — " + r.status, lista: (relatorio.clientes || []).filter(c => c.status === r.status) })} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F1F5F9", fontSize: 14, cursor: "pointer" }}>
                    <span style={{ color: "#374151", fontWeight: 600 }}>{r.status}</span>
                    <span style={{ fontWeight: 700, color: "#0B2B24" }}>{fmt(r.total)} ({r.qtd} clientes) <span style={{ color: "#94A3B8", fontWeight: 400 }}>→</span></span>
                  </div>
                ))}
                {relatorio.recebidos && (
                  <div onClick={() => setDetalhe({ titulo: "Recebido no período", lista: (relatorio.clientes || []).filter(c => c.status === "pago") })} style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 12px", marginTop: 10, fontSize: 14, color: "#16A34A", fontWeight: 700, cursor: "pointer" }}>
                    ✅ Recebido no período: {fmt(relatorio.recebidos.total)} ({relatorio.recebidos.qtd} pagamentos) →
                  </div>
                )}
                {relatorio.clientes && relatorio.clientes.length > 0 && (
                  <Btn small variant="ghost" onClick={() => setDetalhe({ titulo: "Todos os clientes do período", lista: relatorio.clientes })} style={{ width: "100%", justifyContent: "center", marginTop: 10 }}>Ver todos os {relatorio.clientes.length} clientes do período</Btn>
                )}
              </div>
            )}
          </div>

          <div style={{ background: "#fff", borderRadius: 16, padding: 18, border: "1px solid #F1F5F9" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>Situação geral</h3>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {[{ label: "Pagos", count: pagos.length, color: "#16A34A", bg: "#F0FDF4" }, { label: "Pendentes", count: clientes.filter(c => c.status === "pendente").length, color: "#D97706", bg: "#FFFBEB" }, { label: "Atrasados", count: atrasados.length, color: "#DC2626", bg: "#FEF2F2" }].map(s => (
                <div key={s.label} style={{ flex: 1, background: s.bg, borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.count}</div>
                  <div style={{ fontSize: 12, color: s.color, fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: "#64748B" }}>Taxa de recebimento</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#16A34A" }}>{percentual}%</span>
            </div>
            <div style={{ background: "#F1F5F9", borderRadius: 99, height: 8, overflow: "hidden" }}>
              <div style={{ width: percentual + "%", background: "linear-gradient(90deg, #16A34A, #22C55E)", height: "100%", borderRadius: 99 }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModalRegua({ cliente, token, onClose }) {
  const [etapas, setEtapas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2000); };

  useEffect(() => {
    api("/clientes/" + cliente.id + "/regua", {}, token).then(data => {
      if (data.etapas) setEtapas(data.etapas);
      setLoading(false);
    });
  }, []);

  const toggleEtapa = async (etapa, ativo) => {
    await api("/clientes/" + cliente.id + "/regua/" + etapa, { method: "PUT", body: JSON.stringify({ ativo }) }, token);
    setEtapas(prev => prev.map(e => e.etapa === etapa ? { ...e, ativo } : e));
    showToast(ativo ? "Etapa ativada!" : "Etapa desativada!");
  };

  const salvarMensagem = async (etapa, mensagem) => {
    await api("/clientes/" + cliente.id + "/regua/" + etapa, { method: "PUT", body: JSON.stringify({ ativo: true, mensagem_personalizada: mensagem || null }) }, token);
    setEtapas(prev => prev.map(e => e.etapa === etapa ? { ...e, mensagem_personalizada: mensagem || null } : e));
    setEditando(null);
    showToast("Mensagem salva!");
  };

  return (
    <Modal title={"Régua — " + cliente.nome} onClose={onClose} wide>
      {toast && <ToastMsg {...toast} />}
      {loading ? <div style={{ textAlign: "center", padding: 40, color: "#64748B" }}>Carregando...</div> : (
        <div>
          <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#1E40AF" }}>
            💡 Dispara automaticamente às 8h. Desative etapas ou personalize mensagens.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {etapas.map(e => {
              const info = ETAPAS_INFO[e.etapa] || {};
              return (
                <div key={e.etapa} style={{ background: e.ativo ? "#F8FAFC" : "#F1F5F9", borderRadius: 12, padding: 14, border: "1.5px solid " + (e.ativo ? info.cor || "#E2E8F0" : "#E2E8F0"), opacity: e.ativo ? 1 : 0.55 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: info.cor || "#94A3B8", flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#0B2B24" }}>{info.label || e.etapa}</div>
                        <div style={{ fontSize: 12, color: "#64748B" }}>Tom: {info.tom} {e.enviado && "· ✅ Enviado"} {e.mensagem_personalizada && "· ✏️ Personalizado"}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {e.ativo && !e.enviado && (
                        <button onClick={() => setEditando(editando === e.etapa ? null : e.etapa)} style={{ background: "#EFF6FF", color: "#1E40AF", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
                          {editando === e.etapa ? "Fechar" : "✏️ Editar"}
                        </button>
                      )}
                      <div onClick={() => toggleEtapa(e.etapa, !e.ativo)} style={{ width: 46, height: 26, borderRadius: 99, background: e.ativo ? info.cor || "#1E40AF" : "#CBD5E1", cursor: "pointer", position: "relative", flexShrink: 0 }}>
                        <div style={{ position: "absolute", top: 3, left: e.ativo ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                      </div>
                    </div>
                  </div>
                  {editando === e.etapa && (
                    <div style={{ marginTop: 12, background: "#fff", borderRadius: 8, padding: 12, border: "1px solid #E2E8F0" }}>
                      <div style={{ fontSize: 12, color: "#64748B", marginBottom: 6 }}>Mensagem que será enviada (edite ou mantenha):</div>
                      <MensagemEditorInline etapa={e.etapa} mensagemAtual={e.mensagem_personalizada} cliente={cliente} onSalvar={(msg) => salvarMensagem(e.etapa, msg)} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}

function ModalConversa({ cliente, token, onClose }) {
  const [mensagens, setMensagens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [novaMsg, setNovaMsg] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api("/clientes/" + cliente.id + "/conversa", {}, token).then(data => {
      if (data.mensagens) setMensagens(data.mensagens);
      setLoading(false);
    });
  }, []);

  const enviar = async () => {
    if (!novaMsg.trim()) return;
    setEnviando(true);
    const data = await api("/clientes/" + cliente.id + "/enviar-mensagem", { method: "POST", body: JSON.stringify({ mensagem: novaMsg.trim() }) }, token);
    if (data.sucesso) {
      setMensagens(prev => [...prev, { direcao: "enviada", texto: novaMsg.trim(), criado_em: new Date().toISOString() }]);
      setNovaMsg("");
    }
    setEnviando(false);
  };

  return (
    <Modal title={"Conversa — " + cliente.nome} onClose={onClose}>
      <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#1E40AF" }}>
        💡 Espelho das mensagens trocadas com esse cliente pelo WhatsApp — o que o sistema mandou e o que ele respondeu.
      </div>
      {loading ? (
        <div style={{ textAlign: "center", padding: 30, color: "#64748B" }}>Carregando...</div>
      ) : (
        <div style={{ background: "#E5DDD5", borderRadius: 10, padding: 12, minHeight: 200, maxHeight: 360, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {mensagens.length === 0 ? (
            <div style={{ textAlign: "center", color: "#64748B", fontSize: 13, margin: "auto" }}>Nenhuma mensagem registrada ainda</div>
          ) : mensagens.map((m, i) => (
            <div key={i} style={{ alignSelf: m.direcao === "enviada" ? "flex-end" : "flex-start", maxWidth: "80%", background: m.direcao === "enviada" ? "#DCF8C6" : "#fff", borderRadius: 8, padding: "8px 12px", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
              <div style={{ fontSize: 13, color: "#0B2B24", whiteSpace: "pre-wrap" }}>{m.texto}</div>
              <div style={{ fontSize: 10, color: "#94A3B8", textAlign: "right", marginTop: 3 }}>{new Date(m.criado_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <input value={novaMsg} onChange={e => setNovaMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && enviar()} placeholder="Digite uma mensagem..." style={{ flex: 1, border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none" }} />
        <Btn onClick={enviar} disabled={enviando || !novaMsg.trim()} small><Ic.send /></Btn>
      </div>
    </Modal>
  );
}

function MensagemEditorInline({ etapa, mensagemAtual, cliente, onSalvar }) {
  const padrao = MENSAGENS_PADRAO[etapa] ? MENSAGENS_PADRAO[etapa](cliente.nome, cliente.total_divida) : "";
  const [msg, setMsg] = useState(mensagemAtual || padrao);
  return (
    <div>
      <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={4} style={{ width: "100%", border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "10px 12px", fontSize: 13, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <Btn small onClick={() => onSalvar(msg)} style={{ flex: 1, justifyContent: "center" }}>💾 Salvar</Btn>
        <Btn small variant="ghost" onClick={() => { setMsg(padrao); onSalvar(null); }}>↺ Padrão</Btn>
      </div>
    </div>
  );
}

function Clientes({ clientes, setClientes, onCobranca, clienteParaEditar, setClienteParaEditar, token }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [modalAdd, setModalAdd] = useState(false);
  const [modalImport, setModalImport] = useState(false);
  const [modalRegua, setModalRegua] = useState(null);
  const [modalConversa, setModalConversa] = useState(null);
  const [modalEditar, setModalEditar] = useState(null);
  const [modalProrrogar, setModalProrrogar] = useState(null);
  const [editando, setEditando] = useState({});
  const [novaData, setNovaData] = useState("");
  const [novo, setNovo] = useState({ nome: "", cpf: "", telefone: "", email: "", total_divida: "", parcelas: "1", vencimento: "" });
  const [toast, setToast] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const fileRef = useRef();
  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => { if (modalEditar) setEditando({ ...modalEditar }); }, [modalEditar]);

  // Chegou aqui vindo do "✏️ Editar" no Relatório de erros — abre o modal direto
  useEffect(() => {
    if (clienteParaEditar) { setModalEditar(clienteParaEditar); setClienteParaEditar(null); }
  }, [clienteParaEditar]);

  const filtrados = clientes.filter(c => (filtro === "todos" || c.status === filtro) && c.nome.toLowerCase().includes(busca.toLowerCase()));

  const addCliente = async () => {
    if (!novo.nome || !novo.telefone || !novo.total_divida) return;
    const data = await api("/clientes", { method: "POST", body: JSON.stringify(novo) }, token);
    if (data.id) { setClientes(prev => [data, ...prev]); setModalAdd(false); setNovo({ nome: "", cpf: "", telefone: "", email: "", total_divida: "", parcelas: "1", vencimento: "" }); showToast("Cliente cadastrado!"); }
    else if (data.criados) { setClientes(prev => [...data.criados, ...prev]); setModalAdd(false); setNovo({ nome: "", cpf: "", telefone: "", email: "", total_divida: "", parcelas: "1", vencimento: "" }); showToast(data.total + " parcelas criadas!"); }
    else showToast(data.erro || "Erro", "error");
  };

  const salvarEdicao = async () => {
    const data = await api("/clientes/" + editando.id, { method: "PUT", body: JSON.stringify(editando) }, token);
    if (data.id) { setClientes(prev => prev.map(x => x.id === editando.id ? data : x)); setModalEditar(null); showToast("Cliente atualizado!"); }
    else if (data.reparcelado) { const novos = await api("/clientes", {}, token); if (Array.isArray(novos)) setClientes(novos); setModalEditar(null); showToast(data.total + " parcelas criadas!"); }
    else showToast(data.erro || "Erro", "error");
  };

  const prorrogarDivida = async () => {
    if (!novaData) return;
    const c = modalProrrogar;
    const data = await api("/clientes/" + c.id, { method: "PUT", body: JSON.stringify({ ...c, vencimento: novaData, prorrogado: true, status: "pendente" }) }, token);
    if (data.id) { setClientes(prev => prev.map(x => x.id === c.id ? { ...data, prorrogado: true } : x)); setModalProrrogar(null); setNovaData(""); showToast("Prorrogado para " + fmtData(novaData) + "!"); }
    else showToast(data.erro || "Erro", "error");
  };

  const marcarPago = async (c) => {
    const data = await api("/clientes/" + c.id + "/confirmar-pagamento", { method: "POST" }, token);
    if (data.sucesso) { setClientes(prev => prev.map(x => x.id === c.id ? { ...x, status: "pago" } : x)); showToast("✅ Pago! Lojista e devedor notificados via WhatsApp!"); }
    else showToast(data.erro || "Erro", "error");
  };

  const adicionarBlacklist = async (c) => {
    const motivo = prompt("Motivo para blacklist (ex: nunca paga, número errado):") || "Inadimplente";
    const data = await api("/blacklist", { method: "POST", body: JSON.stringify({ cliente_id: c.id, motivo }) }, token);
    if (data.sucesso) { setClientes(prev => prev.map(x => x.id === c.id ? { ...x, status: "blacklist" } : x)); showToast("Adicionado à blacklist!"); }
    else showToast(data.erro || "Erro", "error");
  };

  const deletarCliente = async (id) => {
    if (!confirm("Remover este cliente?")) return;
    await api("/clientes/" + id, { method: "DELETE" }, token);
    setClientes(prev => prev.filter(x => x.id !== id));
    showToast("Removido!");
  };

  const parseCSVText = (text) => {
    const lines = text.split("\n").filter(l => l.trim());
    const header = lines[0].split(/[,;]/);
    return lines.slice(1).map(line => {
      const cols = line.split(/[,;]/); const obj = {};
      header.forEach((h, i) => { obj[h.trim()] = (cols[i] || "").trim().replace(/"/g, ""); });
      return mapearLinhaPlanilha(obj);
    });
  };

  const atualizarDecisao = (index, novaDecisao) => {
    setCsvPreview(prev => prev.map((r, i) => i === index ? { ...r, decisao: novaDecisao } : r));
  };

  const handleCSV = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const nomeArquivo = file.name.toLowerCase();
    let linhasMapeadas = null;

    if (nomeArquivo.endsWith(".xlsx") || nomeArquivo.endsWith(".xls")) {
      try {
        if (!window.XLSX) {
          await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
        const buffer = await file.arrayBuffer();

        // Alguns sistemas de gestão (comum em software de salão mais antigo)
        // exportam um arquivo com extensão .xls que por dentro é uma TABELA HTML,
        // não um Excel binário de verdade. O SheetJS não lê isso. Detecta e usa
        // outro caminho de leitura nesse caso.
        const inicioArquivo = new TextDecoder("utf-8", { fatal: false }).decode(buffer.slice(0, 1024)).toLowerCase();
        const pareceHtml = inicioArquivo.includes("<html") || inicioArquivo.includes("<table") || inicioArquivo.includes("<!doctype");

        let json;
        if (pareceHtml) {
          const texto = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
          const doc = new DOMParser().parseFromString(texto, "text/html");
          const tabela = doc.querySelector("table");
          if (!tabela) throw new Error("Arquivo parece HTML mas não encontrei nenhuma tabela dentro dele.");
          const linhas = Array.from(tabela.querySelectorAll("tr")).filter(l => l.querySelectorAll("td,th").length > 0);
          if (linhas.length < 2) throw new Error("Tabela encontrada, mas sem linhas de dados suficientes.");
          const cabecalho = Array.from(linhas[0].querySelectorAll("th,td")).map(c => c.textContent.trim());
          json = linhas.slice(1).map(linha => {
            const celulas = Array.from(linha.querySelectorAll("td,th")).map(c => c.textContent.trim());
            const obj = {};
            cabecalho.forEach((h, i) => { obj[h] = celulas[i] || ""; });
            return obj;
          });
        } else {
          const workbook = window.XLSX.read(buffer, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          json = window.XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false, dateNF: "dd/mm/yyyy" });
        }

        if (!json || json.length === 0) {
          showToast("O arquivo foi lido mas nenhuma linha de dado foi encontrada. Confira se a planilha tem cabeçalho na primeira linha.", "error");
          return;
        }

        linhasMapeadas = json.map(mapearLinhaPlanilha);
      } catch (err) {
        console.error("Erro ao ler planilha:", err);
        showToast("Erro ao ler o arquivo: " + (err.message || "formato não reconhecido") + ". Alternativa: abra no Excel → Salvar Como → CSV, e suba o CSV.", "error");
        return;
      }
    } else {
      const texto = await file.text();
      linhasMapeadas = parseCSVText(texto);
    }

    if (!linhasMapeadas || linhasMapeadas.length === 0) {
      showToast("Nenhuma linha de dado encontrada no arquivo.", "error");
      return;
    }

    // Compara cada linha contra os clientes que já existem (mesmo telefone ou nome)
    const comDuplicados = linhasMapeadas.map(linha => anotarDuplicado(linha, clientes));
    setCsvPreview(comDuplicados);
  };

  const importarCSV = async () => {
    // Separa em 3 grupos, de acordo com a decisão tomada em cada linha duplicada
    const substituicoes = csvPreview.filter(c => c.duplicado && c.decisao === "substituir");
    const novos = csvPreview.filter(c => !c.pular && (!c.duplicado || c.decisao === "manter" || c.decisao === "incluir"));

    let substituidos = 0;
    for (const s of substituicoes) {
      const r = await api("/clientes/" + s.duplicado.clienteId, { method: "PUT", body: JSON.stringify({
        nome: s.nome, telefone: s.telefone, cpf: s.cpf, email: s.email,
        total_divida: s.total_divida, vencimento: s.vencimento, parcelas: s.parcelas, status: "pendente",
      }) }, token);
      if (r.id || r.reparcelado) substituidos++;
    }

    let data = { sucesso: true, importados: 0 };
    if (novos.length > 0) {
      const lista = novos.map(c => ({ nome: c.nome, telefone: c.telefone, total_divida: c.total_divida, cpf: c.cpf, email: c.email, vencimento: c.vencimento, parcelas: c.parcelas }));
      data = await api("/clientes/importar", { method: "POST", body: JSON.stringify({ clientes: lista }) }, token);
    }

    const novosClientes = await api("/clientes", {}, token); if (Array.isArray(novosClientes)) setClientes(novosClientes);
    setCsvPreview([]); setModalImport(false);

    const partes = [];
    if (data.importados) partes.push(data.importados + " novo(s) importado(s)");
    if (substituidos) partes.push(substituidos + " atualizado(s) (dívida substituída)");
    if (data.aviso) partes.push(data.aviso);
    if (partes.length === 0) partes.push("Nenhuma alteração foi feita.");
    alert("✅ Concluído!\n\n" + partes.join("\n"));
  };

  const baixarModelo = async () => {
    try {
      if (!window.XLSX) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
      const dados = [
        { nome: "João Silva", telefone: "44999990000", valor: 300.00, cpf: "123.456.789-00", email: "joao@email.com", vencimento: "2026-07-01", parcelas: 3 },
        { nome: "Maria Souza", telefone: "44988880000", valor: 150.00, cpf: "", email: "", vencimento: "2026-07-15", parcelas: 1 },
        { nome: "Carlos Lima", telefone: "44977770000", valor: 500.00, cpf: "", email: "", vencimento: "2026-08-01", parcelas: 2 },
      ];
      const ws = window.XLSX.utils.json_to_sheet(dados);
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, "Clientes");
      window.XLSX.writeFile(wb, "modelo_clientes_cobrarfacil.xlsx");
    } catch {
      // Fallback CSV se a lib não carregar
      const csv = "nome,telefone,valor,cpf,email,vencimento,parcelas\nJoão Silva,44999990000,300.00,123.456.789-00,joao@email.com,2026-07-01,3";
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "modelo_clientes_cobrarfacil.csv"; a.click();
    }
  };

  return (
    <div>
      {toast && <ToastMsg {...toast} />}
      {modalRegua && <ModalRegua cliente={modalRegua} token={token} onClose={() => setModalRegua(null)} />}
      {modalConversa && <ModalConversa key={modalConversa.id} cliente={modalConversa} token={token} onClose={() => setModalConversa(null)} />}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0B2B24" }}>Clientes</h1>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: "#64748B" }}>{clientes.length} cadastrados · {clientes.filter(c => c.status === "atrasado").length} em atraso</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn small variant="ghost" onClick={() => setModalImport(true)}><Ic.upload /></Btn>
          <Btn small onClick={() => setModalAdd(true)}><Ic.plus /> Novo</Btn>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
        <input placeholder="🔍 Buscar..." value={busca} onChange={e => setBusca(e.target.value)} style={{ flex: 1, minWidth: 120, border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", background: "#F8FAFC" }} />
        {["todos", "pendente", "atrasado", "pago", "blacklist"].map(f => (
          <button key={f} onClick={() => setFiltro(f)} style={{ background: filtro === f ? "#1E40AF" : "#F1F5F9", color: filtro === f ? "#fff" : "#64748B", border: "none", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
            {f === "todos" ? "Todos" : f === "blacklist" ? "🚫 Blacklist" : statusColor[f]?.label || f}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtrados.map(c => (
          <div key={c.id} style={{ background: "#fff", borderRadius: 14, border: "1px solid " + (c.status === "atrasado" ? "#FECACA" : c.status === "blacklist" ? "#1F2937" : "#F1F5F9"), padding: "14px 16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 40, height: 40, background: c.status === "blacklist" ? "#1F2937" : "linear-gradient(135deg, #DBEAFE, #BFDBFE)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: c.status === "blacklist" ? "#F9FAFB" : "#1E40AF", flexShrink: 0 }}>
                  {c.status === "blacklist" ? "🚫" : c.nome.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#0B2B24" }}>{c.nome}</div>
                  <div style={{ fontSize: 12, color: "#94A3B8" }}>{c.telefone}</div>
                  {c.vencimento && <div style={{ fontSize: 12, color: c.status === "atrasado" ? "#DC2626" : "#64748B" }}>Vence: {fmtData(c.vencimento.split("T")[0])}</div>}
                </div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: c.status === "atrasado" ? "#DC2626" : c.status === "pago" ? "#16A34A" : "#0B2B24" }}>{fmt(c.total_divida)}</div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              <Badge status={c.status} />
              {c.prorrogado && <span style={{ background: "#FEF3C7", color: "#D97706", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>📅 Prorrogado</span>}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {c.status !== "blacklist" && <button onClick={() => setModalRegua(c)} style={{ background: "#EFF6FF", color: "#1E40AF", border: "1.5px solid #BFDBFE", borderRadius: 8, padding: "7px 12px", fontSize: 13, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Ic.regua /> Régua</button>}
              <button onClick={() => setModalEditar(c)} style={{ background: "#F8FAFC", color: "#374151", border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "7px 12px", fontSize: 13, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Ic.edit /> Editar</button>
              {c.status !== "pago" && c.status !== "blacklist" && <button onClick={() => setModalProrrogar(c)} style={{ background: "#FFFBEB", color: "#D97706", border: "1.5px solid #FDE68A", borderRadius: 8, padding: "7px 12px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>📅 Prorrogar</button>}
              {c.status !== "pago" && c.status !== "blacklist" && <button onClick={() => onCobranca(c)} style={{ background: "#16A34A", color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 13, cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Ic.send /> Cobrar</button>}
              {c.status !== "pago" && c.status !== "blacklist" && <button onClick={() => marcarPago(c)} style={{ background: "#F1F5F9", color: "#374151", border: "none", borderRadius: 8, padding: "7px 12px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>✓ Pago</button>}
              <button onClick={() => setModalConversa(c)} style={{ background: "#ECFDF5", color: "#0E8F63", border: "1.5px solid #A7F3D0", borderRadius: 8, padding: "7px 10px", fontSize: 13, cursor: "pointer" }}><Ic.eye /></button>
              <button onClick={() => deletarCliente(c.id)} style={{ background: "#FEF2F2", color: "#DC2626", border: "none", borderRadius: 8, padding: "7px 10px", fontSize: 13, cursor: "pointer" }}><Ic.trash /></button>
            </div>
          </div>
        ))}
        {filtrados.length === 0 && (
          <div style={{ textAlign: "center", padding: 48, color: "#94A3B8" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>👥</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Nenhum cliente</div>
            <div style={{ fontSize: 13 }}>Cadastre ou importe uma planilha CSV</div>
          </div>
        )}
      </div>

      {modalAdd && (
        <Modal title="Novo Cliente" onClose={() => setModalAdd(false)}>
          <Inp label="Nome *" value={novo.nome} onChange={e => setNovo(p => ({ ...p, nome: e.target.value }))} placeholder="Nome completo" />
          <Inp label="CPF" value={novo.cpf} onChange={e => setNovo(p => ({ ...p, cpf: e.target.value }))} placeholder="000.000.000-00" />
          <Inp label="WhatsApp *" value={novo.telefone} onChange={e => setNovo(p => ({ ...p, telefone: e.target.value }))} placeholder="(44) 99999-0000" />
          <Inp label="E-mail" value={novo.email} onChange={e => setNovo(p => ({ ...p, email: e.target.value }))} placeholder="email@exemplo.com" />
          <Inp label="Valor total (R$) *" type="number" value={novo.total_divida} onChange={e => setNovo(p => ({ ...p, total_divida: e.target.value }))} placeholder="0,00" />
          <Inp label="Vencimento 1ª parcela" type="date" value={novo.vencimento} onChange={e => setNovo(p => ({ ...p, vencimento: e.target.value }))} />
          <Sel label="Parcelas" value={novo.parcelas} onChange={e => setNovo(p => ({ ...p, parcelas: e.target.value }))}>
            {[1,2,3,4,5,6,7,8,9,10,11,12,18,24].map(n => <option key={n} value={n}>{n}x</option>)}
          </Sel>
          {parseInt(novo.parcelas) > 1 && novo.total_divida && novo.vencimento && (
            <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "12px 14px", marginBottom: 14, fontSize: 13, color: "#1E40AF" }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>📅 Parcelas que serão criadas:</div>
              {Array.from({ length: parseInt(novo.parcelas) }, (_, i) => {
                const base = new Date(novo.vencimento + "T12:00:00");
                base.setMonth(base.getMonth() + i);
                const valor = (parseFloat(novo.total_divida) / parseInt(novo.parcelas)).toFixed(2);
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: i < parseInt(novo.parcelas) - 1 ? "1px solid #BFDBFE" : "none" }}>
                    <span>Parcela {i + 1}/{novo.parcelas}</span>
                    <span><strong>R$ {valor}</strong> — {base.toLocaleDateString("pt-BR")}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="ghost" onClick={() => setModalAdd(false)} style={{ flex: 1, justifyContent: "center" }}>Cancelar</Btn>
            <Btn onClick={addCliente} disabled={!novo.nome || !novo.telefone || !novo.total_divida} style={{ flex: 1, justifyContent: "center" }}>
              {parseInt(novo.parcelas) > 1 ? "Criar " + novo.parcelas + " parcelas" : "Cadastrar"}
            </Btn>
          </div>
        </Modal>
      )}

      {modalEditar && (
        <Modal title={"Editar — " + modalEditar.nome} onClose={() => setModalEditar(null)}>
          <Inp label="Nome *" value={editando.nome || ""} onChange={e => setEditando(p => ({ ...p, nome: e.target.value }))} placeholder="Nome completo" />
          <Inp label="CPF" value={editando.cpf || ""} onChange={e => setEditando(p => ({ ...p, cpf: e.target.value }))} placeholder="000.000.000-00" />
          <Inp label="WhatsApp *" value={editando.telefone || ""} onChange={e => setEditando(p => ({ ...p, telefone: e.target.value }))} placeholder="(44) 99999-0000" />
          <Inp label="E-mail" value={editando.email || ""} onChange={e => setEditando(p => ({ ...p, email: e.target.value }))} placeholder="email@exemplo.com" />
          <Inp label="Valor total (R$) *" type="number" value={editando.total_divida || ""} onChange={e => setEditando(p => ({ ...p, total_divida: e.target.value }))} placeholder="0,00" />
          <Inp label="Vencimento" type="date" value={editando.vencimento ? editando.vencimento.split("T")[0] : ""} onChange={e => setEditando(p => ({ ...p, vencimento: e.target.value }))} />
          <Sel label="Parcelas" value={editando.parcelas || 1} onChange={e => setEditando(p => ({ ...p, parcelas: e.target.value }))}>
            {[1,2,3,4,5,6,7,8,9,10,11,12,18,24].map(n => <option key={n} value={n}>{n}x</option>)}
          </Sel>
          <Sel label="Status" value={editando.status || "pendente"} onChange={e => setEditando(p => ({ ...p, status: e.target.value }))}>
            <option value="pendente">Pendente</option>
            <option value="atrasado">Atrasado</option>
            <option value="pago">Pago</option>
          </Sel>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="ghost" onClick={() => setModalEditar(null)} style={{ flex: 1, justifyContent: "center" }}>Cancelar</Btn>
            <Btn onClick={salvarEdicao} style={{ flex: 1, justifyContent: "center" }}>💾 Salvar</Btn>
          </div>
          {modalEditar.status !== "blacklist" && (
            <button onClick={() => { adicionarBlacklist(modalEditar); setModalEditar(null); }} style={{ width: "100%", marginTop: 10, background: "none", border: "none", color: "#991B1B", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "center" }}>🚫 Colocar este cliente na blacklist</button>
          )}
        </Modal>
      )}

      {modalProrrogar && (
        <Modal title={"Prorrogar — " + modalProrrogar.nome} onClose={() => { setModalProrrogar(null); setNovaData(""); }}>
          <div style={{ background: "#FEF3C7", borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 14, color: "#92400E" }}>
            <div>Valor: <strong>{fmt(modalProrrogar.total_divida)}</strong></div>
            <div>Vencimento atual: <strong>{modalProrrogar.vencimento ? fmtData(modalProrrogar.vencimento.split("T")[0]) : "Sem data"}</strong></div>
          </div>
          <Inp label="Nova data de vencimento *" type="date" value={novaData} onChange={e => setNovaData(e.target.value)} />
          <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#1E40AF" }}>
            💡 Ao prorrogar, as etapas da régua são resetadas para a nova data.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="ghost" onClick={() => { setModalProrrogar(null); setNovaData(""); }} style={{ flex: 1, justifyContent: "center" }}>Cancelar</Btn>
            <Btn onClick={prorrogarDivida} disabled={!novaData} variant="orange" style={{ flex: 1, justifyContent: "center" }}>📅 Confirmar</Btn>
          </div>
        </Modal>
      )}

      {modalImport && (
        <Modal title="Importar Planilha" onClose={() => { setModalImport(false); setCsvPreview([]); }} wide>
          {csvPreview.length === 0 ? (
            <div>
              <div style={{ background: "#F0FDF4", borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 13, color: "#166534" }}>
                <strong>Funciona com qualquer planilha</strong> — nossa ou de outro sistema (ex: sistema de salão). O sistema reconhece sozinho colunas como Nome/Cliente, Telefone/Celular, Valor/Dívida/Saldo. Sem coluna de vencimento? Usamos a data da última movimentação como referência. Você confere tudo antes de confirmar.
              </div>
              <button onClick={baixarModelo} style={{ width: "100%", background: "#EFF6FF", color: "#1E40AF", border: "1.5px solid #BFDBFE", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 14 }}>
                📥 Baixar modelo de planilha (Excel)
              </button>
              <div onClick={() => fileRef.current?.click()} style={{ border: "2px dashed #E2E8F0", borderRadius: 12, padding: 40, textAlign: "center", cursor: "pointer", background: "#F8FAFC" }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📊</div>
                <div style={{ fontWeight: 700, color: "#0B2B24" }}>Clique para selecionar</div>
                <div style={{ fontSize: 13, color: "#64748B" }}>Arquivo .xlsx, .xls ou .csv</div>
              </div>
              <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx,.xls" onChange={handleCSV} style={{ display: "none" }} />
            </div>
          ) : (
            <div>
              {(() => {
                const validos = csvPreview.filter(c => !c.pular);
                const pulados = csvPreview.filter(c => c.pular);
                const comDataInferida = validos.filter(c => c.vencimentoInferido).length;
                const duplicados = csvPreview.filter(c => c.duplicado);
                const botaoEstilo = (ativo) => ({ background: ativo ? "#1E40AF" : "#F1F5F9", color: ativo ? "#fff" : "#374151", border: "none", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" });
                return (
                  <>
                    <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "10px 14px", marginBottom: 10, fontSize: 13, color: "#1E40AF", fontWeight: 600 }}>
                      ✅ {validos.length} cliente(s) prontos para importar
                    </div>
                    {duplicados.length > 0 && (
                      <div style={{ background: "#FFFBEB", borderRadius: 10, padding: "10px 14px", marginBottom: 10, fontSize: 12, color: "#92400E", fontWeight: 600 }}>
                        🔁 {duplicados.length} já existem no seu cadastro (mesmo nome ou telefone) — revise cada um abaixo antes de confirmar.
                      </div>
                    )}
                    {comDataInferida > 0 && (
                      <div style={{ background: "#FFFBEB", borderRadius: 10, padding: "10px 14px", marginBottom: 10, fontSize: 12, color: "#92400E" }}>
                        💡 {comDataInferida} não tinham data de vencimento na planilha — usamos a última movimentação registrada como referência (marcados com 📅 abaixo).
                      </div>
                    )}
                    {pulados.length > 0 && (
                      <div style={{ background: "#FEF2F2", borderRadius: 10, padding: "10px 14px", marginBottom: 10, fontSize: 12, color: "#991B1B" }}>
                        ⚠️ {pulados.length} linha(s) não serão importadas: {pulados.slice(0, 5).map(p => p.nome || "(sem nome)").join(", ")}{pulados.length > 5 ? "..." : ""}
                      </div>
                    )}
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Confira a lista completa antes de confirmar:</div>
                    <div style={{ maxHeight: 380, overflow: "auto", marginBottom: 14, border: "1px solid #F1F5F9", borderRadius: 8 }}>
                      {csvPreview.map((r, i) => {
                        if (r.duplicado) {
                          const d = r.duplicado;
                          return (
                            <div key={i} style={{ padding: 12, background: d.pago ? "#FFFBEB" : "#EFF6FF", borderBottom: "1px solid #F1F5F9" }}>
                              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{r.nome} <span style={{ fontSize: 11, fontWeight: 400, color: "#64748B" }}>· {r.telefone}</span></div>
                              {d.pago ? (
                                <>
                                  <div style={{ fontSize: 12, color: "#92400E", marginBottom: 8 }}>
                                    ✅ Já pagou {fmt(d.valorAntigo)}{d.dataPagamento ? " em " + new Date(d.dataPagamento).toLocaleDateString("pt-BR") : ""}. Incluir nova dívida de {fmt(r.total_divida)} mesmo assim?
                                  </div>
                                  <div style={{ display: "flex", gap: 6 }}>
                                    <button onClick={() => atualizarDecisao(i, "incluir")} style={botaoEstilo(r.decisao === "incluir")}>Sim, incluir nova</button>
                                    <button onClick={() => atualizarDecisao(i, "nao_incluir")} style={botaoEstilo(r.decisao === "nao_incluir")}>Não, ignorar</button>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div style={{ fontSize: 12, color: "#1E40AF", marginBottom: 8 }}>
                                    Já existe: {fmt(d.valorAntigo)}{d.vencimentoAntigo ? " · venc. " + new Date(d.vencimentoAntigo).toLocaleDateString("pt-BR") : ""}. Na planilha nova: {fmt(r.total_divida)}. O que fazer?
                                  </div>
                                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                    <button onClick={() => atualizarDecisao(i, "substituir")} style={botaoEstilo(r.decisao === "substituir")}>Substituir valor</button>
                                    <button onClick={() => atualizarDecisao(i, "manter")} style={botaoEstilo(r.decisao === "manter")}>Manter os dois</button>
                                    <button onClick={() => atualizarDecisao(i, "ignorar")} style={botaoEstilo(r.decisao === "ignorar")}>Ignorar esse</button>
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        }
                        return (
                          <div key={i} style={{ padding: "8px 12px", background: r.pular ? "#FEF2F2" : (i % 2 === 0 ? "#F8FAFC" : "#fff"), fontSize: 13, borderBottom: "1px solid #F1F5F9", opacity: r.pular ? 0.7 : 1 }}>
                            <strong>{r.nome || "(sem nome)"}</strong> · {r.telefone || "sem telefone"} · R$ {r.total_divida?.toFixed(2) || "0,00"}
                            {r.parcelas > 1 ? " (" + r.parcelas + "x)" : ""}
                            {r.vencimento ? (r.vencimentoInferido ? " · 📅 " + r.vencimento + " (inferida)" : " · vence " + r.vencimento) : " · sem data"}
                            {r.pular && <span style={{ color: "#DC2626", fontWeight: 700 }}> · ⚠️ {r.motivoPular}</span>}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <Btn variant="ghost" onClick={() => setCsvPreview([])} style={{ flex: 1, justifyContent: "center" }}>← Voltar</Btn>
                      <Btn onClick={importarCSV} disabled={validos.length === 0} style={{ flex: 1, justifyContent: "center" }}>✅ Confirmar</Btn>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function Cobrancas({ clientes, historico, setHistorico, clientePreSelecionado, setClientePreSelecionado, token }) {
  const [clienteSel, setClienteSel] = useState(clientePreSelecionado?.id?.toString() || "");
  const [msg, setMsg] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [disparando, setDisparando] = useState(false);
  const [resultadoRegua, setResultadoRegua] = useState(null);
  const [filaEnvio, setFilaEnvio] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => { if (clientePreSelecionado) { setClienteSel(clientePreSelecionado.id.toString()); setClientePreSelecionado(null); } }, []);

  // Pré-preenche a mensagem quando um cliente é selecionado, pra não começar em branco
  useEffect(() => {
    if (!clienteSel) { setMsg(""); return; }
    const cliente = clientes.find(c => c.id.toString() === clienteSel);
    if (cliente) {
      const nome = cliente.nome.split(" ")[0];
      const valor = parseFloat(cliente.total_divida).toFixed(2).replace(".", ",");
      setMsg("Olá " + nome + "! 😊 Passando para lembrar sobre o pagamento de *R$ " + valor + "* em aberto. Qualquer dúvida, estou à disposição!");
    }
  }, [clienteSel, clientes]);

  const enviar = async () => {
    if (!clienteSel || !msg) return;
    setEnviando(true);
    const data = await api("/cobrancas/disparar", { method: "POST", body: JSON.stringify({ cliente_id: parseInt(clienteSel), mensagem: msg }) }, token);
    if (data.sucesso) { setSucesso(true); setTimeout(() => setSucesso(false), 3000); const h = await api("/cobrancas/historico", {}, token); if (Array.isArray(h)) setHistorico(h); }
    setEnviando(false);
  };

  // Busca a fila, mostra quem vai ser cobrado e em que ordem, dispara de
  // verdade, e depois acompanha em tempo real quem já foi confirmado —
  // ótimo pra mostrar numa demonstração que o sistema está funcionando.
  const dispararRegua = async () => {
    setResultadoRegua(null);
    const filaData = await api("/cobrancas/fila", {}, token);
    if (!filaData.fila || filaData.fila.length === 0) {
      setResultadoRegua("Nenhuma cobrança pendente agora — todo mundo já foi contatado ou está fora da régua hoje.");
      return;
    }
    setDisparando(true);
    setFilaEnvio(filaData.fila.map(f => ({ ...f, status: "aguardando" })));
    await api("/cobrancas/regua", { method: "POST", body: JSON.stringify({}) }, token);

    let tentativas = 0;
    pollRef.current = setInterval(async () => {
      tentativas++;
      const hist = await api("/cobrancas/historico", {}, token);
      if (Array.isArray(hist)) {
        setHistorico(hist);
        setFilaEnvio(prev => prev ? prev.map(item => {
          if (item.status !== "aguardando") return item;
          const achado = hist.find(h => h.cliente_id === item.cliente_id && h.etapa === item.etapa);
          return achado ? { ...item, status: achado.status === "enviado" ? "enviado" : "erro" } : item;
        }) : prev);
      }
      if (tentativas > 80) clearInterval(pollRef.current); // ~4min de segurança
    }, 3000);
  };

  useEffect(() => {
    if (!filaEnvio || !disparando) return;
    const restam = filaEnvio.filter(f => f.status === "aguardando").length;
    if (restam === 0) {
      setDisparando(false);
      clearInterval(pollRef.current);
      const enviados = filaEnvio.filter(f => f.status === "enviado").length;
      const erros = filaEnvio.filter(f => f.status === "erro").length;
      setResultadoRegua(enviados + " enviada(s) com sucesso" + (erros > 0 ? " · " + erros + " com erro" : "") + ".");
    }
  }, [filaEnvio, disparando]);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const [mostrarReguaVisual, setMostrarReguaVisual] = useState(false);
  const ETAPAS_VISUAL = [
    { etapa: "d-3",  label: "D-3",  quando: "3 dias antes do vencimento", cor: "#3B82F6", bg: "#EFF6FF", icone: "🔔" },
    { etapa: "d0",   label: "D0",   quando: "No dia do vencimento",        cor: "#EF4444", bg: "#FEF2F2", icone: "📅" },
    { etapa: "d+3",  label: "D+3",  quando: "3 dias em atraso",            cor: "#F59E0B", bg: "#FFFBEB", icone: "⚠️" },
    { etapa: "d+15", label: "D+15", quando: "15 dias em atraso",           cor: "#DC2626", bg: "#FEF2F2", icone: "🚨" },
    { etapa: "d+30", label: "D+30", quando: "30+ dias — repete a cada 15 dias até pagar", cor: "#7C3AED", bg: "#F5F3FF", icone: "⛔" },
  ];

  return (
    <div>
      <h1 style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 800, color: "#0B2B24" }}>Cobranças</h1>
      <div style={{ background: "linear-gradient(135deg, #EFF6FF, #F0FDF4)", border: "1px solid #BFDBFE", borderRadius: 16, padding: 18, marginBottom: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: "#1E40AF", marginBottom: 8 }}>🤖 Régua Automática</div>
        <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.6, marginBottom: 14 }}>
          Dispara automaticamente todo dia às 8h com QR Code Pix real.<br />
          <strong>D-3 · D0 · D+3 · D+15 · D+30</strong> com variação de mensagens.<br />
          Configure etapas em cada cliente clicando em <strong>"Régua"</strong>.
        </div>
        <Btn small variant="outline" onClick={() => setMostrarReguaVisual(p => !p)} style={{ width: "100%", justifyContent: "center", marginBottom: 12 }}>
          {mostrarReguaVisual ? "▲ Esconder como funciona" : "👀 Ver como funciona, passo a passo"}
        </Btn>
        {mostrarReguaVisual && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
            {ETAPAS_VISUAL.map((e, i) => {
              const exemplo = MENSAGENS_PADRAO[e.etapa] ? MENSAGENS_PADRAO[e.etapa]("Maria Silva", "150.00") : "";
              return (
                <div key={e.etapa} style={{ background: "#fff", borderRadius: 12, padding: 14, border: "1.5px solid " + e.cor + "33", position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: e.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{e.icone}</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: e.cor }}>{e.label}</div>
                      <div style={{ fontSize: 12, color: "#64748B" }}>{e.quando}</div>
                    </div>
                  </div>
                  <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#374151", fontStyle: "italic" }}>"{exemplo}"</div>
                  {i < ETAPAS_VISUAL.length - 1 && <div style={{ position: "absolute", left: 32, bottom: -14, width: 2, height: 14, background: "#E2E8F0" }} />}
                </div>
              );
            })}
            <div style={{ fontSize: 12, color: "#64748B", textAlign: "center", marginTop: 4 }}>💡 Exemplo com dados fictícios — cada cliente recebe com o nome e valor reais dele.</div>
          </div>
        )}
        <Btn onClick={dispararRegua} disabled={disparando} style={{ width: "100%", justifyContent: "center" }}>
          {disparando ? "⏳ Disparando..." : "▶ Disparar régua agora"}
        </Btn>
        {resultadoRegua && !disparando && <div style={{ marginTop: 10, background: "#fff", borderRadius: 8, padding: 10, fontSize: 13, color: "#16A34A", fontWeight: 600 }}>✅ {resultadoRegua}</div>}

        {filaEnvio && (
          <div className="cf-fade" style={{ marginTop: 14, background: "#0B2B24", borderRadius: 14, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{disparando ? "🔴 Enviando agora, em ordem..." : "Envio concluído"}</div>
              <div style={{ fontSize: 12, color: "#4ADE80", fontWeight: 700 }}>{filaEnvio.filter(f => f.status !== "aguardando").length}/{filaEnvio.length}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 99, height: 6, overflow: "hidden", marginBottom: 14 }}>
              <div style={{ width: (filaEnvio.filter(f => f.status !== "aguardando").length / filaEnvio.length * 100) + "%", background: "linear-gradient(90deg, #0E8F63, #4ADE80)", height: "100%", borderRadius: 99, transition: "width .6s ease" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" }}>
              {filaEnvio.map((f, i) => (
                <div key={f.cliente_id + f.etapa} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: f.status === "aguardando" ? "rgba(255,255,255,0.03)" : "rgba(74,222,128,0.08)", borderRadius: 8, opacity: f.status === "aguardando" ? 0.6 : 1 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0, background: f.status === "enviado" ? "#4ADE80" : f.status === "erro" ? "#DC2626" : "rgba(255,255,255,0.1)", color: f.status === "aguardando" ? "#7C8B87" : "#052B1E" }}>
                    {f.status === "enviado" ? "✓" : f.status === "erro" ? "!" : i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.nome}</div>
                    <div style={{ fontSize: 10.5, color: "#7C8B87" }}>{f.etapa.toUpperCase()} · {fmt(f.valor)}</div>
                  </div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: f.status === "enviado" ? "#4ADE80" : f.status === "erro" ? "#F87171" : "#7C8B87", flexShrink: 0 }}>
                    {f.status === "enviado" ? "Enviado" : f.status === "erro" ? "Falhou" : "Na fila"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {sucesso && <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 12, padding: 12, marginBottom: 14, color: "#16A34A", fontWeight: 600 }}>✅ Cobrança enviada!</div>}
      <div style={{ background: "#fff", borderRadius: 16, padding: 18, border: "1px solid #F1F5F9" }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>Enviar cobrança avulsa</h3>
        <Sel label="Cliente" value={clienteSel} onChange={e => setClienteSel(e.target.value)}>
          <option value="">Selecione...</option>
          {clientes.filter(c => c.status !== "pago" && c.status !== "blacklist").map(c => <option key={c.id} value={c.id}>{c.nome} — {fmt(c.total_divida)}</option>)}
        </Sel>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5 }}>Mensagem</label>
          <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={4} placeholder="Digite a mensagem..." style={{ width: "100%", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "10px 12px", fontSize: 14, outline: "none", background: "#F8FAFC", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
        </div>
        <Btn onClick={enviar} disabled={enviando || !clienteSel || !msg} style={{ width: "100%", justifyContent: "center" }}>{enviando ? "Enviando..." : <><Ic.send /> Enviar via WhatsApp</>}</Btn>
      </div>
    </div>
  );
}

function Historico({ historico, setHistorico, token }) {
  const etapaLabel = { "d-3": "D-3", "d0": "D0", "d+3": "D+3", "d+15": "D+15", "d+30": "D+30" };
  const [novosIds, setNovosIds] = useState(new Set());
  const idsAnteriores = useRef(new Set(historico.map(h => h.id)));
  const [modalConversa, setModalConversa] = useState(null);

  // Atualiza sozinho a cada 5s — mensagens que a régua ou o cron mandarem
  // aparecem aqui na hora, sem precisar sair da tela e voltar.
  useEffect(() => {
    const intervalo = setInterval(async () => {
      const h = await api("/cobrancas/historico", {}, token);
      if (Array.isArray(h)) {
        const idsNovos = h.filter(item => !idsAnteriores.current.has(item.id)).map(item => item.id);
        if (idsNovos.length > 0) {
          setNovosIds(new Set(idsNovos));
          setTimeout(() => setNovosIds(new Set()), 4000);
        }
        idsAnteriores.current = new Set(h.map(item => item.id));
        setHistorico(h);
      }
    }, 5000);
    return () => clearInterval(intervalo);
  }, [token]);

  return (
    <div>
      {modalConversa && <ModalConversa key={modalConversa.id} cliente={modalConversa} token={token} onClose={() => setModalConversa(null)} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0B2B24" }}>Histórico</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 700, color: "#4ADE80" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ADE80", display: "inline-block", animation: "cfPulseRing 2s infinite" }} /> AO VIVO
        </div>
      </div>
      <p style={{ margin: "0 0 16px", color: "#64748B", fontSize: 14 }}>{historico.length} mensagens enviadas</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {historico.map(h => (
          <div key={h.id} className={novosIds.has(h.id) ? "cf-fade" : ""} style={{ background: novosIds.has(h.id) ? "#F0FDF4" : "#fff", borderRadius: 14, padding: "14px 16px", border: novosIds.has(h.id) ? "1px solid #86EFAC" : "1px solid #F1F5F9", transition: "background .6s ease" }}>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ width: 36, height: 36, background: "#F0FDF4", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#16A34A", flexShrink: 0 }}><Ic.whatsapp /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 6 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0B2B24" }}>{h.cliente_nome || "—"}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {h.etapa && <span style={{ background: "#EFF6FF", color: "#1E40AF", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700 }}>{etapaLabel[h.etapa] || h.etapa}</span>}
                    {h.status === "erro" ? <span style={{ background: "#FEE2E2", color: "#DC2626", fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 20 }}>✕ Falhou</span> : <span style={{ background: "#DCFCE7", color: "#16A34A", fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 20 }}>{novosIds.has(h.id) ? "🆕 Enviado agora" : "✓ Enviado"}</span>}
                    {h.cliente_id && (
                      <button onClick={() => setModalConversa({ id: h.cliente_id, nome: h.cliente_nome })} style={{ background: "#ECFDF5", color: "#059669", border: "1.5px solid #A7F3D0", borderRadius: 7, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}><Ic.eye /></button>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 6 }}>{new Date(h.criado_em).toLocaleString("pt-BR")}</div>
                <div style={{ fontSize: 13, color: "#374151", background: "#F8FAFC", borderRadius: 8, padding: "6px 10px", wordBreak: "break-word" }}>{h.mensagem?.substring(0, 120)}...</div>
              </div>
            </div>
          </div>
        ))}
        {historico.length === 0 && <div style={{ textAlign: "center", padding: 60, color: "#94A3B8" }}><div style={{ fontSize: 40, marginBottom: 8 }}>📭</div><div style={{ fontWeight: 600 }}>Nenhuma cobrança enviada ainda</div></div>}
      </div>
    </div>
  );
}

function Relatorio({ token, clientes, onEditarCliente }) {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [blacklist, setBlacklist] = useState([]);
  const [errosEnvio, setErrosEnvio] = useState(null);
  const [dataErros, setDataErros] = useState(new Date().toISOString().split("T")[0]);
  const [detalhe, setDetalhe] = useState(null);

  useEffect(() => {
    Promise.all([
      api("/relatorio/inadimplencia", {}, token),
      api("/blacklist", {}, token),
      api("/relatorio/erros-envio?data=" + dataErros, {}, token),
    ]).then(([r, b, e]) => {
      if (r.inadimplentes) setDados(r);
      if (Array.isArray(b)) setBlacklist(b);
      if (e.erros) setErrosEnvio(e);
      setLoading(false);
    });
  }, []);

  const buscarErrosData = async (novaData) => {
    setDataErros(novaData);
    const e = await api("/relatorio/erros-envio?data=" + novaData, {}, token);
    if (e.erros) setErrosEnvio(e);
  };

  const removerBlacklist = async (id) => {
    await api("/blacklist/" + id, { method: "DELETE" }, token);
    setBlacklist(prev => prev.filter(b => b.id !== id));
  };

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: "#64748B" }}>Carregando...</div>;

  return (
    <div>
      <h1 style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 800, color: "#0B2B24" }}>Relatório</h1>

      {detalhe && <ModalDetalheLista titulo={detalhe.titulo} lista={detalhe.lista} onClose={() => setDetalhe(null)} />}

      <div style={{ background: "#fff", borderRadius: 16, padding: 18, border: "1px solid #F1F5F9", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>⚠️ Cobranças que falharam</h3>
          <input type="date" value={dataErros} onChange={e => buscarErrosData(e.target.value)} style={{ border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "6px 10px", fontSize: 13 }} />
        </div>
        {!errosEnvio || errosEnvio.total === 0 ? (
          <div style={{ textAlign: "center", color: "#16A34A", padding: 20, fontSize: 14, fontWeight: 600, background: "#F0FDF4", borderRadius: 10 }}>✅ Nenhuma falha nesse dia — todas as cobranças foram entregues.</div>
        ) : (
          <div>
            <div style={{ background: "#FEF2F2", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "#991B1B", fontWeight: 600 }}>
              {errosEnvio.total} cliente(s) não foram cobrados nesse dia — corrija os dados abaixo.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {errosEnvio.erros.map(e => {
                const clienteCompleto = clientes?.find(c => c.id === e.cliente_id);
                return (
                  <div key={e.id} style={{ background: "#FEF2F2", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#0B2B24" }}>{e.cliente_nome || "Cliente removido"}</div>
                      <div style={{ fontSize: 12, color: "#64748B" }}>{e.cliente_telefone || "—"} · {new Date(e.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <div style={{ background: "#FEE2E2", color: "#DC2626", padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>{e.erro_motivo}</div>
                      {clienteCompleto && onEditarCliente && (
                        <button onClick={() => onEditarCliente(clienteCompleto)} style={{ background: "#1E40AF", color: "#fff", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>✏️ Editar</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: "#64748B" }}>💡 Clique em "Editar" pra corrigir na hora. Na próxima passada da régua, o sistema tenta cobrar de novo automaticamente.</div>
          </div>
        )}
      </div>

      {dados && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 16 }}>
          {[
            { label: "Total inadimplente", value: fmt(dados.total_inadimplencia), color: "#DC2626", bg: "#FEF2F2", lista: dados.inadimplentes || [], titulo: "Clientes inadimplentes" },
            { label: "Clientes em atraso", value: dados.inadimplentes?.length || 0, color: "#F59E0B", bg: "#FFFBEB", lista: dados.inadimplentes || [], titulo: "Clientes em atraso" },
            { label: "Taxa inadimplência", value: dados.taxa_inadimplencia + "%", color: "#7C3AED", bg: "#F5F3FF", lista: dados.inadimplentes || [], titulo: "Clientes que compõem a taxa de inadimplência" },
            { label: "Taxa de recuperação", value: dados.taxa_recuperacao + "%", color: "#16A34A", bg: "#F0FDF4", lista: (clientes || []).filter(c => c.status === "pago"), titulo: "Clientes recuperados (pagos)" },
          ].map(c => (
            <div key={c.label} onClick={() => setDetalhe({ titulo: c.titulo, lista: c.lista })} style={{ background: c.bg, borderRadius: 14, padding: 16, border: "1px solid #F1F5F9", cursor: "pointer" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>{c.label} <span style={{ color: "#94A3B8" }}>→</span></div>
            </div>
          ))}
        </div>
      )}

      {dados?.inadimplentes?.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 18, border: "1px solid #F1F5F9", marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>⚠️ Clientes em atraso</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {dados.inadimplentes.map(c => (
              <div key={c.id} style={{ background: "#FEF2F2", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0B2B24" }}>{c.nome}</div>
                  <div style={{ fontSize: 12, color: "#64748B" }}>{c.telefone} · {Math.round(c.dias_atraso)} dias em atraso</div>
                </div>
                <div style={{ fontWeight: 800, color: "#DC2626" }}>{fmt(c.total_divida)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 16, padding: 18, border: "1px solid #F1F5F9" }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>🚫 Blacklist ({blacklist.length})</h3>
        {blacklist.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94A3B8", padding: 20, fontSize: 14 }}>Nenhum contato na blacklist</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {blacklist.map(b => (
              <div key={b.id} style={{ background: "#1F2937", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#F9FAFB" }}>{b.nome}</div>
                  <div style={{ fontSize: 12, color: "#9CA3AF" }}>{b.telefone} · {b.motivo}</div>
                </div>
                <button onClick={() => removerBlacklist(b.id)} style={{ background: "#374151", color: "#D1D5DB", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Remover</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Configuracoes({ usuario, token }) {
  const [pixInput, setPixInput] = useState("");
  const [pixTipo, setPixTipo] = useState("cpf_cnpj");
  const [pixSalvo, setPixSalvo] = useState(false);
  const [salvandoPix, setSalvandoPix] = useState(false);
  const [nomeEmpresaInput, setNomeEmpresaInput] = useState("");
  const [nomeEmpresaSalvo, setNomeEmpresaSalvo] = useState(false);
  const [salvandoNomeEmpresa, setSalvandoNomeEmpresa] = useState(false);
  const [toast, setToast] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [wppStatus, setWppStatus] = useState(null);
  const [loadingQr, setLoadingQr] = useState(false);
  const [instanciaWpp, setInstanciaWpp] = useState("");
  const [verificandoWpp, setVerificandoWpp] = useState(true);
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2500); };

  // Checa o status REAL da conexão direto na Evolution API ao abrir a tela —
  // não confia mais só no que ficou salvo no navegador, que podia dizer
  // "desconectado" mesmo com o WhatsApp funcionando normalmente no servidor.
  useEffect(() => {
    api("/whatsapp/status", {}, token).then(data => {
      if (data.state === "open" || data.instance?.state === "open") setInstanciaWpp("conectado");
      setVerificandoWpp(false);
    }).catch(() => setVerificandoWpp(false));
  }, [token]);

  const salvarNomeEmpresa = async () => {
    if (!nomeEmpresaInput.trim()) return;
    setSalvandoNomeEmpresa(true);
    const data = await api("/usuarios/nome-empresa", { method: "PUT", body: JSON.stringify({ nome_empresa: nomeEmpresaInput.trim() }) }, token);
    if (data.sucesso) { setNomeEmpresaSalvo(true); showToast("Nome do negócio salvo!"); }
    else showToast(data.erro || "Erro ao salvar", "error");
    setSalvandoNomeEmpresa(false);
  };
  const expiraEm = usuario?.expira_em ? fmtData(usuario.expira_em.split("T")[0]) : "—";
  const diasRestantes = usuario?.expira_em ? Math.floor((new Date(usuario.expira_em) - new Date()) / 86400000) : null;

  // Busca a chave Pix e o nome do negócio reais, salvos no banco — não depende
  // mais do localStorage do navegador
  useEffect(() => {
    api("/usuarios/me", {}, token).then(data => {
      if (data.pix_key) {
        setPixInput(data.pix_key);
        setPixSalvo(true);
        if (data.pix_key_tipo && TIPOS_PIX[data.pix_key_tipo]) setPixTipo(data.pix_key_tipo);
      }
      if (data.nome_empresa) {
        setNomeEmpresaInput(data.nome_empresa);
        setNomeEmpresaSalvo(true);
      }
    });
  }, [token]);

  const salvarPix = async () => {
    if (!pixInput.trim()) return;
    const config = TIPOS_PIX[pixTipo];
    if (!config.validar(pixInput)) { showToast(config.erro, "error"); return; }
    const chaveNormalizada = config.normalizar(pixInput);
    setSalvandoPix(true);
    const data = await api("/usuarios/pix-key", { method: "PUT", body: JSON.stringify({ pix_key: chaveNormalizada, pix_key_tipo: pixTipo }) }, token);
    if (data.sucesso) { setPixInput(chaveNormalizada); setPixSalvo(true); showToast("Chave Pix salva!"); }
    else showToast(data.erro || "Erro ao salvar chave Pix", "error");
    setSalvandoPix(false);
  };

  const conectarWpp = async () => {
    setLoadingQr(true); setQrCode(null); setWppStatus(null);
    const data = await api("/whatsapp/qrcode", {}, token);
    if (data.base64) { const src = data.base64.startsWith("data:") ? data.base64 : "data:image/png;base64," + data.base64; setQrCode(src); }
    else setWppStatus("Erro ao gerar QR Code. Tente novamente.");
    setLoadingQr(false);
  };
  // Confirma a conexão sozinho, checando a cada 3s — o usuário não precisa clicar em nada
  useEffect(() => {
    if (!qrCode) return;
    const interval = setInterval(async () => {
      const data = await api("/whatsapp/status", {}, token);
      if (data.state === "open" || data.instance?.state === "open") {
        setWppStatus("✅ WhatsApp conectado!");
        setQrCode(null);
        setInstanciaWpp("conectado");
        showToast("WhatsApp conectado com sucesso!");
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [qrCode, token]);
  const verificarStatus = async () => {
    const data = await api("/whatsapp/status", {}, token);
    if (data.state === "open" || data.instance?.state === "open") { setWppStatus("✅ WhatsApp conectado!"); setQrCode(null); setInstanciaWpp("conectado"); }
    else setWppStatus("⏳ Ainda não conectado — confirmamos automaticamente assim que escanear.");
  };
  const trocarSenha = async () => {
    if (novaSenha.length < 6) { showToast("Mínimo 6 caracteres", "error"); return; }
    if (novaSenha !== confirmaSenha) { showToast("Senhas não coincidem", "error"); return; }
    setTrocandoSenha(true);
    const data = await api("/auth/trocar-senha", { method: "POST", body: JSON.stringify({ senha_nova: novaSenha }) }, token);
    if (data.sucesso) { showToast("Senha alterada!"); setNovaSenha(""); setConfirmaSenha(""); } else showToast(data.erro || "Erro", "error");
    setTrocandoSenha(false);
  };
  return (
    <div>
      {toast && <ToastMsg {...toast} />}
      <h1 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 800, color: "#0B2B24" }}>Configurações</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: "1px solid #F1F5F9" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>👤 Meu Perfil</h3>
          {[["Nome", usuario?.nome], ["E-mail", usuario?.email], ["Plano", usuario?.plano?.charAt(0).toUpperCase() + usuario?.plano?.slice(1)], ["Válido até", expiraEm]].map(([k, v]) => (
            <div key={k} style={{ background: "#F8FAFC", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 14, color: "#64748B" }}>{k}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#0B2B24" }}>{v || "—"}</span>
            </div>
          ))}
          {diasRestantes !== null && diasRestantes <= 7 && (
            <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#92400E", fontWeight: 600, marginTop: 8 }}>
              ⚠️ Plano vence em {diasRestantes} dia(s)! Contato: (44) 99897-0506
            </div>
          )}
        </div>
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: "1px solid #F1F5F9" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>🔒 Alterar Senha</h3>
          <SenhaInput label="Nova senha" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
          <SenhaInput label="Confirmar senha" value={confirmaSenha} onChange={e => setConfirmaSenha(e.target.value)} placeholder="Repita a nova senha" />
          <Btn onClick={trocarSenha} disabled={trocandoSenha || !novaSenha || !confirmaSenha} style={{ width: "100%", justifyContent: "center" }}>{trocandoSenha ? "Salvando..." : "🔒 Alterar senha"}</Btn>
        </div>
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: "1px solid #F1F5F9" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>🏪 Nome do negócio</h3>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "#64748B" }}>É esse nome que aparece nas mensagens de cobrança pro seu cliente — use o nome que ele reconhece (ex: "Salão Bella"), não necessariamente o seu nome pessoal.</p>
          {nomeEmpresaSalvo ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F0FDF4", borderRadius: 10, padding: "12px 16px", border: "1px solid #86EFAC" }}>
              <div><div style={{ fontSize: 12, color: "#64748B" }}>Nome usado nas cobranças</div><div style={{ fontWeight: 800, fontSize: 15 }}>{nomeEmpresaInput}</div></div>
              <Btn small variant="ghost" onClick={() => setNomeEmpresaSalvo(false)}>✏️ Alterar</Btn>
            </div>
          ) : (
            <div>
              <Inp label="Nome do negócio" value={nomeEmpresaInput} onChange={e => setNomeEmpresaInput(e.target.value)} placeholder="Ex: Salão Bella, Barbearia do João..." />
              <Btn onClick={salvarNomeEmpresa} disabled={salvandoNomeEmpresa || !nomeEmpresaInput.trim()} style={{ width: "100%", justifyContent: "center" }}>{salvandoNomeEmpresa ? "Salvando..." : "Salvar nome do negócio"}</Btn>
            </div>
          )}
        </div>
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: "1px solid #F1F5F9" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>⚡ Chave Pix</h3>
          <p style={{ margin: "0 0 14px", fontSize: 13, color: "#64748B" }}>Sua chave Pix é incluída automaticamente nas cobranças com QR Code real.</p>
          {pixSalvo ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F0FDF4", borderRadius: 10, padding: "12px 16px", border: "1px solid #86EFAC" }}>
              <div><div style={{ fontSize: 12, color: "#64748B" }}>Chave cadastrada · {TIPOS_PIX[pixTipo]?.label}</div><div style={{ fontWeight: 800, fontFamily: "monospace", fontSize: 15 }}>{pixInput}</div></div>
              <Btn small variant="ghost" onClick={() => setPixSalvo(false)}>✏️ Alterar</Btn>
            </div>
          ) : (
            <div>
              <Sel label="Tipo de chave" value={pixTipo} onChange={e => setPixTipo(e.target.value)}>
                {Object.entries(TIPOS_PIX).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Sel>
              <Inp label="Chave Pix" value={pixInput} onChange={e => setPixInput(e.target.value)} placeholder={TIPOS_PIX[pixTipo].placeholder} />
              <Btn onClick={salvarPix} disabled={salvandoPix || !pixInput.trim()} style={{ width: "100%", justifyContent: "center" }}>{salvandoPix ? "Salvando..." : "Salvar chave Pix"}</Btn>
            </div>
          )}
        </div>
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: "1px solid #F1F5F9" }}>
          <h3 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700 }}>📱 Conectar WhatsApp</h3>
          <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748B" }}>Conecte o número do seu negócio para enviar cobranças automáticas</p>
          {verificandoWpp ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "#94A3B8", fontSize: 14 }}>Verificando conexão...</div>
          ) : (
            <>
              {instanciaWpp && !qrCode && (
                <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 10, padding: "12px 14px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 700, color: "#16A34A" }}>✅ WhatsApp conectado</div>
                  <Btn small variant="ghost" onClick={async () => { await api("/whatsapp/desconectar", { method: "POST" }, token); setInstanciaWpp(""); setQrCode(null); setWppStatus(null); showToast("WhatsApp desconectado."); }}>Desconectar</Btn>
                </div>
              )}
              {qrCode ? (
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 14, color: "#64748B", marginBottom: 14 }}>Escaneie com o WhatsApp do seu negócio — a conexão é confirmada automaticamente:</p>
                  <img src={qrCode} alt="QR Code WhatsApp" style={{ width: 220, height: 220, borderRadius: 10, border: "2px solid #E2E8F0", display: "block", margin: "0 auto 16px" }} />
                  <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                    <Btn small onClick={verificarStatus}><Ic.refresh /> Verificar</Btn>
                    <Btn small variant="ghost" onClick={() => { setQrCode(null); setWppStatus(null); }}>Cancelar</Btn>
                  </div>
                  {wppStatus && <div style={{ marginTop: 12, fontSize: 14, fontWeight: 600, color: wppStatus.includes("✅") ? "#16A34A" : "#D97706" }}>{wppStatus}</div>}
                </div>
              ) : !instanciaWpp && (
                <div>
                  <Btn onClick={conectarWpp} disabled={loadingQr} style={{ width: "100%", justifyContent: "center" }}>
                    {loadingQr ? "Gerando QR Code..." : <><Ic.qr /> Gerar QR Code</>}
                  </Btn>
                  {wppStatus && <div style={{ marginTop: 12, fontSize: 14, fontWeight: 600, color: wppStatus.includes("✅") ? "#16A34A" : "#DC2626" }}>{wppStatus}</div>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CobrarFacil() {
  const [sessao, setSessao] = useState(null);
  const [impersonando, setImpersonando] = useState(null); // { token, usuario } do lojista, quando admin clica "Acessar pra ajudar"
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const [onboardingCompleto, setOnboardingCompleto] = useState(null); // null=verificando, true/false depois
  const [configPendente, setConfigPendente] = useState(false); // true quando pulou sem terminar — mostra aviso fixo
  const [tela, setTela] = useState("dashboard");
  const [clientes, setClientes] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [clienteParaCobrar, setClienteParaCobrar] = useState(null);
  const [clienteParaEditar, setClienteParaEditar] = useState(null);
  const isMobile = useMobile();

  useEffect(() => {
    try {
      const token = localStorage.getItem("cobrarfacil_token");
      const usuario = localStorage.getItem("cobrarfacil_usuario");
      if (token && usuario) { const u = JSON.parse(usuario); setSessao({ isAdmin: u.plano === "admin", usuario: u, token }); }
    } catch {}
  }, []);

  useEffect(() => {
    const efetivo = impersonando || sessao;
    if (efetivo && !efetivo.isAdmin) {
      const t = efetivo.token;
      api("/clientes", {}, t).then(d => { if (Array.isArray(d)) setClientes(d); });
      api("/cobrancas/historico", {}, t).then(d => { if (Array.isArray(d)) setHistorico(d); });
    }
  }, [sessao, impersonando]);

  // Verifica se o primeiro acesso já foi todo configurado — pula essa checagem
  // durante impersonação (suporte não deve ser travado pelo assistente).
  useEffect(() => {
    if (impersonando) { setOnboardingCompleto(true); return; }
    if (!sessao || sessao.isAdmin) { setOnboardingCompleto(null); return; }
    if (trocandoSenha) return; // espera trocar senha primeiro
    (async () => {
      const [me, wpp, clis] = await Promise.all([
        api("/usuarios/me", {}, sessao.token),
        api("/whatsapp/status", {}, sessao.token).catch(() => ({})),
        api("/clientes", {}, sessao.token).catch(() => []),
      ]);
      const conectado = wpp?.state === "open" || wpp?.instance?.state === "open";
      const completo = conectado && !!me.nome_empresa && !!me.pix_key && Array.isArray(clis) && clis.length > 0;
      const skipKey = "cobrarfacil_onboarding_pulado_" + (sessao.usuario?.email || "");
      const pulouAntes = !completo && localStorage.getItem(skipKey) === "true";
      setConfigPendente(!completo); // usado pro aviso fixo, independente de ter pulado ou não
      setOnboardingCompleto(completo || pulouAntes);
    })();
  }, [sessao, impersonando, trocandoSenha]);

  const pularOnboarding = () => {
    const skipKey = "cobrarfacil_onboarding_pulado_" + (sessao.usuario?.email || "");
    try { localStorage.setItem(skipKey, "true"); } catch {}
    setConfigPendente(true);
    setOnboardingCompleto(true);
  };
  const retomarOnboarding = () => {
    const skipKey = "cobrarfacil_onboarding_pulado_" + (sessao.usuario?.email || "");
    try { localStorage.removeItem(skipKey); } catch {}
    setOnboardingCompleto(false);
  };

  const logout = () => { try { localStorage.removeItem("cobrarfacil_token"); localStorage.removeItem("cobrarfacil_usuario"); } catch {} setSessao(null); setImpersonando(null); setTrocandoSenha(false); setOnboardingCompleto(null); };
  const onLogin = (dados) => { setSessao(dados); if (!dados.isAdmin && dados.usuario?.primeiro_acesso) setTrocandoSenha(true); };

  if (!sessao) return <LoginScreen onLogin={onLogin} />;
  if (sessao.isAdmin && !impersonando) return <AdminPanel onLogout={logout} token={sessao.token} onImpersonar={setImpersonando} />;
  if (trocandoSenha) return <TrocarSenha token={sessao.token} onSucesso={() => setTrocandoSenha(false)} />;
  if (onboardingCompleto === false) return <OnboardingWizard token={sessao.token} onCompleto={() => setOnboardingCompleto(true)} onPular={pularOnboarding} />;
  if (onboardingCompleto === null) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B" }}>Carregando...</div>;

  const sessaoEfetiva = impersonando || sessao;
  const sairDoSuporte = () => { setImpersonando(null); setTela("dashboard"); };

  const irParaCobranca = (c) => { setClienteParaCobrar(c); setTela("cobrancas"); };
  const irParaEditar = (c) => { setClienteParaEditar(c); setTela("clientes"); };

  const nav = [
    { key: "dashboard", label: "Painel",     icon: <Ic.dash /> },
    { key: "clientes",  label: "Clientes",   icon: <Ic.clients /> },
    { key: "cobrancas", label: "Cobranças",  icon: <Ic.charge /> },
    { key: "historico", label: "Histórico",  icon: <Ic.history /> },
    { key: "relatorio", label: "Relatório",  icon: <Ic.report /> },
    { key: "config",    label: "Config.",    icon: <Ic.settings /> },
  ];

  const atrasadosCount = clientes.filter(c => c.status === "atrasado").length;

  const renderTela = () => {
    switch(tela) {
      case "dashboard": return <Dashboard clientes={clientes} token={sessaoEfetiva.token} />;
      case "clientes":  return <Clientes clientes={clientes} setClientes={setClientes} onCobranca={irParaCobranca} clienteParaEditar={clienteParaEditar} setClienteParaEditar={setClienteParaEditar} token={sessaoEfetiva.token} />;
      case "cobrancas": return <Cobrancas clientes={clientes} historico={historico} setHistorico={setHistorico} clientePreSelecionado={clienteParaCobrar} setClientePreSelecionado={setClienteParaCobrar} token={sessaoEfetiva.token} />;
      case "historico": return <Historico historico={historico} setHistorico={setHistorico} token={sessaoEfetiva.token} />;
      case "relatorio": return <Relatorio token={sessaoEfetiva.token} clientes={clientes} onEditarCliente={irParaEditar} />;
      case "config":    return <Configuracoes usuario={sessaoEfetiva.usuario} token={sessaoEfetiva.token} />;
      default: return null;
    }
  };

  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Inter', -apple-system, sans-serif", paddingBottom: 70 }}>
        <style>{GLOBAL_STYLES}</style>
        {impersonando && (
          <div style={{ background: "#7C3AED", color: "#fff", padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, fontWeight: 700, position: "sticky", top: 0, zIndex: 51 }}>
            <span>🔧 Modo suporte — vendo como {sessaoEfetiva.usuario?.nome?.split(" ")[0]}</span>
            <button onClick={sairDoSuporte} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 6, color: "#fff", fontSize: 11.5, padding: "4px 8px", cursor: "pointer", fontWeight: 700 }}>Voltar pro Admin</button>
          </div>
        )}
        {configPendente && !impersonando && (
          <div style={{ background: "#D97706", color: "#fff", padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, fontWeight: 700, position: "sticky", top: 0, zIndex: 51, gap: 8 }}>
            <span>⚠️ Configuração incompleta — a cobrança automática ainda não está ativa</span>
            <button onClick={retomarOnboarding} style={{ background: "rgba(255,255,255,0.25)", border: "none", borderRadius: 6, color: "#fff", fontSize: 11.5, padding: "4px 8px", cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }}>Continuar →</button>
          </div>
        )}
        <div style={{ height: 2, background: "linear-gradient(90deg, #0E8F63, #4ADE80, #0E8F63)" }} />
        <div style={{ background: "#070F0D", padding: "13px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid rgba(74,222,128,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <img src="/logo-192.png" alt="CobrarFácil" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", display: "block", boxShadow: "0 0 0 2px rgba(74,222,128,0.25)" }} />
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>CobrarFácil</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {atrasadosCount > 0 && <div style={{ background: "#DC2626", color: "#fff", borderRadius: 99, fontSize: 11, fontWeight: 700, padding: "3px 8px" }}>{atrasadosCount}</div>}
            <button onClick={logout} className="cf-btn" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#6B7A76", fontSize: 12, padding: "6px 10px", cursor: "pointer", fontWeight: 600 }}>Sair</button>
          </div>
        </div>
        <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>{renderTela()}</div>
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "1px solid #E2E8F0", display: "flex", zIndex: 100, boxShadow: "0 -4px 20px rgba(0,0,0,0.08)" }}>
          {nav.map(n => (
            <button key={n.key} onClick={() => setTela(n.key)} className="cf-btn" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8px 2px 6px", border: "none", background: "transparent", cursor: "pointer", color: tela === n.key ? "#0E8F63" : "#94A3B8", gap: 2, position: "relative" }}>
              {n.key === "clientes" && atrasadosCount > 0 && <span style={{ position: "absolute", top: 4, right: "50%", marginRight: -18, background: "#DC2626", color: "#fff", borderRadius: 99, fontSize: 8, fontWeight: 700, padding: "1px 4px" }}>{atrasadosCount}</span>}
              <div style={{ transform: tela === n.key ? "scale(1.1)" : "scale(1)" }}>{n.icon}</div>
              <span style={{ fontSize: 9, fontWeight: tela === n.key ? 700 : 500 }}>{n.label}</span>
              {tela === n.key && <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 20, height: 3, background: "#1E40AF", borderRadius: "3px 3px 0 0" }} />}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{GLOBAL_STYLES}</style>
      <div style={{ width: 224, background: "#070F0D", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 100, borderRight: "1px solid rgba(74,222,128,0.08)" }}>
        <div style={{ height: 2, background: "linear-gradient(90deg, #0E8F63, #4ADE80, #0E8F63)" }} />
        <div style={{ padding: "20px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <img src="/logo-192.png" alt="CobrarFácil" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", display: "block", boxShadow: "0 0 0 2px rgba(74,222,128,0.25)" }} />
            <div><div style={{ fontSize: 15.5, fontWeight: 800, color: "#fff", letterSpacing: "-0.3px" }}>CobrarFácil</div><div style={{ fontSize: 9.5, color: "#4ADE80", letterSpacing: "1.4px", fontWeight: 700 }}>SISTEMA DE COBRANÇA</div></div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }}>
          {nav.map(n => (
            <button key={n.key} onClick={() => setTela(n.key)} className="cf-btn" style={{
              width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "11px 13px", borderRadius: 10, border: "none", cursor: "pointer", marginBottom: 4,
              background: tela === n.key ? "linear-gradient(135deg, rgba(74,222,128,0.16), rgba(14,143,99,0.10))" : "transparent",
              boxShadow: tela === n.key ? "inset 0 0 0 1px rgba(74,222,128,0.25)" : "none",
              color: tela === n.key ? "#4ADE80" : "#6B7A76", fontSize: 13.5, fontWeight: tela === n.key ? 700 : 500, textAlign: "left", letterSpacing: "-0.1px"
            }}>
              {n.icon} {n.label}
              {n.key === "clientes" && atrasadosCount > 0 && <span style={{ marginLeft: "auto", background: "#DC2626", color: "#fff", borderRadius: 99, fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>{atrasadosCount}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding: "16px 18px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #0E8F63, #4ADE80)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#052B1E" }}>{sessaoEfetiva.usuario?.nome?.charAt(0) || "U"}</div>
            <div><div style={{ fontSize: 12.5, fontWeight: 700, color: "#E2E8F0" }}>{sessaoEfetiva.usuario?.nome?.split(" ")[0] || "Usuário"}</div><div style={{ fontSize: 10, color: "#5B6B67", textTransform: "capitalize" }}>Plano {sessaoEfetiva.usuario?.plano}</div></div>
          </div>
          {impersonando ? (
            <button onClick={sairDoSuporte} className="cf-btn" style={{ width: "100%", background: "#7C3AED", border: "none", borderRadius: 9, padding: "9px", color: "#fff", fontSize: 13, cursor: "pointer", fontWeight: 700 }}>🔧 Voltar pro Admin</button>
          ) : (
            <button onClick={logout} className="cf-btn" style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, padding: "9px", color: "#6B7A76", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Sair</button>
          )}
        </div>
      </div>
      <div style={{ flex: 1, marginLeft: 224, minWidth: 0 }}>
        {impersonando && (
          <div style={{ background: "#7C3AED", color: "#fff", padding: "8px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, fontWeight: 700 }}>
            <span>🔧 Modo suporte — vendo como {sessaoEfetiva.usuario?.nome}</span>
            <button onClick={sairDoSuporte} style={{ background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, padding: "4px 10px", cursor: "pointer", fontWeight: 700 }}>Voltar pro Admin</button>
          </div>
        )}
        {configPendente && !impersonando && (
          <div style={{ background: "#D97706", color: "#fff", padding: "8px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, fontWeight: 700 }}>
            <span>⚠️ Configuração incompleta — a cobrança automática ainda não está ativa</span>
            <button onClick={retomarOnboarding} style={{ background: "rgba(255,255,255,0.25)", border: "none", borderRadius: 6, color: "#fff", fontSize: 12, padding: "4px 10px", cursor: "pointer", fontWeight: 700 }}>Continuar configuração →</button>
          </div>
        )}
        <div style={{ background: "#fff", borderBottom: "1px solid #F1F5F9", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 50 }}>
          <span style={{ fontSize: 14, color: "#64748B", fontWeight: 600 }}>Bem-vindo, {sessaoEfetiva.usuario?.nome?.split(" ")[0] || ""}!</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {sessaoEfetiva.usuario?.avisoRenovacao && <div style={{ background: "#FEF3C7", color: "#92400E", padding: "5px 12px", borderRadius: 99, fontSize: 13, fontWeight: 700 }}>⚠️ Plano vencendo</div>}
            {atrasadosCount > 0 && <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#FEF2F2", color: "#DC2626", padding: "5px 12px", borderRadius: 99, fontSize: 13, fontWeight: 700 }}><Ic.bell /> {atrasadosCount} em atraso</div>}
          </div>
        </div>
        <div style={{ padding: "20px 24px" }}>{renderTela()}</div>
      </div>
    </div>
  );
}
