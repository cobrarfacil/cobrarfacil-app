import { useState, useEffect, useRef } from "react";

// ─── DADOS ────────────────────────────────────────────────────────────────────
const DB = {
  user: { id: 1, name: "Tiago Cabral", business: "Look Up Store", email: "tiago@lookupmoda.com.br", cnpj: "12.345.678/0001-99", plan: "Pro", avatar: "TC" },
  clientes: [
    { id: 1, nome: "João Silva", cpf: "123.456.789-00", telefone: "(44) 99801-2233", email: "joao@email.com", totalDivida: 850, status: "pendente", vencimento: "2026-06-20", parcelas: 3, parcelasPagas: 0, diasAtraso: 0, whatsapp: "5544998012233" },
    { id: 2, nome: "Maria Fernanda", cpf: "234.567.890-11", telefone: "(44) 98712-5544", email: "maria@email.com", totalDivida: 1200, status: "atrasado", vencimento: "2026-06-10", parcelas: 4, parcelasPagas: 1, diasAtraso: 14, whatsapp: "5544987125544" },
    { id: 3, nome: "Carlos Mendes", cpf: "345.678.901-22", telefone: "(44) 99654-8821", email: "carlos@email.com", totalDivida: 430, status: "pago", vencimento: "2026-06-15", parcelas: 2, parcelasPagas: 2, diasAtraso: 0, whatsapp: "5544996548821" },
    { id: 4, nome: "Ana Paula Costa", cpf: "456.789.012-33", telefone: "(44) 98523-6677", email: "ana@email.com", totalDivida: 2100, status: "atrasado", vencimento: "2026-06-05", parcelas: 6, parcelasPagas: 2, diasAtraso: 19, whatsapp: "5544985236677" },
    { id: 5, nome: "Roberto Lima", cpf: "567.890.123-44", telefone: "(44) 99741-3312", email: "roberto@email.com", totalDivida: 660, status: "pendente", vencimento: "2026-06-30", parcelas: 3, parcelasPagas: 0, diasAtraso: 0, whatsapp: "5544997413312" },
    { id: 6, nome: "Fernanda Alves", cpf: "678.901.234-55", telefone: "(44) 98833-9900", email: "fernanda@email.com", totalDivida: 980, status: "pago", vencimento: "2026-06-12", parcelas: 4, parcelasPagas: 4, diasAtraso: 0, whatsapp: "5544988339900" },
  ],
  historico: [
    { id: 1, clienteId: 2, tipo: "whatsapp", data: "2026-06-18 09:12", mensagem: "Olá Maria, temos uma parcela em aberto de R$300. Clique para regularizar.", status: "lido", autor: "sistema" },
    { id: 2, clienteId: 4, tipo: "whatsapp", data: "2026-06-17 10:30", mensagem: "Ana, sua dívida está em atraso. Entre em contato para evitar restrições.", status: "lido", autor: "sistema" },
    { id: 3, clienteId: 1, tipo: "whatsapp", data: "2026-06-16 08:00", mensagem: "Lembrete: sua parcela vence em 4 dias. Regularize agora!", status: "entregue", autor: "sistema" },
    { id: 4, clienteId: 2, tipo: "whatsapp", data: "2026-06-15 14:22", mensagem: "Oi! Tudo bem? Só lembrando do pagamento da parcela 😊", status: "entregue", autor: "voce" },
    { id: 5, clienteId: 4, tipo: "whatsapp", data: "2026-06-14 16:45", mensagem: "Boa tarde Ana! Conseguiu verificar sobre o pagamento?", status: "lido", autor: "voce" },
    { id: 6, clienteId: 4, tipo: "whatsapp", data: "2026-06-14 17:10", mensagem: "Sim, vou pagar na sexta!", status: "lido", autor: "cliente" },
  ],
};

const fmt = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const statusColor = {
  pendente: { bg: "#FEF3C7", text: "#D97706", label: "Pendente" },
  atrasado: { bg: "#FEE2E2", text: "#DC2626", label: "Atrasado" },
  pago:     { bg: "#DCFCE7", text: "#16A34A", label: "Pago" },
};

// ─── ÍCONES ───────────────────────────────────────────────────────────────────
const Ic = {
  dash:     () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  clients:  () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  charge:   () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  history:  () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  upload:   () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  negat:    () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  settings: () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  whatsapp: () => <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12.004 2C6.478 2 2 6.478 2 12.004c0 1.85.488 3.585 1.337 5.09L2 22l4.992-1.311A10 10 0 0 0 12.004 22C17.53 22 22 17.522 22 12.004 22 6.478 17.53 2 12.004 2z" opacity=".3"/></svg>,
  email:    () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  plus:     () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  send:     () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  alert:    () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  check:    () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>,
  close:    () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  money:    () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  trend:    () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  users:    () => <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>,
  bell:     () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  approve:  () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  recover:  () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  chat:     () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  refresh:  () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  credit:   () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  pix:      () => <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M11.465 2.807a.75.75 0 0 1 1.07 0l2.636 2.636a3.75 3.75 0 0 0 2.652 1.098h.927a.75.75 0 0 1 .75.75v.927a3.75 3.75 0 0 0 1.098 2.652l2.636 2.636a.75.75 0 0 1 0 1.07l-2.636 2.636a3.75 3.75 0 0 0-1.098 2.652v.927a.75.75 0 0 1-.75.75h-.927a3.75 3.75 0 0 0-2.652 1.098l-2.636 2.636a.75.75 0 0 1-1.07 0l-2.636-2.636A3.75 3.75 0 0 0 6.177 21.25H5.25a.75.75 0 0 1-.75-.75v-.927a3.75 3.75 0 0 0-1.098-2.652L.766 14.285a.75.75 0 0 1 0-1.07l2.636-2.636A3.75 3.75 0 0 0 4.5 7.927V7a.75.75 0 0 1 .75-.75h.927a3.75 3.75 0 0 0 2.652-1.098l2.636-2.636z"/></svg>,
  download: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  shield:   () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  info:     () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  eye:      () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  robot:    () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M12 11V7"/><circle cx="12" cy="5" r="2"/><line x1="8" y1="15" x2="8" y2="17"/><line x1="16" y1="15" x2="16" y2="17"/></svg>,
};

// ─── COMPONENTES BASE ─────────────────────────────────────────────────────────
const Badge = ({ status }) => {
  const s = statusColor[status] || { bg: "#F1F5F9", text: "#64748B", label: status };
  return <span style={{ background: s.bg, color: s.text, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{s.label}</span>;
};

const Modal = ({ title, children, onClose, wide, fullscreen }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: fullscreen ? "stretch" : "center", justifyContent: "center", padding: fullscreen ? 0 : 16 }}>
    <div style={{ background: "#fff", borderRadius: fullscreen ? 0 : 16, width: "100%", maxWidth: fullscreen ? "100%" : wide ? 720 : 500, maxHeight: fullscreen ? "100vh" : "92vh", overflow: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid #F1F5F9", position: "sticky", top: 0, background: "#fff", zIndex: 1, flexShrink: 0 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0F172A" }}>{title}</h3>
        <button onClick={onClose} style={{ background: "#F1F5F9", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B" }}><Ic.close /></button>
      </div>
      <div style={{ padding: 24, flex: 1, overflowY: "auto" }}>{children}</div>
    </div>
  </div>
);

const Inp = ({ label, ...props }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5 }}>{label}</label>}
    <input {...props} style={{ width: "100%", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#0F172A", outline: "none", boxSizing: "border-box", background: "#F8FAFC", ...props.style }} />
  </div>
);

const Sel = ({ label, children, ...props }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5 }}>{label}</label>}
    <select {...props} style={{ width: "100%", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "10px 14px", fontSize: 14, color: "#0F172A", outline: "none", background: "#F8FAFC", cursor: "pointer", boxSizing: "border-box" }}>{children}</select>
  </div>
);

const Btn = ({ children, onClick, variant = "primary", small, style: s = {}, disabled }) => {
  const v = {
    primary: { background: "#1E40AF", color: "#fff", border: "none" },
    green:   { background: "#16A34A", color: "#fff", border: "none" },
    danger:  { background: "#DC2626", color: "#fff", border: "none" },
    ghost:   { background: "#F1F5F9", color: "#374151", border: "none" },
    outline: { background: "transparent", color: "#1E40AF", border: "1.5px solid #1E40AF" },
    orange:  { background: "#EA580C", color: "#fff", border: "none" },
    whatsapp:{ background: "#25D366", color: "#fff", border: "none" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...v[variant], borderRadius: 10, padding: small ? "7px 14px" : "10px 20px", fontSize: small ? 13 : 14, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 6, ...s }}>
      {children}
    </button>
  );
};

const ToastMsg = ({ msg, type }) => (
  <div style={{ position: "fixed", top: 20, right: 20, background: type === "success" ? "#16A34A" : "#DC2626", color: "#fff", borderRadius: 12, padding: "12px 20px", fontSize: 14, fontWeight: 600, zIndex: 3000, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", maxWidth: 320 }}>{msg}</div>
);

// ─── ESPELHO DE CONVERSA (NOVO) ───────────────────────────────────────────────
function EsperhoConversa({ cliente, historico, setHistorico, onClose, setClientes }) {
  const [msg, setMsg] = useState("");
  const [toast, setToast] = useState(null);
  const [modalRolar, setModalRolar] = useState(false);
  const [novaData, setNovaData] = useState("");
  const [novoValor, setNovoValor] = useState("");
  const bottomRef = useRef(null);
  const showToast = (m, type = "success") => { setToast({ msg: m, type }); setTimeout(() => setToast(null), 3000); };

  const convs = historico.filter(h => h.clienteId === cliente.id).sort((a, b) => a.data.localeCompare(b.data));

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [convs.length]);

  const enviarMsg = () => {
    if (!msg.trim()) return;
    setHistorico(prev => [...prev, {
      id: Date.now(), clienteId: cliente.id, tipo: "whatsapp",
      data: new Date().toLocaleString("pt-BR").replace(",", ""),
      mensagem: msg.trim(), status: "enviado", autor: "voce"
    }]);
    setMsg("");
    showToast("Mensagem enviada!");
  };

  const confirmarPagamento = () => {
    setClientes(prev => prev.map(c => c.id === cliente.id ? { ...c, status: "pago", parcelasPagas: c.parcelas, diasAtraso: 0 } : c));
    setHistorico(prev => [...prev, { id: Date.now(), clienteId: cliente.id, tipo: "whatsapp", data: new Date().toLocaleString("pt-BR").replace(",", ""), mensagem: "✅ Pagamento confirmado pelo operador.", status: "entregue", autor: "sistema" }]);
    showToast("✅ Pagamento confirmado!");
  };

  const cobrarNovamente = () => {
    const texto = `Olá ${cliente.nome}! 😊 A *${DB.user.business}* lembra que você tem uma pendência de *${fmt(cliente.totalDivida)}*. Regularize agora para evitar restrições. Precisa de ajuda? Fale conosco!`;
    setHistorico(prev => [...prev, { id: Date.now(), clienteId: cliente.id, tipo: "whatsapp", data: new Date().toLocaleString("pt-BR").replace(",", ""), mensagem: texto, status: "enviado", autor: "sistema" }]);
    showToast("Cobrança enviada!");
  };

  const rolarDivida = () => {
    if (!novaData) return;
    setClientes(prev => prev.map(c => c.id === cliente.id ? { ...c, vencimento: novaData, totalDivida: novoValor ? parseFloat(novoValor) : c.totalDivida, status: "pendente", diasAtraso: 0 } : c));
    setHistorico(prev => [...prev, { id: Date.now(), clienteId: cliente.id, tipo: "whatsapp", data: new Date().toLocaleString("pt-BR").replace(",", ""), mensagem: `📅 Dívida renegociada. Novo vencimento: ${novaData}${novoValor ? ". Novo valor: " + fmt(parseFloat(novoValor)) : ""}.`, status: "entregue", autor: "sistema" }]);
    setModalRolar(false);
    showToast("Dívida renegociada!");
  };

  const enviarComprovante = () => {
    showToast("📎 Solicitar comprovante — integração WhatsApp necessária para envio real.", "error");
  };

  const autorCor = (autor) => {
    if (autor === "voce") return { bg: "#DBEAFE", align: "flex-end", cor: "#1E40AF" };
    if (autor === "cliente") return { bg: "#F0FDF4", align: "flex-start", cor: "#16A34A" };
    return { bg: "#F1F5F9", align: "flex-start", cor: "#64748B" };
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 2000, display: "flex", alignItems: "stretch", justifyContent: "center" }}>
      {toast && <ToastMsg {...toast} />}
      <div style={{ background: "#fff", width: "100%", maxWidth: 680, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ background: "#075E54", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 20, padding: 0, display: "flex" }}>←</button>
          <div style={{ width: 42, height: 42, background: "#128C7E", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{cliente.nome.charAt(0)}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: "#fff", fontSize: 16 }}>{cliente.nome}</div>
            <div style={{ fontSize: 12, color: "#B2DFDB" }}>{cliente.telefone} · <Badge status={cliente.status} /></div>
          </div>
          <div style={{ fontWeight: 800, color: "#fff", fontSize: 15 }}>{fmt(cliente.totalDivida)}</div>
        </div>

        {/* Botões de ação rápida */}
        <div style={{ background: "#F0F0F0", padding: "10px 16px", display: "flex", gap: 8, flexWrap: "wrap", borderBottom: "1px solid #ddd", flexShrink: 0 }}>
          <button onClick={cobrarNovamente} style={{ background: "#25D366", color: "#fff", border: "none", borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}><Ic.send /> Cobrar</button>
          <button onClick={() => setModalRolar(true)} style={{ background: "#F59E0B", color: "#fff", border: "none", borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}><Ic.refresh /> Rolar dívida</button>
          <button onClick={confirmarPagamento} style={{ background: "#16A34A", color: "#fff", border: "none", borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}><Ic.check /> Pago</button>
          <button onClick={enviarComprovante} style={{ background: "#7C3AED", color: "#fff", border: "none", borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}><Ic.download /> Comprovante</button>
          <a href={"https://wa.me/" + (cliente.whatsapp || cliente.telefone.replace(/\D/g, ""))} target="_blank" rel="noreferrer" style={{ background: "#128C7E", color: "#fff", border: "none", borderRadius: 20, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, textDecoration: "none" }}><Ic.whatsapp /> Abrir WhatsApp</a>
        </div>

        {/* Conversa */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px", background: "#ECE5DD", display: "flex", flexDirection: "column", gap: 10 }}>
          {convs.length === 0 && (
            <div style={{ textAlign: "center", color: "#64748B", marginTop: 60 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
              <div style={{ fontWeight: 600 }}>Nenhuma conversa ainda</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>Use os botões acima para iniciar</div>
            </div>
          )}
          {convs.map(h => {
            const { bg, align, cor } = autorCor(h.autor);
            return (
              <div key={h.id} style={{ display: "flex", justifyContent: align }}>
                <div style={{ background: bg, borderRadius: 12, padding: "10px 14px", maxWidth: "75%", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
                  {h.autor === "sistema" && <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700, marginBottom: 4 }}>🤖 SISTEMA</div>}
                  {h.autor === "cliente" && <div style={{ fontSize: 10, color: "#16A34A", fontWeight: 700, marginBottom: 4 }}>{cliente.nome}</div>}
                  {h.autor === "voce" && <div style={{ fontSize: 10, color: "#1E40AF", fontWeight: 700, marginBottom: 4 }}>Você</div>}
                  <div style={{ fontSize: 14, color: "#0F172A", lineHeight: 1.5 }}>{h.mensagem}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4, textAlign: "right" }}>{h.data} {h.status === "lido" ? "✓✓" : h.status === "entregue" ? "✓" : ""}</div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input de mensagem */}
        <div style={{ background: "#F0F0F0", padding: "10px 16px", display: "flex", gap: 10, alignItems: "flex-end", flexShrink: 0 }}>
          <textarea
            value={msg}
            onChange={e => setMsg(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarMsg(); } }}
            placeholder="Digite uma mensagem..."
            rows={2}
            style={{ flex: 1, border: "none", borderRadius: 20, padding: "10px 16px", fontSize: 14, outline: "none", resize: "none", background: "#fff", fontFamily: "inherit" }}
          />
          <button onClick={enviarMsg} style={{ background: "#25D366", border: "none", borderRadius: "50%", width: 44, height: 44, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
            <Ic.send />
          </button>
        </div>
      </div>

      {/* Modal rolar dívida */}
      {modalRolar && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 380 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 700 }}>📅 Renegociar Dívida</h3>
            <div style={{ background: "#FEF3C7", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#92400E" }}>
              Dívida atual: <strong>{fmt(cliente.totalDivida)}</strong>
            </div>
            <Inp label="Novo vencimento" type="date" value={novaData} onChange={e => setNovaData(e.target.value)} />
            <Inp label="Novo valor (deixe em branco para manter)" type="number" value={novoValor} onChange={e => setNovoValor(e.target.value)} placeholder={fmt(cliente.totalDivida)} />
            <div style={{ display: "flex", gap: 10 }}>
              <Btn variant="ghost" onClick={() => setModalRolar(false)} style={{ flex: 1, justifyContent: "center" }}>Cancelar</Btn>
              <Btn onClick={rolarDivida} disabled={!novaData} style={{ flex: 1, justifyContent: "center" }}>Confirmar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("tiago@lookupmoda.com.br");
  const [senha, setSenha] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [aba, setAba] = useState("login"); // login | cadastro | planos

  const go = () => {
    if (email === "admin@cobrarfacil.com.br" && senha === "admin2026") {
      setLoading(true);
      setTimeout(() => { setLoading(false); onLogin(true); }, 1000);
      return;
    }
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(false); }, 1100);
  };

  const planos = [
    { nome: "Starter", preco: "R$47", features: ["Até 50 clientes", "WhatsApp manual", "Importação CSV", "Suporte por e-mail"], cor: "#22C55E" },
    { nome: "Pro", preco: "R$97", features: ["Clientes ilimitados", "WhatsApp automático", "Régua completa", "Negativação Serasa", "Suporte prioritário"], cor: "#3B82F6", destaque: true },
    { nome: "Enterprise", preco: "R$297", features: ["Tudo do Pro", "Multi-usuário", "API de integração", "Gerente de conta"], cor: "#A78BFA" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 50%, #1E40AF 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16 }}>
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
          <div style={{ width: 52, height: 52, background: "linear-gradient(135deg, #22C55E, #0D9488)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: -1, boxShadow: "0 4px 20px rgba(34,197,94,0.4)" }}>C$</div>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: -1, lineHeight: 1 }}>CobrarFácil</div>
            <div style={{ fontSize: 11, color: "#93C5FD", fontWeight: 600, letterSpacing: 2 }}>SISTEMA DE COBRANÇA</div>
          </div>
        </div>
        <p style={{ color: "#94A3B8", fontSize: 15, margin: 0 }}>Seus clientes pagam. Você recebe.</p>
      </div>

      {/* Abas */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: 4 }}>
        {[["login", "Entrar"], ["cadastro", "Criar conta"], ["planos", "Planos"]].map(([k, l]) => (
          <button key={k} onClick={() => setAba(k)} style={{ background: aba === k ? "#fff" : "transparent", color: aba === k ? "#0F172A" : "#94A3B8", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s" }}>{l}</button>
        ))}
      </div>

      <div style={{ width: "100%", maxWidth: aba === "planos" ? 860 : 420 }}>
        {/* ABA LOGIN */}
        {aba === "login" && (
          <div style={{ background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 25px 80px rgba(0,0,0,0.3)" }}>
            <h2 style={{ margin: "0 0 22px", fontSize: 20, fontWeight: 700, color: "#0F172A" }}>Entrar na plataforma</h2>
            <Inp label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
            <Inp label="Senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" />
            <div style={{ textAlign: "right", marginBottom: 18 }}>
              <span style={{ fontSize: 13, color: "#1E40AF", cursor: "pointer", fontWeight: 600 }}>Esqueci minha senha</span>
            </div>
            <Btn onClick={go} style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "12px 20px" }}>
              {loading ? "Entrando..." : "Entrar na plataforma →"}
            </Btn>
            <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#64748B" }}>
              Não tem conta?{" "}
              <span onClick={() => setAba("cadastro")} style={{ color: "#1E40AF", fontWeight: 700, cursor: "pointer" }}>Testar grátis 7 dias</span>
            </div>
          </div>
        )}

        {/* ABA CADASTRO */}
        {aba === "cadastro" && (
          <div style={{ background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 25px 80px rgba(0,0,0,0.3)" }}>
            <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 14, color: "#16A34A", fontWeight: 600, textAlign: "center" }}>
              🎁 7 dias grátis · Sem cartão de crédito
            </div>
            <h2 style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700, color: "#0F172A" }}>Criar conta grátis</h2>
            <Inp label="Nome completo" placeholder="João da Silva" />
            <Inp label="E-mail" type="email" placeholder="seu@email.com" />
            <Inp label="WhatsApp" placeholder="(44) 99999-0000" />
            <Inp label="Nome do seu negócio" placeholder="Loja das Arábias" />
            <Inp label="Senha" type="password" placeholder="Mínimo 8 caracteres" />
            <Btn style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "12px 20px" }}>
              Começar 7 dias grátis →
            </Btn>
            <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "#94A3B8" }}>
              Ao criar conta você aceita os <span style={{ color: "#1E40AF", cursor: "pointer" }}>Termos de Uso</span>
            </div>
          </div>
        )}

        {/* ABA PLANOS */}
        {aba === "planos" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            {planos.map(p => (
              <div key={p.nome} style={{ background: "#fff", borderRadius: 20, padding: 28, boxShadow: p.destaque ? "0 0 0 2px " + p.cor + ", 0 25px 80px rgba(0,0,0,0.3)" : "0 10px 40px rgba(0,0,0,0.2)", position: "relative" }}>
                {p.destaque && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: p.cor, color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 14px", borderRadius: 99 }}>MAIS POPULAR</div>}
                <div style={{ fontSize: 13, fontWeight: 700, color: p.cor, marginBottom: 6 }}>{p.nome}</div>
                <div style={{ fontSize: 34, fontWeight: 900, color: "#0F172A", marginBottom: 4 }}>{p.preco}<span style={{ fontSize: 14, fontWeight: 400, color: "#94A3B8" }}>/mês</span></div>
                <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
                  {p.features.map(f => <div key={f} style={{ fontSize: 13, color: "#374151", display: "flex", gap: 8, alignItems: "flex-start" }}><span style={{ color: p.cor, flexShrink: 0, marginTop: 1 }}>✓</span>{f}</div>)}
                </div>
                <Btn onClick={() => setAba("cadastro")} style={{ width: "100%", justifyContent: "center", background: p.cor }}>Começar grátis</Btn>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 24, marginTop: 28, justifyContent: "center", flexWrap: "wrap" }}>
        {["✅ Sem cartão de crédito", "📱 WhatsApp automático", "📋 Negativação Serasa", "💳 Pague com Pix ou Cartão"].map(f => (
          <div key={f} style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500 }}>{f}</div>
        ))}
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ clientes, setTela, setFiltroClientes }) {
  const total = clientes.reduce((a, c) => a + c.totalDivida, 0);
  const atrasados = clientes.filter(c => c.status === "atrasado");
  const pagos = clientes.filter(c => c.status === "pago");
  const pendentes = clientes.filter(c => c.status === "pendente");
  const totalRecebido = pagos.reduce((a, c) => a + c.totalDivida, 0);
  const totalEmRisco = atrasados.reduce((a, c) => a + c.totalDivida, 0);

  const cards = [
    { label: "Total em cobrança", value: fmt(total), icon: <Ic.money />, color: "#1E40AF", bg: "#EFF6FF", filtro: "todos", sub: clientes.length + " clientes" },
    { label: "Já recebido", value: fmt(totalRecebido), icon: <Ic.trend />, color: "#16A34A", bg: "#F0FDF4", filtro: "pago", sub: pagos.length + " pagos" },
    { label: "Em risco", value: fmt(totalEmRisco), icon: <Ic.alert />, color: "#DC2626", bg: "#FEF2F2", filtro: "atrasado", sub: atrasados.length + " atrasados" },
    { label: "Total de clientes", value: clientes.length, icon: <Ic.users />, color: "#7C3AED", bg: "#F5F3FF", filtro: "todos", sub: pendentes.length + " pendentes" },
  ];

  const irParaClientes = (filtro) => {
    setFiltroClientes(filtro);
    setTela("clientes");
  };

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0F172A" }}>Painel Geral</h1>
        <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 14 }}>
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Cards clicáveis */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
        {cards.map(c => (
          <div key={c.label} onClick={() => irParaClientes(c.filtro)}
            style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #F1F5F9", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 1px 6px rgba(0,0,0,0.06)"; }}>
            <div style={{ width: 38, height: 38, background: c.bg, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: c.color, marginBottom: 10 }}>{c.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", marginBottom: 2 }}>{c.value}</div>
            <div style={{ fontSize: 12, color: "#64748B" }}>{c.label}</div>
            <div style={{ fontSize: 11, color: c.color, fontWeight: 600, marginTop: 4 }}>{c.sub} →</div>
          </div>
        ))}
      </div>

      {atrasados.length > 0 && (
        <div onClick={() => irParaClientes("atrasado")} style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: 14, marginBottom: 16, display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
          <span style={{ color: "#DC2626", flexShrink: 0 }}><Ic.alert /></span>
          <div style={{ flex: 1 }}>
            <strong style={{ color: "#DC2626" }}>{atrasados.length} clientes em atraso —</strong>
            <span style={{ color: "#B91C1C", fontSize: 13, marginLeft: 6 }}>{fmt(totalEmRisco)} em risco</span>
          </div>
          <span style={{ color: "#DC2626", fontSize: 13, fontWeight: 600 }}>Ver todos →</span>
        </div>
      )}

      {/* Status dos clientes */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: "1px solid #F1F5F9", marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>Situação dos Clientes</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          {[
            { label: "Pagos", count: pagos.length, color: "#16A34A", bg: "#F0FDF4", filtro: "pago" },
            { label: "Pendentes", count: pendentes.length, color: "#D97706", bg: "#FFFBEB", filtro: "pendente" },
            { label: "Atrasados", count: atrasados.length, color: "#DC2626", bg: "#FEF2F2", filtro: "atrasado" },
          ].map(s => (
            <div key={s.label} onClick={() => irParaClientes(s.filtro)}
              style={{ flex: 1, minWidth: 80, background: s.bg, borderRadius: 12, padding: "14px", textAlign: "center", cursor: "pointer", border: "2px solid transparent", transition: "border 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = s.color}
              onMouseLeave={e => e.currentTarget.style.borderColor = "transparent"}>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: 12, color: s.color, fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: "#64748B" }}>Taxa de recebimento</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#16A34A" }}>{total > 0 ? Math.round((totalRecebido / total) * 100) : 0}%</span>
        </div>
        <div style={{ background: "#F1F5F9", borderRadius: 99, height: 8, overflow: "hidden" }}>
          <div style={{ width: (total > 0 ? Math.round((totalRecebido / total) * 100) : 0) + "%", background: "linear-gradient(90deg, #16A34A, #22C55E)", height: "100%", borderRadius: 99, transition: "width 0.5s" }} />
        </div>
      </div>

      {/* Top clientes em atraso */}
      {atrasados.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: "1px solid #F1F5F9" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#DC2626" }}>⚠️ Prioridade de cobrança</h3>
            <span onClick={() => irParaClientes("atrasado")} style={{ fontSize: 13, color: "#1E40AF", fontWeight: 600, cursor: "pointer" }}>Ver todos →</span>
          </div>
          {atrasados.slice(0, 3).map(c => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #F8FAFC" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{c.nome}</div>
                <div style={{ fontSize: 12, color: "#DC2626" }}>⚠️ {c.diasAtraso} dias em atraso</div>
              </div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#DC2626" }}>{fmt(c.totalDivida)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CLIENTES ─────────────────────────────────────────────────────────────────
function Clientes({ clientes, setClientes, onCobranca, historico, setHistorico, filtroInicial }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState(filtroInicial || "todos");
  const [modalAdd, setModalAdd] = useState(false);
  const [clienteDetalhes, setClienteDetalhes] = useState(null);
  const [clienteEspelho, setClienteEspelho] = useState(null);
  const [novo, setNovo] = useState({ nome: "", cpf: "", telefone: "", email: "", totalDivida: "", parcelas: "1", vencimento: "", observacoes: "", automatico: true });
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const calcDiasAtraso = (vencimento) => {
    if (!vencimento) return 0;
    const diff = Math.floor((new Date() - new Date(vencimento)) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const filtrados = clientes.filter(c => {
    const matchFiltro = filtro === "todos" || c.status === filtro;
    const matchBusca = c.nome.toLowerCase().includes(busca.toLowerCase()) || (c.cpf || "").includes(busca);
    return matchFiltro && matchBusca;
  });

  const novoVazio = { nome: "", cpf: "", telefone: "", email: "", totalDivida: "", parcelas: "1", vencimento: "", observacoes: "", automatico: true };

  const addCliente = () => {
    if (!novo.nome || !novo.telefone || !novo.totalDivida) return;
    const diasAtraso = calcDiasAtraso(novo.vencimento);
    setClientes(prev => [{ ...novo, id: Date.now(), totalDivida: parseFloat(novo.totalDivida), parcelas: parseInt(novo.parcelas), parcelasPagas: 0, status: diasAtraso > 0 ? "atrasado" : "pendente", diasAtraso, whatsapp: novo.telefone.replace(/\D/g, "") }, ...prev]);
    setModalAdd(false);
    setNovo(novoVazio);
    showToast("Cliente cadastrado!");
  };

  const convsPorCliente = (id) => historico.filter(h => h.clienteId === id).length;

  return (
    <div>
      {toast && <ToastMsg {...toast} />}

      {/* Espelho de conversa */}
      {clienteEspelho && (
        <EsperhoConversa
          cliente={clienteEspelho}
          historico={historico}
          setHistorico={setHistorico}
          setClientes={setClientes}
          onClose={() => setClienteEspelho(null)}
        />
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0F172A" }}>Clientes</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748B" }}>{clientes.length} cadastrados · {clientes.filter(c => c.status === "atrasado").length} em atraso</p>
        </div>
        <Btn onClick={() => { setNovo(novoVazio); setModalAdd(true); }}><Ic.plus /> Novo cliente</Btn>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <input placeholder="🔍 Buscar por nome ou CPF..." value={busca} onChange={e => setBusca(e.target.value)}
          style={{ flex: 1, minWidth: 160, border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "9px 14px", fontSize: 14, outline: "none", background: "#F8FAFC" }} />
        {["todos", "pendente", "atrasado", "pago"].map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            style={{ background: filtro === f ? "#1E40AF" : "#F1F5F9", color: filtro === f ? "#fff" : "#64748B", border: "none", borderRadius: 10, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
            {f === "todos" ? "Todos (" + clientes.length + ")" : (statusColor[f]?.label || f) + " (" + clientes.filter(c => c.status === f).length + ")"}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtrados.map(c => (
          <div key={c.id} style={{ background: "#fff", borderRadius: 14, border: "1px solid " + (c.status === "atrasado" ? "#FECACA" : "#F1F5F9"), overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flex: 1 }}>
                <div style={{ width: 42, height: 42, background: c.status === "atrasado" ? "linear-gradient(135deg, #FEE2E2, #FECACA)" : "linear-gradient(135deg, #DBEAFE, #BFDBFE)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, color: c.status === "atrasado" ? "#DC2626" : "#1E40AF", flexShrink: 0 }}>
                  {c.nome.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#0F172A" }}>{c.nome}</div>
                  <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{c.cpf || "Sem CPF"} · {c.telefone}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                    <Badge status={c.status} />
                    {c.diasAtraso > 0 && <span style={{ fontSize: 12, color: "#DC2626", fontWeight: 600, background: "#FEF2F2", padding: "2px 8px", borderRadius: 99 }}>⚠️ {c.diasAtraso} dias</span>}
                    {convsPorCliente(c.id) > 0 && <span style={{ fontSize: 12, color: "#7C3AED", background: "#F5F3FF", padding: "2px 8px", borderRadius: 99 }}>💬 {convsPorCliente(c.id)} msgs</span>}
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: c.status === "atrasado" ? "#DC2626" : c.status === "pago" ? "#16A34A" : "#0F172A", marginBottom: 8 }}>{fmt(c.totalDivida)}</div>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  <Btn small variant="ghost" onClick={() => setClienteDetalhes(c)}><Ic.eye /> Ver</Btn>
                  <Btn small variant="whatsapp" onClick={() => setClienteEspelho(c)}><Ic.chat /> Chat</Btn>
                  {c.status !== "pago" && <Btn small variant="green" onClick={() => onCobranca(c)}><Ic.send /> Cobrar</Btn>}
                  {c.status !== "pago" && <Btn small variant="ghost" onClick={() => { setClientes(prev => prev.map(x => x.id === c.id ? { ...x, status: "pago", parcelasPagas: x.parcelas, diasAtraso: 0 } : x)); showToast("Marcado como pago! ✅"); }}><Ic.check /> Pago</Btn>}
                </div>
              </div>
            </div>
          </div>
        ))}
        {filtrados.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "#94A3B8" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
            <div style={{ fontWeight: 600 }}>Nenhum cliente encontrado</div>
          </div>
        )}
      </div>

      {/* Modal Detalhes */}
      {clienteDetalhes && (
        <Modal title={"Detalhes — " + clienteDetalhes.nome} onClose={() => setClienteDetalhes(null)} wide>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {[
              ["Nome", clienteDetalhes.nome],
              ["CPF", clienteDetalhes.cpf || "—"],
              ["Telefone", clienteDetalhes.telefone],
              ["E-mail", clienteDetalhes.email || "—"],
              ["Dívida", fmt(clienteDetalhes.totalDivida)],
              ["Vencimento", clienteDetalhes.vencimento || "—"],
              ["Status", clienteDetalhes.status],
              ["Atraso", clienteDetalhes.diasAtraso > 0 ? clienteDetalhes.diasAtraso + " dias" : "—"],
            ].map(([k, v]) => (
              <div key={k} style={{ background: "#F8FAFC", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 700, marginBottom: 3 }}>{k.toUpperCase()}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Histórico de conversas */}
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "#374151" }}>💬 Histórico de contatos ({historico.filter(h => h.clienteId === clienteDetalhes.id).length})</h4>
            <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {historico.filter(h => h.clienteId === clienteDetalhes.id).map(h => (
                <div key={h.id} style={{ background: "#F8FAFC", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontWeight: 600, color: h.autor === "cliente" ? "#16A34A" : h.autor === "voce" ? "#1E40AF" : "#64748B" }}>
                      {h.autor === "cliente" ? "Cliente" : h.autor === "voce" ? "Você" : "Sistema"}
                    </span>
                    <span style={{ color: "#94A3B8", fontSize: 11 }}>{h.data}</span>
                  </div>
                  <div style={{ color: "#374151" }}>{h.mensagem}</div>
                </div>
              ))}
              {historico.filter(h => h.clienteId === clienteDetalhes.id).length === 0 && (
                <div style={{ textAlign: "center", padding: 16, color: "#94A3B8", fontSize: 13 }}>Nenhuma conversa registrada</div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Btn variant="whatsapp" onClick={() => { setClienteEspelho(clienteDetalhes); setClienteDetalhes(null); }} style={{ flex: 1, justifyContent: "center" }}><Ic.chat /> Abrir conversa</Btn>
            {clienteDetalhes.status !== "pago" && <Btn variant="green" onClick={() => { onCobranca(clienteDetalhes); setClienteDetalhes(null); }} style={{ flex: 1, justifyContent: "center" }}><Ic.send /> Cobrar</Btn>}
          </div>
        </Modal>
      )}

      {/* Modal Novo Cliente */}
      {modalAdd && (
        <Modal title="Novo Cliente" onClose={() => setModalAdd(false)} wide>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <Inp label="Nome completo *" value={novo.nome} onChange={e => setNovo(p => ({ ...p, nome: e.target.value }))} placeholder="João da Silva" />
            </div>
            <Inp label="CPF" value={novo.cpf} onChange={e => setNovo(p => ({ ...p, cpf: e.target.value }))} placeholder="000.000.000-00" />
            <Inp label="WhatsApp *" value={novo.telefone} onChange={e => setNovo(p => ({ ...p, telefone: e.target.value }))} placeholder="(44) 99999-0000" />
            <div style={{ gridColumn: "1 / -1" }}>
              <Inp label="E-mail" value={novo.email} onChange={e => setNovo(p => ({ ...p, email: e.target.value }))} placeholder="joao@email.com" />
            </div>
            <Inp label="Valor total (R$) *" type="number" value={novo.totalDivida} onChange={e => setNovo(p => ({ ...p, totalDivida: e.target.value }))} placeholder="0.00" />
            <Inp label="Vencimento *" type="date" value={novo.vencimento} onChange={e => setNovo(p => ({ ...p, vencimento: e.target.value }))} />
            <Sel label="Parcelas" value={novo.parcelas} onChange={e => setNovo(p => ({ ...p, parcelas: e.target.value }))}>
              {[1,2,3,4,6,8,10,12].map(n => <option key={n} value={n}>{n}x{novo.totalDivida ? " de " + fmt(parseFloat(novo.totalDivida) / n) : ""}</option>)}
            </Sel>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5 }}>Observações</label>
            <textarea value={novo.observacoes} onChange={e => setNovo(p => ({ ...p, observacoes: e.target.value }))} placeholder="Notas sobre a dívida..." rows={2} style={{ width: "100%", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "10px 14px", fontSize: 13, outline: "none", background: "#F8FAFC", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="ghost" onClick={() => setModalAdd(false)} style={{ flex: 1, justifyContent: "center" }}>Cancelar</Btn>
            <Btn onClick={addCliente} disabled={!novo.nome || !novo.telefone || !novo.totalDivida} style={{ flex: 1, justifyContent: "center" }}><Ic.plus /> Cadastrar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── ÁREA DO CLIENTE (MENSALIDADE + PAGARME) ──────────────────────────────────
function AreaCliente({ user }) {
  const [aba, setAba] = useState("mensalidade");
  const [modalPagar, setModalPagar] = useState(false);
  const [formaPag, setFormaPag] = useState("pix");
  const [dadosCartao, setDadosCartao] = useState({ numero: "", nome: "", validade: "", cvv: "" });
  const [pago, setPago] = useState(false);
  const [processando, setProcessando] = useState(false);

  const mensalidade = { valor: 97, vencimento: "2026-07-24", status: "pendente", plano: "Pro" };
  const historicoPag = [
    { mes: "Junho/2026", valor: 97, status: "pago", data: "24/06/2026", forma: "Pix" },
    { mes: "Maio/2026", valor: 97, status: "pago", data: "24/05/2026", forma: "Cartão" },
    { mes: "Abril/2026", valor: 97, status: "pago", data: "24/04/2026", forma: "Pix" },
  ];

  const pagar = () => {
    setProcessando(true);
    setTimeout(() => {
      setProcessando(false);
      setPago(true);
      setModalPagar(false);
    }, 2200);
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0F172A" }}>Minha Assinatura</h1>
        <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 14 }}>Gerencie seu plano e pagamentos</p>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {[["mensalidade", "💳 Mensalidade"], ["historico", "📋 Histórico"], ["plano", "⭐ Meu Plano"]].map(([k, l]) => (
          <button key={k} onClick={() => setAba(k)} style={{ background: aba === k ? "#1E40AF" : "#F1F5F9", color: aba === k ? "#fff" : "#64748B", border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{l}</button>
        ))}
      </div>

      {aba === "mensalidade" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Card mensalidade */}
          <div style={{ background: pago ? "#F0FDF4" : "#fff", borderRadius: 16, padding: 24, border: "2px solid " + (pago ? "#86EFAC" : "#E2E8F0") }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: "#64748B", fontWeight: 700, marginBottom: 4 }}>MENSALIDADE {mensalidade.plano.toUpperCase()}</div>
                <div style={{ fontSize: 36, fontWeight: 900, color: pago ? "#16A34A" : "#0F172A", lineHeight: 1 }}>{fmt(mensalidade.valor)}</div>
                <div style={{ fontSize: 13, color: "#64748B", marginTop: 6 }}>Vencimento: <strong>{mensalidade.vencimento}</strong></div>
              </div>
              <div style={{ textAlign: "right" }}>
                {pago
                  ? <div style={{ background: "#DCFCE7", color: "#16A34A", padding: "8px 16px", borderRadius: 10, fontWeight: 700, fontSize: 14 }}>✅ Pago</div>
                  : <div style={{ background: "#FEF3C7", color: "#D97706", padding: "8px 16px", borderRadius: 10, fontWeight: 700, fontSize: 14 }}>⏳ Pendente</div>
                }
              </div>
            </div>
            {!pago && (
              <div style={{ marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Btn onClick={() => { setFormaPag("pix"); setModalPagar(true); }} style={{ flex: 1, justifyContent: "center", minWidth: 120 }}>
                  <Ic.pix /> Pagar com Pix
                </Btn>
                <Btn variant="outline" onClick={() => { setFormaPag("cartao"); setModalPagar(true); }} style={{ flex: 1, justifyContent: "center", minWidth: 120 }}>
                  <Ic.credit /> Pagar com Cartão
                </Btn>
              </div>
            )}
          </div>

          {/* Info Pagar.me */}
          <div style={{ background: "#EFF6FF", borderRadius: 12, padding: 16, border: "1px solid #BFDBFE", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ fontSize: 24, flexShrink: 0 }}>🔐</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#1E40AF", marginBottom: 4 }}>Pagamento seguro via Pagar.me (Stone)</div>
              <div style={{ fontSize: 13, color: "#3B82F6" }}>Seus dados são criptografados e processados pela plataforma Pagar.me. Aceitamos Pix (aprovação imediata) e cartão de crédito em até 12x.</div>
            </div>
          </div>
        </div>
      )}

      {aba === "historico" && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F1F5F9", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", background: "#F8FAFC", borderBottom: "1px solid #F1F5F9" }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Histórico de Pagamentos</h3>
          </div>
          {historicoPag.map((h, i) => (
            <div key={i} style={{ padding: "14px 20px", borderBottom: "1px solid #F8FAFC", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{h.mes}</div>
                <div style={{ fontSize: 12, color: "#94A3B8" }}>{h.data} · {h.forma}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 800, color: "#16A34A", fontSize: 15 }}>{fmt(h.valor)}</div>
                <span style={{ background: "#DCFCE7", color: "#16A34A", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>✅ Pago</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {aba === "plano" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {[
            { nome: "Starter", preco: 47, cor: "#22C55E", features: ["Até 50 clientes", "WhatsApp manual", "CSV"] },
            { nome: "Pro", preco: 97, cor: "#3B82F6", features: ["Ilimitado", "WhatsApp auto", "Negativação", "Relatórios"], atual: true },
            { nome: "Enterprise", preco: 297, cor: "#A78BFA", features: ["Multi-usuário", "API", "Gerente de conta"] },
          ].map(p => (
            <div key={p.nome} style={{ background: "#fff", borderRadius: 16, padding: 22, border: p.atual ? "2px solid " + p.cor : "1px solid #F1F5F9", position: "relative" }}>
              {p.atual && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: p.cor, color: "#fff", fontSize: 11, fontWeight: 800, padding: "3px 12px", borderRadius: 99 }}>PLANO ATUAL</div>}
              <div style={{ fontSize: 13, fontWeight: 700, color: p.cor }}>{p.nome}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#0F172A", margin: "4px 0 12px" }}>{fmt(p.preco)}<span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 400 }}>/mês</span></div>
              {p.features.map(f => <div key={f} style={{ fontSize: 13, color: "#374151", padding: "3px 0", display: "flex", gap: 6 }}><span style={{ color: p.cor }}>✓</span>{f}</div>)}
              {!p.atual && <Btn style={{ width: "100%", justifyContent: "center", marginTop: 14, background: p.cor }} small>Fazer upgrade</Btn>}
            </div>
          ))}
        </div>
      )}

      {/* Modal Pagamento */}
      {modalPagar && (
        <Modal title={formaPag === "pix" ? "💠 Pagar com Pix" : "💳 Pagar com Cartão"} onClose={() => setModalPagar(false)}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#0F172A" }}>{fmt(mensalidade.valor)}</div>
            <div style={{ fontSize: 13, color: "#64748B" }}>Plano Pro · CobrarFácil</div>
          </div>

          {formaPag === "pix" && (
            <div style={{ textAlign: "center" }}>
              <div style={{ background: "#F8FAFC", borderRadius: 14, padding: 24, marginBottom: 16, border: "1px solid #E2E8F0" }}>
                <div style={{ width: 140, height: 140, background: "#0F172A", borderRadius: 10, margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 600 }}>QR Code Pix</div>
                <div style={{ fontSize: 12, color: "#94A3B8" }}>Escaneie o QR Code acima ou copie a chave abaixo</div>
              </div>
              <div style={{ background: "#F1F5F9", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontFamily: "monospace", fontSize: 12, color: "#374151", wordBreak: "break-all" }}>
                00020126580014br.gov.bcb.pix...cobrarfacil.com.br
              </div>
              <Btn onClick={pagar} style={{ width: "100%", justifyContent: "center" }} disabled={processando}>
                {processando ? "Verificando pagamento..." : "✅ Já paguei via Pix"}
              </Btn>
              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 10 }}>Processado via Pagar.me (Stone) · Aprovação imediata</div>
            </div>
          )}

          {formaPag === "cartao" && (
            <div>
              <Inp label="Número do cartão" value={dadosCartao.numero} onChange={e => setDadosCartao(p => ({ ...p, numero: e.target.value }))} placeholder="0000 0000 0000 0000" />
              <Inp label="Nome no cartão" value={dadosCartao.nome} onChange={e => setDadosCartao(p => ({ ...p, nome: e.target.value }))} placeholder="JOAO DA SILVA" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Inp label="Validade" value={dadosCartao.validade} onChange={e => setDadosCartao(p => ({ ...p, validade: e.target.value }))} placeholder="MM/AA" />
                <Inp label="CVV" value={dadosCartao.cvv} onChange={e => setDadosCartao(p => ({ ...p, cvv: e.target.value }))} placeholder="123" />
              </div>
              <Sel label="Parcelas">
                <option>1x de {fmt(97)} (sem juros)</option>
                <option>2x de {fmt(97/2)} (sem juros)</option>
                <option>3x de {fmt(97/3)} (sem juros)</option>
              </Sel>
              <Btn onClick={pagar} style={{ width: "100%", justifyContent: "center" }} disabled={processando}>
                {processando ? "Processando pagamento..." : "💳 Pagar agora"}
              </Btn>
              <div style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", marginTop: 10 }}>🔒 Pagamento seguro via Pagar.me (Stone)</div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ─── CONFIGURAÇÕES ────────────────────────────────────────────────────────────
function Configuracoes({ user, pixKey, setPixKey, nomeCobranca, setNomeCobranca }) {
  const [saved, setSaved] = useState(false);
  const [pixInput, setPixInput] = useState(pixKey || "");
  const [pixTipo, setPixTipo] = useState("telefone");
  const [pixSalvo, setPixSalvo] = useState(!!pixKey);
  const [nomeInput, setNomeInput] = useState(nomeCobranca || user.business);
  const [whatsappNumero, setWhatsappNumero] = useState(() => { try { return localStorage.getItem("cobrarfacil_whatsapp") || ""; } catch { return ""; } });
  const [whatsappSalvo, setWhatsappSalvo] = useState(false);
  const [pagarmeKey, setPagarmeKey] = useState(() => { try { return localStorage.getItem("cobrarfacil_pagarme") || ""; } catch { return ""; } });
  const [pagarmeConf, setPagarmeConf] = useState(false);
  const [toggles, setToggles] = useState({ t0: true, t1: true, t2: false, t3: true });

  const tiposLabel = { telefone: "📱 Telefone", email: "📧 E-mail", cpf: "🪪 CPF/CNPJ", aleatoria: "🔑 Aleatória" };
  const placeholders = { telefone: "(44) 99999-0000", email: "seu@email.com", cpf: "000.000.000-00", aleatoria: "Chave aleatória Pix" };

  const salvarPix = () => {
    if (!pixInput.trim()) return;
    try { localStorage.setItem("cobrarfacil_pix", pixInput); } catch {}
    setPixKey(pixInput);
    setPixSalvo(true);
  };

  const salvarNome = () => {
    if (!nomeInput.trim()) return;
    try { localStorage.setItem("cobrarfacil_nome_cobranca", nomeInput); } catch {}
    setNomeCobranca(nomeInput);
  };

  const salvarWhatsapp = () => {
    try { localStorage.setItem("cobrarfacil_whatsapp", whatsappNumero); } catch {}
    setWhatsappSalvo(true);
    setTimeout(() => setWhatsappSalvo(false), 2000);
  };

  const salvarPagarme = () => {
    try { localStorage.setItem("cobrarfacil_pagarme", pagarmeKey); } catch {}
    setPagarmeConf(true);
    setTimeout(() => setPagarmeConf(false), 2000);
  };

  const salvarToggle = (k) => setToggles(t => ({ ...t, [k]: !t[k] }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0F172A" }}>Configurações</h1>
        <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 14 }}>Integre WhatsApp, Pagar.me e configure sua conta</p>
      </div>

      {/* INTEGRAÇÃO WHATSAPP */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 22, border: "1px solid #F1F5F9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, background: "#DCFCE7", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "#16A34A" }}><Ic.whatsapp /></div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Integração WhatsApp</h3>
            <div style={{ fontSize: 13, color: "#64748B" }}>Configure o número que enviará as cobranças</div>
          </div>
        </div>
        <Inp label="Número do WhatsApp (com DDD e código do país)" value={whatsappNumero} onChange={e => setWhatsappNumero(e.target.value)} placeholder="5544999990000" />
        <div style={{ background: "#FFFBEB", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#92400E" }}>
          💡 Para automação completa, use a <strong>API Oficial do WhatsApp Business</strong> ou conecte via <strong>Evolution API / Z-API</strong>. Entre em contato com o suporte para configuração.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Btn onClick={salvarWhatsapp} style={{ flex: 1, justifyContent: "center" }}>
            {whatsappSalvo ? "✅ Salvo!" : "Salvar número"}
          </Btn>
          <Btn variant="ghost" onClick={() => window.open("https://wa.me/" + whatsappNumero, "_blank")} style={{ justifyContent: "center" }}>
            Testar
          </Btn>
        </div>
      </div>

      {/* INTEGRAÇÃO PAGARME */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 22, border: "1px solid #F1F5F9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, background: "#EFF6FF", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "#1E40AF" }}><Ic.credit /></div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Pagar.me (Stone)</h3>
            <div style={{ fontSize: 13, color: "#64748B" }}>Aceite Pix e cartão de crédito dos seus clientes</div>
          </div>
          {pagarmeConf && <span style={{ marginLeft: "auto", background: "#16A34A", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>✓ Conectado</span>}
        </div>
        <div style={{ background: "#F8FAFC", borderRadius: 10, padding: 14, marginBottom: 14, display: "flex", gap: 14, flexWrap: "wrap" }}>
          {["💳 Cartão de crédito", "💠 Pix instantâneo", "📄 Boleto bancário"].map(f => (
            <div key={f} style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>{f}</div>
          ))}
        </div>
        <Inp label="API Key do Pagar.me (ak_live_...)" value={pagarmeKey} onChange={e => setPagarmeKey(e.target.value)} placeholder="ak_live_xxxxxxxxxxxxxxxx" style={{ fontFamily: "monospace" }} />
        <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#1E40AF" }}>
          🔑 Encontre sua API Key em: <strong>dashboard.pagar.me → Configurações → API Keys</strong>
        </div>
        <Btn onClick={salvarPagarme} style={{ width: "100%", justifyContent: "center" }} disabled={!pagarmeKey.trim()}>
          {pagarmeConf ? "✅ Pagar.me Conectado!" : "Conectar Pagar.me"}
        </Btn>
      </div>

      {/* PIX */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 22, border: "1px solid #F1F5F9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, background: "#F0FDF4", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "#16A34A", fontSize: 20 }}>⚡</div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Chave Pix para recebimento</h3>
            <div style={{ fontSize: 13, color: "#64748B" }}>Inserida automaticamente nas cobranças</div>
          </div>
        </div>
        {pixSalvo ? (
          <div>
            <div style={{ background: "#F0FDF4", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700 }}>CHAVE CONFIGURADA</div>
                <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "monospace" }}>{pixKey}</div>
              </div>
              <Btn small variant="ghost" onClick={() => { setPixSalvo(false); setPixInput(pixKey); }}>✏️ Alterar</Btn>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
              {Object.entries(tiposLabel).map(([k, v]) => (
                <button key={k} onClick={() => { setPixTipo(k); setPixInput(""); }}
                  style={{ background: pixTipo === k ? "#1E40AF" : "#F8FAFC", color: pixTipo === k ? "#fff" : "#374151", border: "1.5px solid " + (pixTipo === k ? "#1E40AF" : "#E2E8F0"), borderRadius: 10, padding: "9px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                  {v}
                </button>
              ))}
            </div>
            <Inp label={"Chave Pix (" + tiposLabel[pixTipo] + ")"} value={pixInput} onChange={e => setPixInput(e.target.value)} placeholder={placeholders[pixTipo]} />
            <Btn onClick={salvarPix} disabled={!pixInput.trim()} style={{ width: "100%", justifyContent: "center" }}>⚡ Salvar chave Pix</Btn>
          </div>
        )}
      </div>

      {/* NOME DA EMPRESA */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 22, border: "1px solid #F1F5F9" }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 800 }}>🏪 Nome nas cobranças</h3>
        <Inp label="Nome da empresa nas mensagens" value={nomeInput} onChange={e => setNomeInput(e.target.value)} placeholder="Ex: Look Up Store" />
        <Btn onClick={salvarNome} disabled={!nomeInput.trim()}>Salvar nome</Btn>
        {nomeCobranca && <span style={{ marginLeft: 12, fontSize: 13, color: "#16A34A", fontWeight: 600 }}>✅ {nomeCobranca}</span>}
      </div>

      {/* AUTOMAÇÕES */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 22, border: "1px solid #F1F5F9" }}>
        <h3 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 800 }}>⚡ Automações</h3>
        {[
          ["t0", "Lembrete 3 dias antes do vencimento", "WhatsApp automático"],
          ["t1", "Cobrança no dia do vencimento", "Mensagem no dia exato"],
          ["t2", "Cobrança após 7 dias de atraso", "Tom mais urgente"],
          ["t3", "Relatório semanal por e-mail", "Toda segunda-feira"],
        ].map(([k, lbl, desc], i, arr) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: i < arr.length - 1 ? "1px solid #F1F5F9" : "none" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{lbl}</div>
              <div style={{ fontSize: 12, color: "#94A3B8" }}>{desc}</div>
            </div>
            <div onClick={() => salvarToggle(k)} style={{ width: 44, height: 24, background: toggles[k] ? "#1E40AF" : "#E2E8F0", borderRadius: 99, position: "relative", cursor: "pointer", flexShrink: 0, transition: "background 0.2s" }}>
              <div style={{ width: 18, height: 18, background: "#fff", borderRadius: "50%", position: "absolute", top: 3, left: toggles[k] ? 23 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
            </div>
          </div>
        ))}
      </div>

      {/* PERFIL */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 22, border: "1px solid #F1F5F9" }}>
        <h3 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 800 }}>👤 Meu Perfil</h3>
        <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 18 }}>
          <div style={{ width: 52, height: 52, background: "linear-gradient(135deg, #1E40AF, #3B82F6)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>{user.avatar}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{user.name}</div>
            <div style={{ fontSize: 13, color: "#64748B" }}>{user.business}</div>
            <span style={{ background: "#EFF6FF", color: "#1E40AF", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>Plano {user.plan}</span>
          </div>
        </div>
        <Inp label="Nome" defaultValue={user.name} />
        <Inp label="Empresa" defaultValue={user.business} />
        <Inp label="CNPJ" defaultValue={user.cnpj} />
        <Inp label="E-mail" defaultValue={user.email} type="email" />
        <Btn onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}>{saved ? "✅ Salvo!" : "Salvar perfil"}</Btn>
      </div>
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────
const ADMIN_LOJISTAS = [
  { id: 1, nome: "Look Up Store", email: "tiago@lookupmoda.com.br", plano: "Pro", status: "ativo", clientes: 6, mrr: 97, vencimento: "2026-07-24", pagamento: "Pix", inadimplente: false },
  { id: 2, nome: "Moda Feminina da Ana", email: "ana@modafeminina.com.br", plano: "Pro", status: "ativo", clientes: 23, mrr: 97, vencimento: "2026-07-15", pagamento: "Cartão", inadimplente: false },
  { id: 3, nome: "Calçados Mendes", email: "carlos@calcadosmendes.com.br", plano: "Starter", status: "ativo", clientes: 8, mrr: 47, vencimento: "2026-07-20", pagamento: "Boleto", inadimplente: false },
  { id: 4, nome: "Pedro Eletro", email: "pedro@pedroeletro.com.br", plano: "Pro", status: "inadimplente", clientes: 14, mrr: 97, vencimento: "2026-06-10", pagamento: "Pix", inadimplente: true },
  { id: 5, nome: "Farmácia Bem Estar", email: "farma@bemestar.com.br", plano: "Pro", status: "ativo", clientes: 41, mrr: 97, vencimento: "2026-07-05", pagamento: "Cartão", inadimplente: false },
];

function AdminPanel({ onLogout }) {
  const [aba, setAba] = useState("overview");
  const mrr = ADMIN_LOJISTAS.filter(l => l.status === "ativo").reduce((a, l) => a + l.mrr, 0);
  const ativos = ADMIN_LOJISTAS.filter(l => l.status === "ativo");
  const inadimplentes = ADMIN_LOJISTAS.filter(l => l.inadimplente);

  return (
    <div style={{ minHeight: "100vh", background: "#0F172A", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ background: "#1E293B", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #22C55E, #0D9488)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff" }}>C$</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>CobrarFácil Admin</div>
            <div style={{ fontSize: 11, color: "#64748B" }}>Painel Gerencial</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ background: "#16A34A", color: "#fff", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 99 }}>MRR: {fmt(mrr)}</div>
          <Btn small variant="ghost" onClick={onLogout}>Sair</Btn>
        </div>
      </div>
      <div style={{ padding: 28 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 24 }}>
          {[
            { label: "MRR", value: fmt(mrr), color: "#22C55E", bg: "#052e16" },
            { label: "ARR", value: fmt(mrr * 12), color: "#3B82F6", bg: "#0c1a3a" },
            { label: "Clientes Ativos", value: ativos.length, color: "#A78BFA", bg: "#1a0a3a" },
            { label: "Inadimplentes", value: inadimplentes.length, color: "#F59E0B", bg: "#2a1a00" },
          ].map(c => (
            <div key={c.label} style={{ background: c.bg, borderRadius: 14, padding: 18, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0", marginTop: 4 }}>{c.label}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "#1E293B", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <h3 style={{ margin: 0, color: "#fff", fontSize: 15, fontWeight: 700 }}>Clientes da Plataforma</h3>
          </div>
          {ADMIN_LOJISTAS.map((l, i) => (
            <div key={l.id} style={{ padding: "14px 20px", borderBottom: i < ADMIN_LOJISTAS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, color: "#E2E8F0" }}>{l.nome}</div>
                <div style={{ fontSize: 12, color: "#64748B" }}>{l.email} · {l.clientes} clientes</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 800, color: "#22C55E" }}>{fmt(l.mrr)}/mês</div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: l.inadimplente ? "#FEF3C7" : "#DCFCE7", color: l.inadimplente ? "#D97706" : "#16A34A" }}>
                  {l.inadimplente ? "⚠️ Inadimplente" : "✅ Ativo"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PLACEHOLDER TELAS (mantidas funcionais) ──────────────────────────────────
function TelaSimples({ titulo, icone, descricao, conteudo }) {
  return (
    <div>
      <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "#0F172A" }}>{icone} {titulo}</h1>
      <p style={{ margin: "0 0 20px", color: "#64748B", fontSize: 14 }}>{descricao}</p>
      <div style={{ background: "#fff", borderRadius: 16, padding: 24, border: "1px solid #F1F5F9" }}>{conteudo}</div>
    </div>
  );
}

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────────
export default function CobrarFacil() {
  const [logado, setLogado] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [tela, setTela] = useState("dashboard");
  const [clientes, setClientes] = useState(DB.clientes);
  const [historico, setHistorico] = useState(DB.historico);
  const [clienteParaCobrar, setClienteParaCobrar] = useState(null);
  const [filtroClientes, setFiltroClientes] = useState("todos");
  const [pixKey, setPixKey] = useState(() => { try { return localStorage.getItem("cobrarfacil_pix") || ""; } catch { return ""; } });
  const [nomeCobranca, setNomeCobranca] = useState(() => { try { return localStorage.getItem("cobrarfacil_nome_cobranca") || DB.user.business; } catch { return DB.user.business; } });

  if (!logado) return <LoginScreen onLogin={(admin) => { setLogado(true); setIsAdmin(!!admin); }} />;
  if (isAdmin) return <AdminPanel onLogout={() => { setLogado(false); setIsAdmin(false); }} />;

  const irParaCobranca = (c) => { setClienteParaCobrar(c); setTela("cobrancas"); };
  const irParaClientes = (filtro) => { setFiltroClientes(filtro); setTela("clientes"); };

  const nav = [
    { key: "dashboard",   label: "Painel",      icon: <Ic.dash /> },
    { key: "clientes",    label: "Clientes",    icon: <Ic.clients /> },
    { key: "cobrancas",   label: "Cobranças",   icon: <Ic.charge /> },
    { key: "historico",   label: "Histórico",   icon: <Ic.history /> },
    { key: "mensalidade", label: "Minha Conta", icon: <Ic.credit /> },
    { key: "importar",    label: "Importar",    icon: <Ic.upload /> },
    { key: "negativacao", label: "Negativação", icon: <Ic.negat /> },
    { key: "config",      label: "Config.",     icon: <Ic.settings /> },
  ];

  const atrasadosCount = clientes.filter(c => c.status === "atrasado").length;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {menuAberto && <div onClick={() => setMenuAberto(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99 }} />}

      {/* Sidebar */}
      <div style={{ width: 220, background: "#0F172A", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 100, transition: "transform 0.25s", transform: menuAberto || window.innerWidth > 768 ? "none" : "translateX(-100%)" }}>
        <div style={{ padding: "18px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #22C55E, #0D9488)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 900, color: "#fff" }}>C$</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>CobrarFácil</div>
              <div style={{ fontSize: 10, color: "#475569", letterSpacing: 0.5 }}>SISTEMA DE COBRANÇA</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "14px 10px", overflowY: "auto" }}>
          {nav.map(n => (
            <button key={n.key} onClick={() => { setTela(n.key); setMenuAberto(false); }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer", marginBottom: 3, background: tela === n.key ? "rgba(59,130,246,0.15)" : "transparent", color: tela === n.key ? "#60A5FA" : "#64748B", fontSize: 13, fontWeight: tela === n.key ? 700 : 500, textAlign: "left" }}>
              {n.icon} {n.label}
              {n.key === "clientes" && atrasadosCount > 0 && <span style={{ marginLeft: "auto", background: "#DC2626", color: "#fff", borderRadius: 99, fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>{atrasadosCount}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #1E40AF, #3B82F6)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff" }}>{DB.user.avatar}</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#E2E8F0" }}>{DB.user.name}</div>
              <div style={{ fontSize: 10, color: "#475569" }}>Plano Pro</div>
            </div>
          </div>
          <button onClick={() => setLogado(false)} style={{ marginTop: 10, width: "100%", background: "rgba(255,255,255,0.05)", border: "none", color: "#64748B", borderRadius: 8, padding: "7px", fontSize: 12, cursor: "pointer" }}>Sair</button>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, marginLeft: 220, minWidth: 0 }}>
        {/* Header */}
        <div style={{ background: "#fff", borderBottom: "1px solid #F1F5F9", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 50 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setMenuAberto(m => !m)} style={{ background: "#F1F5F9", border: "none", borderRadius: 8, width: 34, height: 34, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3 }}>
              <div style={{ width: 14, height: 2, background: "#374151", borderRadius: 2 }} />
              <div style={{ width: 14, height: 2, background: "#374151", borderRadius: 2 }} />
              <div style={{ width: 14, height: 2, background: "#374151", borderRadius: 2 }} />
            </button>
            <span style={{ fontSize: 13, color: "#64748B", fontWeight: 600 }}>{DB.user.business}</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {atrasadosCount > 0 && (
              <button onClick={() => irParaClientes("atrasado")} style={{ display: "flex", alignItems: "center", gap: 5, background: "#FEF2F2", color: "#DC2626", padding: "5px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer" }}>
                <Ic.bell /> {atrasadosCount} em atraso
              </button>
            )}
            <div style={{ width: 34, height: 34, background: "linear-gradient(135deg, #1E40AF, #3B82F6)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff" }}>{DB.user.avatar}</div>
          </div>
        </div>

        {/* Telas */}
        <div style={{ padding: "20px 20px" }}>
          {tela === "dashboard"    && <Dashboard clientes={clientes} setTela={setTela} setFiltroClientes={setFiltroClientes} />}
          {tela === "clientes"     && <Clientes clientes={clientes} setClientes={setClientes} onCobranca={irParaCobranca} historico={historico} setHistorico={setHistorico} filtroInicial={filtroClientes} />}
          {tela === "mensalidade"  && <AreaCliente user={DB.user} />}
          {tela === "config"       && <Configuracoes user={DB.user} pixKey={pixKey} setPixKey={setPixKey} nomeCobranca={nomeCobranca} setNomeCobranca={setNomeCobranca} />}
          {tela === "cobrancas"    && <TelaSimples titulo="Cobranças" icone="💬" descricao="Envie cobranças via WhatsApp ou e-mail" conteudo={<div style={{ color: "#64748B", textAlign: "center", padding: 40 }}>Selecione um cliente na tela de Clientes e clique em "Cobrar"</div>} />}
          {tela === "historico"    && <TelaSimples titulo="Histórico" icone="🕐" descricao="Todas as mensagens enviadas" conteudo={<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{historico.map(h => { const c = clientes.find(cl => cl.id === h.clienteId); return <div key={h.id} style={{ padding: "10px 14px", background: "#F8FAFC", borderRadius: 10 }}><div style={{ fontWeight: 700, fontSize: 14 }}>{c?.nome || "—"}</div><div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>{h.mensagem.substring(0, 80)}...</div><div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>{h.data}</div></div>; })}</div>} />}
          {tela === "importar"     && <TelaSimples titulo="Importar Planilha" icone="📤" descricao="Importe clientes via CSV ou Excel" conteudo={<div style={{ textAlign: "center", padding: 40 }}><div style={{ fontSize: 48, marginBottom: 16 }}>📋</div><Btn>Selecionar arquivo CSV/Excel</Btn></div>} />}
          {tela === "negativacao"  && <TelaSimples titulo="Negativação" icone="🛡️" descricao="Negocie na Serasa ou SPC" conteudo={<div style={{ textAlign: "center", padding: 40, color: "#64748B" }}><div style={{ fontSize: 48, marginBottom: 16 }}>📋</div><div style={{ fontWeight: 600, marginBottom: 8 }}>Integração Serasa/SPC</div><div style={{ fontSize: 14 }}>Entre em contato com o suporte para ativar</div></div>} />}
        </div>
      </div>
    </div>
  );
}
