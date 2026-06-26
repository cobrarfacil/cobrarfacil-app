import { useState, useEffect, useRef } from "react";

const DB = {
  user: { id: 1, name: "Tiago Cabral", business: "Look Up Store", email: "tiago@lookupmoda.com.br", cnpj: "12.345.678/0001-99", plan: "Pro", avatar: "TC" },
  clientes: [
    { id: 1, nome: "João Silva", cpf: "123.456.789-00", telefone: "(44) 99801-2233", email: "joao@email.com", totalDivida: 850, status: "pendente", vencimento: "2026-06-20", parcelas: 3, parcelasPagas: 0, diasAtraso: 0 },
    { id: 2, nome: "Maria Fernanda", cpf: "234.567.890-11", telefone: "(44) 98712-5544", email: "maria@email.com", totalDivida: 1200, status: "atrasado", vencimento: "2026-06-10", parcelas: 4, parcelasPagas: 1, diasAtraso: 14 },
    { id: 3, nome: "Carlos Mendes", cpf: "345.678.901-22", telefone: "(44) 99654-8821", email: "carlos@email.com", totalDivida: 430, status: "pago", vencimento: "2026-06-15", parcelas: 2, parcelasPagas: 2, diasAtraso: 0 },
    { id: 4, nome: "Ana Paula Costa", cpf: "456.789.012-33", telefone: "(44) 98523-6677", email: "ana@email.com", totalDivida: 2100, status: "atrasado", vencimento: "2026-06-05", parcelas: 6, parcelasPagas: 2, diasAtraso: 19 },
    { id: 5, nome: "Roberto Lima", cpf: "567.890.123-44", telefone: "(44) 99741-3312", email: "roberto@email.com", totalDivida: 660, status: "pendente", vencimento: "2026-06-30", parcelas: 3, parcelasPagas: 0, diasAtraso: 0 },
    { id: 6, nome: "Fernanda Alves", cpf: "678.901.234-55", telefone: "(44) 98833-9900", email: "fernanda@email.com", totalDivida: 980, status: "pago", vencimento: "2026-06-12", parcelas: 4, parcelasPagas: 4, diasAtraso: 0 },
  ],
  historico: [
    { id: 1, clienteId: 2, tipo: "whatsapp", data: "2026-06-18 09:12", mensagem: "Olá Maria, temos uma parcela em aberto de R$300. Clique para regularizar.", status: "entregue" },
    { id: 2, clienteId: 4, tipo: "whatsapp", data: "2026-06-17 10:30", mensagem: "Ana, sua dívida está em atraso. Entre em contato para evitar restrições.", status: "lido" },
    { id: 3, clienteId: 1, tipo: "email", data: "2026-06-16 08:00", mensagem: "Lembrete: parcela vence em 4 dias.", status: "entregue" },
  ],
};

const BACKEND_URL = "https://cobrarfacil-backend-production.up.railway.app";

const fmt = (v) => Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const statusColor = {
  pendente: { bg: "#FEF3C7", text: "#D97706", label: "Pendente" },
  atrasado: { bg: "#FEE2E2", text: "#DC2626", label: "Atrasado" },
  pago:     { bg: "#DCFCE7", text: "#16A34A", label: "Pago" },
};

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
  robot:    () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M12 11V7"/><circle cx="12" cy="5" r="2"/><line x1="8" y1="15" x2="8" y2="17"/><line x1="16" y1="15" x2="16" y2="17"/></svg>,
  download: () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  shield:   () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  info:     () => <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  approve:  () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  recover:  () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
};

const Badge = ({ status }) => {
  const s = statusColor[status] || { bg: "#F1F5F9", text: "#64748B", label: status };
  return <span style={{ background: s.bg, color: s.text, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{s.label}</span>;
};

const Modal = ({ title, children, onClose, wide }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
    <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: wide ? 720 : 500, maxHeight: "92vh", overflow: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.25)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid #F1F5F9", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0F172A" }}>{title}</h3>
        <button onClick={onClose} style={{ background: "#F1F5F9", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748B" }}><Ic.close /></button>
      </div>
      <div style={{ padding: 24 }}>{children}</div>
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
  const v = { primary: { background: "#1E40AF", color: "#fff", border: "none" }, green: { background: "#16A34A", color: "#fff", border: "none" }, danger: { background: "#DC2626", color: "#fff", border: "none" }, ghost: { background: "#F1F5F9", color: "#374151", border: "none" }, outline: { background: "transparent", color: "#1E40AF", border: "1.5px solid #1E40AF" }, orange: { background: "#EA580C", color: "#fff", border: "none" } };
  return <button onClick={onClick} disabled={disabled} style={{ ...v[variant], borderRadius: 10, padding: small ? "7px 14px" : "10px 20px", fontSize: small ? 13 : 14, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 6, ...s }}>{children}</button>;
};

const ToastMsg = ({ msg, type }) => (
  <div style={{ position: "fixed", top: 20, right: 20, background: type === "success" ? "#16A34A" : "#DC2626", color: "#fff", borderRadius: 12, padding: "12px 20px", fontSize: 14, fontWeight: 600, zIndex: 3000, boxShadow: "0 4px 20px rgba(0,0,0,0.2)", maxWidth: 320 }}>{msg}</div>
);

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("tiago@lookupmoda.com.br");
  const [senha, setSenha] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const go = () => {
    setErro("");
    // Credenciais admin
    if (email === "admin@cobrarfacil.com.br" && senha === "admin2026") {
      setLoading(true);
      setTimeout(() => { setLoading(false); onLogin(true); }, 1000);
      return;
    }
    // Login lojista normal
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(false); }, 1100);
  };
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 50%, #1E40AF 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, background: "linear-gradient(135deg, #22C55E, #0D9488)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>C$</div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: -1 }}>CobrarFácil</div>
                <div style={{ fontSize: 10, color: "#93C5FD", fontWeight: 500, letterSpacing: 1 }}>SISTEMA DE COBRANÇA</div>
              </div>
            </div>
          </div>
          <p style={{ color: "#94A3B8", fontSize: 14, margin: 0 }}>Seus clientes pagam. Você recebe.</p>
        </div>
        <div style={{ background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 25px 80px rgba(0,0,0,0.3)" }}>
          <h2 style={{ margin: "0 0 22px", fontSize: 20, fontWeight: 700, color: "#0F172A" }}>Entrar na plataforma</h2>
          <Inp label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
          <Inp label="Senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" />
          {erro && <div style={{ background: "#FEF2F2", color: "#DC2626", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 12 }}>{erro}</div>}
          <div style={{ textAlign: "right", marginBottom: 18 }}><span style={{ fontSize: 13, color: "#1E40AF", cursor: "pointer", fontWeight: 600 }}>Esqueci minha senha</span></div>
          <Btn onClick={go} style={{ width: "100%", justifyContent: "center" }}>{loading ? "Entrando..." : "Entrar"}</Btn>
          <div style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: "#64748B" }}>Não tem conta? <span style={{ color: "#1E40AF", fontWeight: 600, cursor: "pointer" }}>Testar grátis 7 dias</span></div>
        </div>
        <div style={{ display: "flex", gap: 20, marginTop: 28, justifyContent: "center" }}>
          {["✅ Sem cartão", "📱 WhatsApp auto", "📋 Negativação Serasa"].map(f => <div key={f} style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500 }}>{f}</div>)}
        </div>
      </div>
    </div>
  );
}

function Dashboard({ clientes }) {
  const [vistaCalendario, setVistaCalendario] = useState(false);
  const [mesSel, setMesSel] = useState(new Date().getMonth());
  const [anoSel, setAnoSel] = useState(new Date().getFullYear());
  const [diaSel, setDiaSel] = useState(null);
  const [filtro, setFiltro] = useState("todos"); // todos | semana | mes | ano

  const total = clientes.reduce((a, c) => a + c.totalDivida, 0);
  const atrasados = clientes.filter(c => c.status === "atrasado");
  const pagos = clientes.filter(c => c.status === "pago");
  const pendentes = clientes.filter(c => c.status === "pendente");
  const totalRecebido = pagos.reduce((a, c) => a + c.totalDivida, 0);
  const totalEmRisco = atrasados.reduce((a, c) => a + c.totalDivida, 0);

  const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const diasSemana = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

  // Gera dias do mês
  const getDiasDoMes = (mes, ano) => {
    const primeiroDia = new Date(ano, mes, 1).getDay();
    const totalDias = new Date(ano, mes + 1, 0).getDate();
    return { primeiroDia, totalDias };
  };

  // Clientes com vencimento em um dia específico
  const clientesDoDia = (dia) => {
    const dataStr = anoSel + "-" + String(mesSel + 1).padStart(2,"0") + "-" + String(dia).padStart(2,"0");
    return clientes.filter(c => c.vencimento === dataStr);
  };

  // Total a receber em um dia
  const totalDoDia = (dia) => clientesDoDia(dia).filter(c => c.status !== "pago").reduce((a, c) => a + c.totalDivida, 0);
  const totalRecebidoDia = (dia) => clientesDoDia(dia).filter(c => c.status === "pago").reduce((a, c) => a + c.totalDivida, 0);

  // Total a receber no mês
  const clientesDoMes = clientes.filter(c => {
    if (!c.vencimento) return false;
    const [y, m] = c.vencimento.split("-");
    return parseInt(m) - 1 === mesSel && parseInt(y) === anoSel;
  });
  const totalMes = clientesDoMes.filter(c => c.status !== "pago").reduce((a, c) => a + c.totalDivida, 0);
  const recebidoMes = clientesDoMes.filter(c => c.status === "pago").reduce((a, c) => a + c.totalDivida, 0);

  const { primeiroDia, totalDias } = getDiasDoMes(mesSel, anoSel);
  const diasArray = Array.from({ length: totalDias }, (_, i) => i + 1);
  const espacosVazios = Array.from({ length: primeiroDia }, (_, i) => i);

  const cards = [
    { label: "Total em cobrança", value: fmt(total), icon: <Ic.money />, color: "#1E40AF", bg: "#EFF6FF" },
    { label: "Já recebido", value: fmt(totalRecebido), icon: <Ic.trend />, color: "#16A34A", bg: "#F0FDF4" },
    { label: "Em risco", value: fmt(totalEmRisco), icon: <Ic.alert />, color: "#DC2626", bg: "#FEF2F2" },
    { label: "Clientes", value: clientes.length, icon: <Ic.users />, color: "#7C3AED", bg: "#F5F3FF" },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0F172A" }}>Painel Geral</h1>
          <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 14 }}>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setVistaCalendario(false)} style={{ background: !vistaCalendario ? "#1E40AF" : "#F1F5F9", color: !vistaCalendario ? "#fff" : "#64748B", border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>📊 Painel</button>
          <button onClick={() => setVistaCalendario(true)} style={{ background: vistaCalendario ? "#1E40AF" : "#F1F5F9", color: vistaCalendario ? "#fff" : "#64748B", border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>📅 Calendário</button>
        </div>
      </div>

      {/* Cards sempre visíveis */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #F1F5F9", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
            <div style={{ width: 36, height: 36, background: c.bg, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", color: c.color, marginBottom: 10 }}>{c.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#0F172A" }}>{c.value}</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {atrasados.length > 0 && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: 12, marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ color: "#DC2626" }}><Ic.alert /></span>
          <div><strong style={{ color: "#DC2626" }}>{atrasados.length} em atraso —</strong><span style={{ color: "#B91C1C", fontSize: 13, marginLeft: 6 }}>{fmt(totalEmRisco)} em risco</span></div>
        </div>
      )}

      {!vistaCalendario && (
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: "1px solid #F1F5F9" }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>Situação dos Clientes</h3>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            {[{ label: "Pagos", count: pagos.length, color: "#16A34A", bg: "#F0FDF4" }, { label: "Pendentes", count: pendentes.length, color: "#D97706", bg: "#FFFBEB" }, { label: "Atrasados", count: atrasados.length, color: "#DC2626", bg: "#FEF2F2" }].map(s => (
              <div key={s.label} style={{ flex: 1, minWidth: 80, background: s.bg, borderRadius: 12, padding: "12px 14px", textAlign: "center" }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.count}</div>
                <div style={{ fontSize: 12, color: s.color, fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: "#64748B" }}>Taxa de recebimento</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#16A34A" }}>{total > 0 ? Math.round((totalRecebido / total) * 100) : 0}%</span>
          </div>
          <div style={{ background: "#F1F5F9", borderRadius: 99, height: 8, overflow: "hidden" }}>
            <div style={{ width: (total > 0 ? Math.round((totalRecebido / total) * 100) : 0) + "%", background: "linear-gradient(90deg, #16A34A, #22C55E)", height: "100%", borderRadius: 99 }} />
          </div>
        </div>
      )}

      {/* CALENDÁRIO FINANCEIRO */}
      {vistaCalendario && (
        <div>
          {/* Navegação do mês */}
          <div style={{ background: "#fff", borderRadius: 16, padding: 18, border: "1px solid #F1F5F9", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <button onClick={() => { if (mesSel === 0) { setMesSel(11); setAnoSel(a => a - 1); } else setMesSel(m => m - 1); }} style={{ background: "#F1F5F9", border: "none", borderRadius: 8, width: 34, height: 34, cursor: "pointer", fontSize: 16 }}>←</button>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#0F172A" }}>{meses[mesSel]} {anoSel}</div>
                <div style={{ fontSize: 12, color: "#64748B" }}>A receber: <strong style={{ color: "#1E40AF" }}>{fmt(totalMes)}</strong> · Recebido: <strong style={{ color: "#16A34A" }}>{fmt(recebidoMes)}</strong></div>
              </div>
              <button onClick={() => { if (mesSel === 11) { setMesSel(0); setAnoSel(a => a + 1); } else setMesSel(m => m + 1); }} style={{ background: "#F1F5F9", border: "none", borderRadius: 8, width: 34, height: 34, cursor: "pointer", fontSize: 16 }}>→</button>
            </div>

            {/* Grade do calendário */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
              {diasSemana.map(d => <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#94A3B8", padding: "4px 0" }}>{d}</div>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {espacosVazios.map(i => <div key={"v" + (i) + ""} />)}
              {diasArray.map(dia => {
                const temVencimento = clientesDoDia(dia).length > 0;
                const temPago = clientesDoDia(dia).some(c => c.status === "pago");
                const temPendente = clientesDoDia(dia).some(c => c.status !== "pago");
                const isHoje = dia === new Date().getDate() && mesSel === new Date().getMonth() && anoSel === new Date().getFullYear();
                const isSel = diaSel === dia;
                return (
                  <div key={dia} onClick={() => setDiaSel(isSel ? null : dia)}
                    style={{ borderRadius: 8, padding: "6px 4px", textAlign: "center", cursor: temVencimento ? "pointer" : "default", background: isSel ? "#1E40AF" : isHoje ? "#EFF6FF" : temVencimento ? "#F8FAFC" : "transparent", border: "1px solid " + (isSel ? "#1E40AF" : isHoje ? "#BFDBFE" : temVencimento ? "#E2E8F0" : "transparent") + "", position: "relative" }}>
                    <div style={{ fontSize: 13, fontWeight: isHoje ? 800 : 500, color: isSel ? "#fff" : isHoje ? "#1E40AF" : "#374151" }}>{dia}</div>
                    {temVencimento && (
                      <div style={{ display: "flex", justifyContent: "center", gap: 2, marginTop: 2 }}>
                        {temPago && <div style={{ width: 5, height: 5, borderRadius: "50%", background: isSel ? "#fff" : "#16A34A" }} />}
                        {temPendente && <div style={{ width: 5, height: 5, borderRadius: "50%", background: isSel ? "#fff" : "#DC2626" }} />}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legenda */}
          <div style={{ display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
            {[{ color: "#16A34A", label: "Pago" }, { color: "#DC2626", label: "Pendente/Atrasado" }, { color: "#1E40AF", label: "Hoje" }].map(l => (
              <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748B" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.color }} />{l.label}
              </div>
            ))}
          </div>

          {/* Detalhes do dia selecionado */}
          {diaSel && (
            <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #F1F5F9", overflow: "hidden" }}>
              <div style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9", background: "#EFF6FF" }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#1E40AF" }}>
                  📅 {diaSel} de {meses[mesSel]} de {anoSel}
                </div>
                <div style={{ fontSize: 13, color: "#3B82F6", marginTop: 3 }}>
                  A receber: <strong>{fmt(totalDoDia(diaSel))}</strong>
                  {totalRecebidoDia(diaSel) > 0 && <span style={{ marginLeft: 10 }}>Recebido: <strong style={{ color: "#16A34A" }}>{fmt(totalRecebidoDia(diaSel))}</strong></span>}
                </div>
              </div>
              {clientesDoDia(diaSel).length === 0 && (
                <div style={{ padding: 24, textAlign: "center", color: "#94A3B8", fontSize: 14 }}>Nenhum vencimento neste dia</div>
              )}
              {clientesDoDia(diaSel).map(c => (
                <div key={c.id} style={{ padding: "12px 18px", borderBottom: "1px solid #F8FAFC", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{c.nome}</div>
                    <div style={{ fontSize: 12, color: "#94A3B8" }}>{c.telefone}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: c.status === "pago" ? "#16A34A" : "#DC2626" }}>{fmt(c.totalDivida)}</div>
                    <span style={{ background: c.status === "pago" ? "#DCFCE7" : c.status === "atrasado" ? "#FEE2E2" : "#FEF3C7", color: c.status === "pago" ? "#16A34A" : c.status === "atrasado" ? "#DC2626" : "#D97706", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>
                      {c.status === "pago" ? "✅ Pago" : c.status === "atrasado" ? "⚠️ Atrasado" : "⏳ Pendente"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Clientes({ clientes, setClientes, onCobranca }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [modalAdd, setModalAdd] = useState(false);
  const [clienteDetalhes, setClienteDetalhes] = useState(null);
  const [novo, setNovo] = useState({ nome: "", cpf: "", telefone: "", email: "", totalDivida: "", parcelas: "1", vencimento: "", endereco: "", cidade: "", estado: "", observacoes: "" });
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  // Calcula dias de atraso automaticamente pela data de vencimento
  const calcDiasAtraso = (vencimento) => {
    if (!vencimento) return 0;
    const hoje = new Date();
    const venc = new Date(vencimento);
    const diff = Math.floor((hoje - venc) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  // Determina status automaticamente pelo vencimento
  const calcStatus = (vencimento, statusAtual) => {
    if (statusAtual === "pago") return "pago";
    if (!vencimento) return statusAtual || "pendente";
    const dias = calcDiasAtraso(vencimento);
    if (dias > 0) return "atrasado";
    return "pendente";
  };

  const filtrados = clientes.filter(c => (filtro === "todos" || c.status === filtro) && c.nome.toLowerCase().includes(busca.toLowerCase()));

  const novoVazio = { nome: "", cpf: "", telefone: "", email: "", totalDivida: "", parcelas: "1", vencimento: "", endereco: "", cidade: "", estado: "PR", observacoes: "", automatico: true };

  const addCliente = () => {
    if (!novo.nome || !novo.telefone || !novo.totalDivida) return;
    const diasAtraso = calcDiasAtraso(novo.vencimento);
    const status = calcStatus(novo.vencimento, "pendente");
    setClientes(prev => [{
      ...novo,
      id: Date.now(),
      totalDivida: parseFloat(novo.totalDivida),
      parcelas: parseInt(novo.parcelas),
      parcelasPagas: 0,
      status,
      diasAtraso,
    }, ...prev]);
    setModalAdd(false);
    setNovo(novoVazio);
    showToast("Cliente cadastrado com sucesso!");
  };

  const estados = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

  return (
    <div>
      {toast && <ToastMsg {...toast} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0F172A" }}>Clientes</h1>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: "#64748B" }}>{clientes.length} cadastrados · {clientes.filter(c => c.status === "atrasado").length} em atraso</p>
        </div>
        <Btn onClick={() => { setNovo(novoVazio); setModalAdd(true); }}><Ic.plus /> Novo cliente</Btn>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <input placeholder="🔍 Buscar por nome ou CPF..." value={busca} onChange={e => setBusca(e.target.value)} style={{ flex: 1, minWidth: 160, border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "9px 14px", fontSize: 14, outline: "none", background: "#F8FAFC" }} />
        {["todos", "pendente", "atrasado", "pago"].map(f => (
          <button key={f} onClick={() => setFiltro(f)} style={{ background: filtro === f ? "#1E40AF" : "#F1F5F9", color: filtro === f ? "#fff" : "#64748B", border: "none", borderRadius: 10, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {f === "todos" ? "Todos (" + (clientes.length) + ")" : (statusColor[f]?.label || f) + " (" + clientes.filter(c => c.status === f).length + ")"}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtrados.map(c => (
          <div key={c.id} style={{ background: "#fff", borderRadius: 14, border: "1px solid " + (c.status === "atrasado" ? "#FECACA" : "#F1F5F9") + "", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 38, height: 38, background: c.status === "atrasado" ? "linear-gradient(135deg, #FEE2E2, #FECACA)" : "linear-gradient(135deg, #DBEAFE, #BFDBFE)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: c.status === "atrasado" ? "#DC2626" : "#1E40AF", flexShrink: 0 }}>
                    {c.nome.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#0F172A" }}>{c.nome}</div>
                    <div style={{ fontSize: 12, color: "#94A3B8" }}>
                      {c.cpf || "CPF não informado"} · {c.telefone}
                      {c.cidade ? " · " + c.cidade + "/" + c.estado : ""}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <Badge status={c.status} />
                  {c.diasAtraso > 0 && <span style={{ fontSize: 12, color: "#DC2626", fontWeight: 600, background: "#FEF2F2", padding: "2px 8px", borderRadius: 99 }}>⚠️ {c.diasAtraso} dias em atraso</span>}
                  {c.diasAtraso === 0 && c.status !== "pago" && c.vencimento && <span style={{ fontSize: 12, color: "#64748B" }}>Vence: {c.vencimento}</span>}
                  {c.observacoes && <span style={{ fontSize: 12, color: "#7C3AED", background: "#F5F3FF", padding: "2px 8px", borderRadius: 99 }}>📝 Tem observação</span>}
                  {c.automatico === false
                    ? <span style={{ fontSize: 12, color: "#D97706", background: "#FFFBEB", padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>⏸ Aprovação manual</span>
                    : <span style={{ fontSize: 12, color: "#16A34A", background: "#F0FDF4", padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>⚡ Automático</span>
                  }
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: c.status === "atrasado" ? "#DC2626" : c.status === "pago" ? "#16A34A" : "#0F172A", marginBottom: 8 }}>{fmt(c.totalDivida)}</div>
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  <Btn small variant="ghost" onClick={() => setClienteDetalhes(c)}>👁 Ver</Btn>
                  {c.status !== "pago" && <Btn small variant="green" onClick={() => onCobranca(c)}><Ic.send /> Cobrar</Btn>}
                  {c.status !== "pago" && <Btn small variant="ghost" onClick={() => { setClientes(prev => prev.map(x => x.id === c.id ? { ...x, status: "pago", parcelasPagas: x.parcelas, diasAtraso: 0 } : x)); showToast("Marcado como pago! ✅"); }}><Ic.check /> Pago</Btn>}
                  {c.status === "pago" && <span style={{ fontSize: 12, color: "#16A34A", fontWeight: 600 }}>✅ Recebido</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
        {filtrados.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "#94A3B8" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
            <div style={{ fontWeight: 600 }}>Nenhum cliente encontrado</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Tente outro filtro ou cadastre um novo cliente</div>
          </div>
        )}
      </div>

      {/* Modal: Ver detalhes do cliente */}
      {clienteDetalhes && (
        <Modal title="Detalhes do Cliente" onClose={() => setClienteDetalhes(null)} wide>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Coluna esquerda */}
            <div>
              <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 20, background: "#F8FAFC", borderRadius: 12, padding: 16 }}>
                <div style={{ width: 48, height: 48, background: "linear-gradient(135deg, #DBEAFE, #BFDBFE)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "#1E40AF" }}>{clienteDetalhes.nome.charAt(0)}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "#0F172A" }}>{clienteDetalhes.nome}</div>
                  <Badge status={clienteDetalhes.status} />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  ["🪪 CPF", clienteDetalhes.cpf || "Não informado"],
                  ["📱 WhatsApp", clienteDetalhes.telefone || "—"],
                  ["✉️ E-mail", clienteDetalhes.email || "—"],
                  ["📍 Endereço", clienteDetalhes.endereco || "—"],
                  ["🏙 Cidade/UF", clienteDetalhes.cidade ? clienteDetalhes.cidade + "/" + clienteDetalhes.estado : "—"],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: "#F8FAFC", borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, marginBottom: 2 }}>{k}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Coluna direita */}
            <div>
              <div style={{ background: clienteDetalhes.status === "atrasado" ? "#FEF2F2" : "#F0FDF4", borderRadius: 12, padding: 16, marginBottom: 14, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, marginBottom: 4 }}>VALOR DA DÍVIDA</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: clienteDetalhes.status === "atrasado" ? "#DC2626" : clienteDetalhes.status === "pago" ? "#16A34A" : "#0F172A" }}>{fmt(clienteDetalhes.totalDivida)}</div>
                {clienteDetalhes.diasAtraso > 0 && <div style={{ fontSize: 13, color: "#DC2626", fontWeight: 600, marginTop: 4 }}>⚠️ {clienteDetalhes.diasAtraso} dias em atraso</div>}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                {[
                  ["📅 Vencimento", clienteDetalhes.vencimento || "—"],
                  ["📦 Parcelas", clienteDetalhes.parcelasPagas + "/" + clienteDetalhes.parcelas + " pagas"],
                  ["💳 Valor/parcela", fmt(clienteDetalhes.totalDivida / clienteDetalhes.parcelas)],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: "#F8FAFC", borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600, marginBottom: 2 }}>{k}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{v}</div>
                  </div>
                ))}
              </div>
              {clienteDetalhes.observacoes && (
                <div style={{ background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, color: "#7C3AED", fontWeight: 700, marginBottom: 6 }}>📝 OBSERVAÇÕES</div>
                  <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>{clienteDetalhes.observacoes}</div>
                </div>
              )}
              {/* Toggle automático */}
              <div style={{ background: clienteDetalhes.automatico === false ? "#FFFBEB" : "#F0FDF4", border: "1.5px solid " + (clienteDetalhes.automatico === false ? "#FDE68A" : "#86EFAC") + "", borderRadius: 10, padding: "12px 14px", marginTop: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#0F172A" }}>
                      {clienteDetalhes.automatico === false ? "⏸ Aprovação manual" : "⚡ Cobrança automática"}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                      {clienteDetalhes.automatico === false ? "Cobranças vão para fila de aprovação" : "Sistema envia automaticamente"}
                    </div>
                  </div>
                  <div onClick={() => { const upd = { ...clienteDetalhes, automatico: clienteDetalhes.automatico === false ? true : false }; setClientes(prev => prev.map(x => x.id === clienteDetalhes.id ? upd : x)); setClienteDetalhes(upd); }}
                    style={{ width: 44, height: 24, background: clienteDetalhes.automatico === false ? "#E2E8F0" : "#16A34A", borderRadius: 99, position: "relative", cursor: "pointer", flexShrink: 0, transition: "background 0.2s" }}>
                    <div style={{ width: 18, height: 18, background: "#fff", borderRadius: "50%", position: "absolute", top: 3, left: clienteDetalhes.automatico === false ? 3 : 23, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            {clienteDetalhes.status !== "pago" && <Btn variant="green" onClick={() => { onCobranca(clienteDetalhes); setClienteDetalhes(null); }} style={{ flex: 1, justifyContent: "center" }}><Ic.send /> Enviar cobrança</Btn>}
            {clienteDetalhes.status !== "pago" && <Btn variant="ghost" onClick={() => { setClientes(prev => prev.map(x => x.id === clienteDetalhes.id ? { ...x, status: "pago", parcelasPagas: x.parcelas, diasAtraso: 0 } : x)); setClienteDetalhes(null); showToast("Marcado como pago! ✅"); }} style={{ flex: 1, justifyContent: "center" }}><Ic.check /> Marcar como pago</Btn>}
            {clienteDetalhes.status === "pago" && <div style={{ flex: 1, textAlign: "center", padding: "10px", color: "#16A34A", fontWeight: 700 }}>✅ Dívida quitada</div>}
          </div>
        </Modal>
      )}

      {/* Modal: Novo cliente */}
      {modalAdd && (
        <Modal title="Cadastrar Novo Cliente" onClose={() => setModalAdd(false)} wide>
          {/* Aviso campos obrigatórios */}
          <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "10px 14px", marginBottom: 18, fontSize: 13, color: "#1E40AF" }}>
            Campos marcados com <strong>*</strong> são obrigatórios
          </div>

          {/* Seção: Identificação */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", letterSpacing: 0.5, marginBottom: 12 }}>IDENTIFICAÇÃO</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <Inp label="Nome completo *" value={novo.nome} onChange={e => setNovo(p => ({ ...p, nome: e.target.value }))} placeholder="João da Silva" />
              </div>
              <Inp label="CPF *" value={novo.cpf} onChange={e => setNovo(p => ({ ...p, cpf: e.target.value }))} placeholder="000.000.000-00" />
              <Inp label="WhatsApp *" value={novo.telefone} onChange={e => setNovo(p => ({ ...p, telefone: e.target.value }))} placeholder="(44) 99999-0000" />
              <div style={{ gridColumn: "1 / -1" }}>
                <Inp label="E-mail" value={novo.email} onChange={e => setNovo(p => ({ ...p, email: e.target.value }))} placeholder="joao@email.com" />
              </div>
            </div>
          </div>

          {/* Seção: Endereço */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", letterSpacing: 0.5, marginBottom: 12 }}>ENDEREÇO</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <Inp label="Endereço (rua, número, bairro)" value={novo.endereco} onChange={e => setNovo(p => ({ ...p, endereco: e.target.value }))} placeholder="Rua das Flores, 123 — Centro" />
              </div>
              <Inp label="Cidade" value={novo.cidade} onChange={e => setNovo(p => ({ ...p, cidade: e.target.value }))} placeholder="Palotina" />
              <Sel label="Estado" value={novo.estado} onChange={e => setNovo(p => ({ ...p, estado: e.target.value }))}>
                {estados.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </Sel>
            </div>
          </div>

          {/* Seção: Dívida */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", letterSpacing: 0.5, marginBottom: 12 }}>DÍVIDA</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Inp label="Valor total (R$) *" type="number" value={novo.totalDivida} onChange={e => setNovo(p => ({ ...p, totalDivida: e.target.value }))} placeholder="0,00" />
              <Inp label="Data de vencimento *" type="date" value={novo.vencimento} onChange={e => setNovo(p => ({ ...p, vencimento: e.target.value }))} />
              <Sel label="Número de parcelas" value={novo.parcelas} onChange={e => setNovo(p => ({ ...p, parcelas: e.target.value }))}>
                {[1,2,3,4,6,8,10,12].map(n => <option key={n} value={n}>{n}x{novo.totalDivida ? " de " + fmt(parseFloat(novo.totalDivida)/n) : ""}</option>)}
              </Sel>
              {/* Preview dias de atraso */}
              {novo.vencimento && calcDiasAtraso(novo.vencimento) > 0 && (
                <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>⚠️</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#DC2626" }}>Já vencido</div>
                    <div style={{ fontSize: 11, color: "#B91C1C" }}>{calcDiasAtraso(novo.vencimento)} dias em atraso</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Toggle: cobrança automática */}
          <div style={{ background: novo.automatico ? "#F0FDF4" : "#F8FAFC", border: "1.5px solid " + (novo.automatico ? "#86EFAC" : "#E2E8F0") + "", borderRadius: 12, padding: "14px 16px", marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>
                  {novo.automatico ? "✅ Cobrança automática ativada" : "⏸ Cobrança manual (requer aprovação)"}
                </div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>
                  {novo.automatico
                    ? "Sistema envia cobranças na régua definida sem precisar aprovar"
                    : "Cada cobrança vai para fila de aprovação antes de ser enviada"}
                </div>
              </div>
              <div onClick={() => setNovo(p => ({ ...p, automatico: !p.automatico }))}
                style={{ width: 48, height: 26, background: novo.automatico ? "#16A34A" : "#E2E8F0", borderRadius: 99, position: "relative", cursor: "pointer", flexShrink: 0, transition: "background 0.2s", marginLeft: 16 }}>
                <div style={{ width: 20, height: 20, background: "#fff", borderRadius: "50%", position: "absolute", top: 3, left: novo.automatico ? 25 : 3, transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
              </div>
            </div>
          </div>

          {/* Seção: Observações */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", letterSpacing: 0.5, marginBottom: 12 }}>OBSERVAÇÕES</div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5 }}>Anotações sobre o cliente ou a dívida</label>
              <textarea
                value={novo.observacoes}
                onChange={e => setNovo(p => ({ ...p, observacoes: e.target.value }))}
                placeholder="Ex: Cliente pediu prazo até dia 30. Dívida referente a compra de calçados em março/2026. Já foi contatado 2x..."
                rows={3}
                style={{ width: "100%", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "10px 14px", fontSize: 13, outline: "none", background: "#F8FAFC", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.5 }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="ghost" onClick={() => setModalAdd(false)} style={{ flex: 1, justifyContent: "center" }}>Cancelar</Btn>
            <Btn onClick={addCliente} disabled={!novo.nome || !novo.telefone || !novo.totalDivida} style={{ flex: 1, justifyContent: "center" }}>
              <Ic.plus /> Cadastrar cliente
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ImportarPlanilha({ setClientes, setTela }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [rawData, setRawData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapeamento, setMapeamento] = useState({ nome: "", cpf: "", telefone: "", email: "", totalDivida: "", vencimento: "" });
  const [preview, setPreview] = useState([]);
  const [erros, setErros] = useState([]);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef();
  const camposLabel = { nome: "Nome do devedor *", cpf: "CPF", telefone: "Telefone/WhatsApp", email: "E-mail", totalDivida: "Valor da dívida *", vencimento: "Data de vencimento" };

  const usarExemplo = () => {
    const hdrs = ["Nome", "CPF", "Telefone", "Email", "Valor", "Vencimento"];
    const rows = [
      { Nome: "Pedro Augusto", CPF: "111.222.333-44", Telefone: "(44) 99123-4567", Email: "pedro@email.com", Valor: "750", Vencimento: "2026-07-10" },
      { Nome: "Lucia Martins", CPF: "222.333.444-55", Telefone: "(44) 98765-4321", Email: "lucia@email.com", Valor: "1350", Vencimento: "2026-06-28" },
      { Nome: "Marcos Souza", CPF: "333.444.555-66", Telefone: "(44) 97654-3210", Email: "marcos@email.com", Valor: "420", Vencimento: "2026-07-05" },
      { Nome: "Carla Dias", CPF: "444.555.666-77", Telefone: "(44) 96543-2109", Email: "carla@email.com", Valor: "2800", Vencimento: "2026-06-15" },
      { Nome: "Andre Costa", CPF: "555.666.777-88", Telefone: "(44) 95432-1098", Email: "andre@email.com", Valor: "980", Vencimento: "2026-07-20" },
    ];
    setHeaders(hdrs); setRawData(rows);
    setMapeamento({ nome: "Nome", cpf: "CPF", telefone: "Telefone", email: "Email", totalDivida: "Valor", vencimento: "Vencimento" });
    setFile({ name: "clientes_exemplo.csv" }); setStep(2);
  };

  const handleFile = (e) => {
    const f = e.target?.files?.[0] || e.dataTransfer?.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) return;
      const hdrs = lines[0].split(/[,;|\t]/).map(h => h.trim().replace(/"/g, ""));
      const rows = lines.slice(1).map(l => { const vals = l.split(/[,;|\t]/).map(v => v.trim().replace(/"/g, "")); const obj = {}; hdrs.forEach((h, i) => { obj[h] = vals[i] || ""; }); return obj; });
      setHeaders(hdrs); setRawData(rows);
      const auto = {}; const pats = { nome: /nome|name|devedor|cliente/i, cpf: /cpf|doc/i, telefone: /tel|fone|celular|whats/i, email: /email|mail/i, totalDivida: /valor|divida|total/i, vencimento: /venc|data|due/i };
      hdrs.forEach(h => { Object.keys(pats).forEach(k => { if (pats[k].test(h) && !auto[k]) auto[k] = h; }); });
      setMapeamento(prev => ({ ...prev, ...auto })); setStep(2);
    };
    reader.readAsText(f);
  };

  const gerarPreview = () => {
    if (!mapeamento.nome || !mapeamento.totalDivida) return;
    const err = [];
    const prev = rawData.slice(0, 50).map((row, i) => {
      const nome = row[mapeamento.nome]?.trim();
      const valor = parseFloat((row[mapeamento.totalDivida] || "").replace(",", "."));
      if (!nome) err.push("Linha " + (i + 2) + ": nome vazio");
      if (isNaN(valor) || valor <= 0) err.push("Linha " + (i + 2) + ": valor inválido");
      return { nome: nome || "—", cpf: row[mapeamento.cpf] || "", telefone: row[mapeamento.telefone] || "", email: row[mapeamento.email] || "", totalDivida: isNaN(valor) ? 0 : valor, vencimento: row[mapeamento.vencimento] || "", valido: !!(nome && !isNaN(valor) && valor > 0) };
    });
    setPreview(prev); setErros(err); setStep(3);
  };

  const confirmar = () => {
    setImporting(true);
    setTimeout(() => {
      const validos = preview.filter(p => p.valido).map(p => ({ ...p, id: Date.now() + Math.random(), status: "pendente", parcelas: 1, parcelasPagas: 0, diasAtraso: 0 }));
      setClientes(prev => [...validos, ...prev]); setImporting(false); setStep(4);
    }, 1400);
  };

  const stepLabels = ["Upload do arquivo", "Mapear colunas", "Conferir dados", "Concluído"];
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0F172A" }}>Importar Planilha</h1>
        <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 14 }}>Importe sua base de devedores via CSV ou Excel</p>
      </div>

      <div style={{ display: "flex", alignItems: "center", background: "#fff", borderRadius: 14, padding: "14px 20px", border: "1px solid #F1F5F9", marginBottom: 24 }}>
        {stepLabels.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: step > i + 1 ? "#16A34A" : step === i + 1 ? "#1E40AF" : "#E2E8F0", color: step >= i + 1 ? "#fff" : "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{step > i + 1 ? "✓" : i + 1}</div>
              <span style={{ fontSize: 12, fontWeight: step === i + 1 ? 700 : 500, color: step === i + 1 ? "#0F172A" : "#94A3B8", whiteSpace: "nowrap" }}>{s}</span>
            </div>
            {i < 3 && <div style={{ flex: 1, height: 2, background: step > i + 1 ? "#16A34A" : "#E2E8F0", margin: "0 8px" }} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div>
          <div onDragOver={e => e.preventDefault()} onDrop={handleFile} onClick={() => fileRef.current?.click()} style={{ border: "2px dashed #BFDBFE", borderRadius: 16, padding: 48, textAlign: "center", cursor: "pointer", background: "#F0F7FF" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📂</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1E40AF", marginBottom: 6 }}>Arraste sua planilha aqui</div>
            <div style={{ fontSize: 13, color: "#64748B", marginBottom: 16 }}>Formatos: CSV, XLS, XLSX · Até 10.000 linhas</div>
            <Btn variant="outline">Selecionar arquivo</Btn>
            <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx,.txt" style={{ display: "none" }} onChange={handleFile} />
          </div>
          <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid #F1F5F9", marginTop: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 12 }}>📋 Modelo de planilha esperado</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ background: "#F8FAFC" }}>{["Nome", "CPF", "Telefone", "Email", "Valor", "Vencimento"].map(h => <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: "#374151", borderBottom: "1px solid #E2E8F0", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
                <tbody>{[["Pedro Augusto", "111.222.333-44", "(44) 99123-4567", "pedro@email.com", "750,00", "2026-07-10"], ["Lucia Martins", "222.333.444-55", "(44) 98765-4321", "lucia@email.com", "1350,00", "2026-06-28"]].map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} style={{ padding: "8px 12px", color: "#374151", borderBottom: "1px solid #F1F5F9" }}>{cell}</td>)}</tr>)}</tbody>
              </table>
            </div>
            <div style={{ marginTop: 14 }}><Btn variant="ghost" onClick={usarExemplo}>📊 Usar dados de exemplo</Btn></div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div style={{ background: "#fff", borderRadius: 16, padding: 22, border: "1px solid #F1F5F9", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 18 }}>
              <div style={{ background: "#F0FDF4", color: "#16A34A", borderRadius: 10, padding: "7px 12px", fontSize: 13, fontWeight: 700 }}>✅ {file?.name}</div>
              <div style={{ color: "#64748B", fontSize: 13 }}>{rawData.length} linhas encontradas</div>
            </div>
            <p style={{ fontSize: 14, color: "#374151", margin: "0 0 18px" }}>Associe os campos do sistema com as colunas da sua planilha:</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {Object.keys(camposLabel).map(campo => (
                <div key={campo}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5 }}>{camposLabel[campo]}</label>
                  <select value={mapeamento[campo]} onChange={e => setMapeamento(p => ({ ...p, [campo]: e.target.value }))} style={{ width: "100%", border: "1.5px solid " + (mapeamento[campo] ? "#3B82F6" : "#E2E8F0") + "", borderRadius: 10, padding: "9px 12px", fontSize: 14, background: mapeamento[campo] ? "#EFF6FF" : "#F8FAFC", outline: "none", cursor: "pointer" }}>
                    <option value="">— não mapear —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #F1F5F9", marginBottom: 16, overflowX: "auto" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#374151", marginBottom: 10 }}>Primeiras linhas da planilha</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr style={{ background: "#F8FAFC" }}>{headers.map(h => <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontWeight: 600, color: "#64748B", borderBottom: "1px solid #E2E8F0", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
              <tbody>{rawData.slice(0, 3).map((row, i) => <tr key={i}>{headers.map(h => <td key={h} style={{ padding: "6px 10px", color: "#374151", borderBottom: "1px solid #F8FAFC", whiteSpace: "nowrap" }}>{row[h]}</td>)}</tr>)}</tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="ghost" onClick={() => setStep(1)}>← Voltar</Btn>
            <Btn onClick={gerarPreview} disabled={!mapeamento.nome || !mapeamento.totalDivida}>Conferir dados →</Btn>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          {erros.length > 0 && <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 12, padding: 14, marginBottom: 14 }}><strong style={{ color: "#92400E" }}>⚠️ {erros.length} linha(s) com problema</strong><div style={{ fontSize: 13, color: "#92400E", marginTop: 4 }}>Essas linhas serão ignoradas.</div></div>}
          <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 12, padding: 14, marginBottom: 14 }}><strong style={{ color: "#166534" }}>✅ {preview.filter(p => p.valido).length} clientes prontos para importar</strong></div>
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #F1F5F9", overflow: "hidden", marginBottom: 18 }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ background: "#F8FAFC" }}>{["", "Nome", "CPF", "Telefone", "Valor", "Vencimento"].map(h => <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: "#374151", borderBottom: "1px solid #E2E8F0" }}>{h}</th>)}</tr></thead>
                <tbody>{preview.map((p, i) => (
                  <tr key={i} style={{ background: p.valido ? "#fff" : "#FEF2F2" }}>
                    <td style={{ padding: "10px 14px", borderBottom: "1px solid #F8FAFC" }}>{p.valido ? "✅" : "❌"}</td>
                    <td style={{ padding: "10px 14px", borderBottom: "1px solid #F8FAFC", fontWeight: 600 }}>{p.nome}</td>
                    <td style={{ padding: "10px 14px", borderBottom: "1px solid #F8FAFC", color: "#64748B" }}>{p.cpf || "—"}</td>
                    <td style={{ padding: "10px 14px", borderBottom: "1px solid #F8FAFC", color: "#64748B" }}>{p.telefone || "—"}</td>
                    <td style={{ padding: "10px 14px", borderBottom: "1px solid #F8FAFC", fontWeight: 700, color: "#DC2626" }}>{fmt(p.totalDivida)}</td>
                    <td style={{ padding: "10px 14px", borderBottom: "1px solid #F8FAFC", color: "#64748B" }}>{p.vencimento || "—"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="ghost" onClick={() => setStep(2)}>← Voltar</Btn>
            <Btn variant="green" onClick={confirmar} disabled={importing}>{importing ? "Importando..." : <><Ic.check /> Importar {preview.filter(p => p.valido).length} clientes</>}</Btn>
          </div>
        </div>
      )}

      {step === 4 && (
        <div style={{ textAlign: "center", padding: "48px 20px" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", marginBottom: 8 }}>{preview.filter(p => p.valido).length} clientes importados!</h2>
          <p style={{ color: "#64748B", fontSize: 15, marginBottom: 28 }}>Prontos para receber cobranças automáticas.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Btn onClick={() => setTela("clientes")}>Ver clientes</Btn>
            <Btn variant="ghost" onClick={() => { setStep(1); setFile(null); setRawData([]); setPreview([]); }}>Nova importação</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

function Negativacao({ clientes, user }) {
  const [selecionados, setSelecionados] = useState([]);
  const [bureau, setBureau] = useState("serasa");
  const [modalDoc, setModalDoc] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const elegiveis = clientes.filter(c => c.status === "atrasado" && c.diasAtraso >= 10);
  const total = selecionados.reduce((a, id) => { const c = clientes.find(x => x.id === id); return a + (c?.totalDivida || 0); }, 0);
  const toggleSel = (id) => setSelecionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleTodos = () => setSelecionados(selecionados.length === elegiveis.length ? [] : elegiveis.map(c => c.id));

  const bureaus = [
    { key: "serasa", label: "Serasa Experian", logo: "🔵", desc: "Maior bureau do Brasil." },
    { key: "spc", label: "SPC Brasil", logo: "🟠", desc: "Integrado ao comércio e serviços." },
    { key: "boa_vista", label: "Boa Vista SCPC", logo: "🟢", desc: "Boa cobertura no varejo." },
  ];
  const bureauLabel = bureaus.find(b => b.key === bureau)?.label;
  const clientesSel = selecionados.map(id => clientes.find(c => c.id === id)).filter(Boolean);
  const hoje = new Date().toLocaleDateString("pt-BR");

  const gerar = () => {
    if (!selecionados.length) return;
    setGerando(true);
    setTimeout(() => { setGerando(false); setModalDoc(true); }, 1400);
  };

  return (
    <div>
      {toast && <ToastMsg {...toast} />}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0F172A" }}>Negativação de Devedores</h1>
        <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 14 }}>Gere documentos para Serasa, SPC ou Boa Vista</p>
      </div>

      <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 14, padding: 14, marginBottom: 20, display: "flex", gap: 10 }}>
        <span style={{ color: "#1E40AF", flexShrink: 0, marginTop: 1 }}><Ic.info /></span>
        <div style={{ fontSize: 13, color: "#1E3A8A", lineHeight: 1.6 }}><strong>Requisitos legais:</strong> O devedor deve ser notificado previamente. A dívida precisa ter no mínimo <strong>10 dias de atraso</strong>. CPF é obrigatório. O credor deve ter contrato ou comprovante da dívida (Lei nº 8.078/90 — CDC).</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
        <div>
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #F1F5F9", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><div style={{ fontWeight: 700, fontSize: 15, color: "#0F172A" }}>Elegíveis para negativação</div><div style={{ fontSize: 12, color: "#94A3B8" }}>{elegiveis.length} com +10 dias de atraso</div></div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                <input type="checkbox" checked={selecionados.length === elegiveis.length && elegiveis.length > 0} onChange={toggleTodos} style={{ width: 16, height: 16 }} /> Todos
              </label>
            </div>
            {elegiveis.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "#94A3B8" }}><div style={{ fontSize: 32, marginBottom: 8 }}>✅</div><div style={{ fontWeight: 600 }}>Nenhum devedor elegível</div><div style={{ fontSize: 13 }}>Clientes com +10 dias de atraso aparecem aqui</div></div>}
            {elegiveis.map(c => (
              <div key={c.id} onClick={() => toggleSel(c.id)} style={{ padding: "14px 18px", borderBottom: "1px solid #F8FAFC", cursor: "pointer", background: selecionados.includes(c.id) ? "#EFF6FF" : "#fff", display: "flex", gap: 12, alignItems: "center" }}>
                <input type="checkbox" checked={selecionados.includes(c.id)} onChange={() => toggleSel(c.id)} onClick={e => e.stopPropagation()} style={{ width: 16, height: 16, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div><div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{c.nome}</div><div style={{ fontSize: 12, color: "#94A3B8" }}>CPF: {c.cpf || "não informado"}</div></div>
                    <div style={{ textAlign: "right" }}><div style={{ fontWeight: 800, color: "#DC2626", fontSize: 16 }}>{fmt(c.totalDivida)}</div><div style={{ fontSize: 12, color: "#DC2626", fontWeight: 600 }}>⚠️ {c.diasAtraso} dias</div></div>
                  </div>
                  {!c.cpf && <div style={{ fontSize: 11, color: "#D97706", fontWeight: 600, marginTop: 4, background: "#FFFBEB", padding: "2px 8px", borderRadius: 99, display: "inline-block" }}>⚠️ CPF necessário</div>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 16, border: "1px solid #F1F5F9" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A", marginBottom: 12 }}>Órgão de Proteção</div>
            {bureaus.map(b => (
              <div key={b.key} onClick={() => setBureau(b.key)} style={{ padding: "10px 12px", borderRadius: 10, border: "1.5px solid " + (bureau === b.key ? "#1E40AF" : "#E2E8F0") + "", background: bureau === b.key ? "#EFF6FF" : "#F8FAFC", cursor: "pointer", marginBottom: 8, display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 18 }}>{b.logo}</span>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 13, color: bureau === b.key ? "#1E40AF" : "#0F172A" }}>{b.label}</div><div style={{ fontSize: 11, color: "#64748B" }}>{b.desc}</div></div>
                {bureau === b.key && <span style={{ color: "#1E40AF" }}><Ic.check /></span>}
              </div>
            ))}
          </div>

          <div style={{ background: selecionados.length > 0 ? "linear-gradient(135deg, #0F172A, #1E40AF)" : "#F8FAFC", borderRadius: 14, padding: 18, border: selecionados.length > 0 ? "none" : "1px solid #E2E8F0" }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: selecionados.length > 0 ? "#93C5FD" : "#94A3B8", marginBottom: 12, letterSpacing: 0.5 }}>RESUMO</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: selecionados.length > 0 ? "#BFDBFE" : "#94A3B8" }}>Devedores</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: selecionados.length > 0 ? "#fff" : "#94A3B8" }}>{selecionados.length}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
              <span style={{ fontSize: 13, color: selecionados.length > 0 ? "#BFDBFE" : "#94A3B8" }}>Total</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: selecionados.length > 0 ? "#fff" : "#94A3B8" }}>{fmt(total)}</span>
            </div>
            <Btn onClick={gerar} disabled={!selecionados.length || gerando} style={{ width: "100%", justifyContent: "center", background: selecionados.length > 0 ? "#fff" : "#E2E8F0", color: selecionados.length > 0 ? "#1E40AF" : "#94A3B8", border: "none" }}>
              {gerando ? "Gerando..." : <><Ic.shield /> Gerar documento</>}
            </Btn>
            {!selecionados.length && <div style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", marginTop: 8 }}>Selecione ao menos um devedor</div>}
          </div>
        </div>
      </div>

      {modalDoc && (
        <Modal title={"Documento — " + (bureauLabel) + ""} onClose={() => setModalDoc(false)} wide>
          <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 10, padding: 12, marginBottom: 18, fontSize: 13, color: "#166534", fontWeight: 600 }}>✅ Documento gerado! Salve ou imprima para enviar ao {bureauLabel}.</div>
          <div style={{ border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden", marginBottom: 18 }}>
            <div style={{ background: "#0F172A", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><div style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>SOLICITAÇÃO DE NEGATIVAÇÃO</div><div style={{ color: "#94A3B8", fontSize: 12 }}>{bureauLabel} · Protocolo: NEG-{Date.now().toString().slice(-6)}</div></div>
              <div style={{ color: "#94A3B8", fontSize: 11, textAlign: "right" }}><div>Data: {hoje}</div><div>{selecionados.length} devedor(es)</div></div>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: 1, marginBottom: 8 }}>DADOS DO CREDOR</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[["Razão Social", user.business], ["CNPJ", user.cnpj], ["E-mail", user.email], ["Responsável", user.name]].map(([k, v]) => (
                    <div key={k} style={{ background: "#F8FAFC", borderRadius: 8, padding: "8px 12px" }}><div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 2 }}>{k}</div><div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{v}</div></div>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: 1, marginBottom: 8 }}>DEVEDORES A NEGATIVAR</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr style={{ background: "#F8FAFC" }}>{["Nº", "Nome", "CPF", "Telefone", "Valor (R$)", "Vencimento", "Dias Atraso"].map(h => <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#374151", borderBottom: "2px solid #E2E8F0", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {clientesSel.map((c, i) => (
                      <tr key={c.id} style={{ background: i % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                        <td style={{ padding: "8px 10px", borderBottom: "1px solid #F1F5F9", color: "#94A3B8", fontWeight: 600 }}>{String(i + 1).padStart(2, "0")}</td>
                        <td style={{ padding: "8px 10px", borderBottom: "1px solid #F1F5F9", fontWeight: 700 }}>{c.nome}</td>
                        <td style={{ padding: "8px 10px", borderBottom: "1px solid #F1F5F9", color: c.cpf ? "#374151" : "#DC2626" }}>{c.cpf || "⚠️ AUSENTE"}</td>
                        <td style={{ padding: "8px 10px", borderBottom: "1px solid #F1F5F9", color: "#64748B" }}>{c.telefone || "—"}</td>
                        <td style={{ padding: "8px 10px", borderBottom: "1px solid #F1F5F9", fontWeight: 800, color: "#DC2626" }}>{fmt(c.totalDivida)}</td>
                        <td style={{ padding: "8px 10px", borderBottom: "1px solid #F1F5F9", color: "#64748B" }}>{c.vencimento || "—"}</td>
                        <td style={{ padding: "8px 10px", borderBottom: "1px solid #F1F5F9", fontWeight: 700, color: "#DC2626" }}>{c.diasAtraso} dias</td>
                      </tr>
                    ))}
                    <tr style={{ background: "#F8FAFC" }}>
                      <td colSpan={4} style={{ padding: "10px 10px", fontWeight: 700, color: "#374151" }}>TOTAL GERAL</td>
                      <td colSpan={3} style={{ padding: "10px 10px", fontWeight: 800, color: "#DC2626", fontSize: 15 }}>{fmt(total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 18, background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 12, color: "#92400E", lineHeight: 1.7 }}>
                  <strong>DECLARAÇÃO DO CREDOR:</strong> Declaro, sob as penas da lei, que os débitos relacionados neste documento são legítimos, que os devedores foram previamente notificados conforme exigência do Art. 43, §2º do CDC (Lei nº 8.078/90), e que possuo documentação comprobatória. Autorizo o {bureauLabel} a incluir os devedores acima nos cadastros de inadimplentes e comprometo-me a solicitar a exclusão imediata em caso de quitação.
                </div>
              </div>
              <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ width: 200, borderTop: "1px solid #374151", paddingTop: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{user.name}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8" }}>{user.business} · {user.cnpj}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: 11, color: "#94A3B8" }}>
                  <div>Gerado por CobrarFácil</div><div>{hoje}</div><div style={{ fontWeight: 700, color: "#1E40AF" }}>cobrarfacil.com.br</div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ background: "#F8FAFC", borderRadius: 12, padding: 16, marginBottom: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A", marginBottom: 10 }}>Próximos passos</div>
            {["Acesse o portal do " + (bureauLabel) + " ou vá a um parceiro conveniado", "Faça login com seu cadastro de credor PJ", "Envie este documento com os comprovantes da dívida", "O devedor será notificado e terá prazo para contestar", "Após quitação, solicite exclusão imediata"].map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                <div style={{ width: 22, height: 22, background: "#1E40AF", color: "#fff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                <div style={{ fontSize: 13, color: "#374151", paddingTop: 3 }}>{s}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn style={{ flex: 1, justifyContent: "center" }} onClick={() => showToast("Preparando impressão...")}><Ic.download /> Baixar / Imprimir</Btn>
            <Btn variant="ghost" style={{ flex: 1, justifyContent: "center" }} onClick={() => showToast("Resumo copiado!")}>Copiar resumo</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── RECUPERAÇÃO DE DÍVIDAS ANTIGAS ───────────────────────────────────────
function Recuperacao({ clientes, setClientes, historico, setHistorico, pixKey, nomeCobranca, setTela }) {
  const [selecionados, setSelecionados] = useState([]);
  const [etapa, setEtapa] = useState("lista"); // lista | proposta | enviando | sucesso
  const [tipoOferta, setTipoOferta] = useState("avista"); // avista | parcelado
  const [descontoAvista, setDescontoAvista] = useState(10);
  const [parcelasExtra, setParcelasExtra] = useState(3);
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  // Apenas dívidas com mais de 90 dias — nunca menos
  const antigas = clientes.filter(c => c.status !== "pago" && c.diasAtraso >= 90);
  const recentesEmRisco = clientes.filter(c => c.status !== "pago" && c.diasAtraso >= 60 && c.diasAtraso < 90);

  const totalSelecionado = selecionados.reduce((a, id) => {
    const c = clientes.find(x => x.id === id);
    return a + (c?.totalDivida || 0);
  }, 0);

  const potencialRecuperacao = (pct) => totalSelecionado * (pct / 100);

  const toggleSel = (id) => setSelecionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleTodos = () => setSelecionados(selecionados.length === antigas.length ? [] : antigas.map(c => c.id));

  const faixaAtraso = (dias) => {
    if (dias >= 365) return { label: "+1 ano", color: "#7C3AED", bg: "#F5F3FF" };
    if (dias >= 180) return { label: "+6 meses", color: "#DC2626", bg: "#FEF2F2" };
    if (dias >= 90)  return { label: "+90 dias", color: "#D97706", bg: "#FEF3C7" };
    return { label: "" + (dias) + " dias", color: "#64748B", bg: "#F1F5F9" };
  };

  const gerarMensagem = (c, tipo) => {
    const nome = c.nome.split(" ")[0];
    const empresa = nomeCobranca || "nossa empresa";
    const pix = pixKey ? "\n💳 Pix: *" + (pixKey) + "*" : "";

    if (tipo === "reativacao") {
      return `Olá ${nome}, tudo bem? 👋\n\nA *${empresa}* está em contato sobre um débito de *${fmt(c.totalDivida)}* que está em aberto há algum tempo.\n\nEntendemos que imprevistos acontecem. Por isso, preparamos uma condição especial para você resolver isso agora e seguir em frente sem dívida.\n\nResponda essa mensagem e vamos encontrar a melhor solução juntos. 🤝`;
    }
    if (tipo === "avista") {
      const desconto = Math.round(c.totalDivida * (descontoAvista / 100));
      const valorFinal = c.totalDivida - desconto;
      return `${nome}, temos uma proposta especial para você! 🎯\n\nSua dívida de *${fmt(c.totalDivida)}* com a *${empresa}* pode ser quitada hoje com *${descontoAvista}% de desconto*.\n\n✅ Valor original: *${fmt(c.totalDivida)}*\n🎁 Desconto: *${fmt(desconto)}*\n💰 Valor final: *${fmt(valorFinal)}*\n\nPague agora via Pix e limpe seu nome:${pix} | Valor: *${fmt(valorFinal)}*\n\n⏰ Oferta válida por 72 horas.`;
    }
    if (tipo === "parcelado") {
      const totalParcelas = (c.parcelas || 1) + parcelasExtra;
      const valorParcela = c.totalDivida / totalParcelas;
      return `${nome}, sabemos que às vezes o orçamento aperta. 💙\n\nA *${empresa}* tem uma proposta para você quitar sua dívida de *${fmt(c.totalDivida)}* sem pesar no bolso:\n\n📅 *${totalParcelas}x de ${fmt(valorParcela)}*\nSem juros adicionais. Sem burocracia.\n\nResponda "ACEITO" e mandamos o primeiro boleto/Pix agora.\n\n⏰ Proposta válida por 48 horas.`;
    }
    if (tipo === "ultimaChance") {
      return `${nome}, esta é nossa última tentativa de contato antes de tomarmos medidas formais. ⚠️\n\nSua dívida de *${fmt(c.totalDivida)}* com a *${empresa}* está há *${c.diasAtraso} dias* em atraso.\n\nCaso não haja acordo nos próximos 5 dias úteis, o débito será encaminhado para negativação no Serasa e SPC, o que afetará seu score de crédito.\n\nRegularize agora:${pix}\n\nSe quiser negociar, responda essa mensagem. Ainda há tempo.`;
    }
    return "";
  };

  const enviarPropostas = () => {
    setEtapa("enviando");
    setTimeout(() => {
      const clientesSel = selecionados.map(id => clientes.find(c => c.id === id)).filter(Boolean);
      clientesSel.forEach(c => {
        const msg = gerarMensagem(c, tipoOferta === "avista" ? "avista" : "parcelado");
        setHistorico(prev => [{
          id: Date.now() + Math.random(),
          clienteId: c.id,
          tipo: "whatsapp",
          data: new Date().toLocaleString("pt-BR"),
          mensagem: msg,
          status: "entregue",
          tipoRecuperacao: tipoOferta,
        }, ...prev]);
      });
      setEtapa("sucesso");
    }, 1800);
  };

  // ── CALCULADORA ──────────────────────────────────────────────────────────
  const totalAntigo = antigas.reduce((a, c) => a + c.totalDivida, 0);
  const projecoes = [
    { pct: 30, label: "Cenário conservador", color: "#D97706" },
    { pct: 50, label: "Cenário realista", color: "#2563EB" },
    { pct: 70, label: "Cenário otimista", color: "#16A34A" },
  ];

  return (
    <div>
      {toast && <ToastMsg {...toast} />}

      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0F172A" }}>Recuperação de Dívidas Antigas</h1>
        <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 14 }}>Dívidas com <strong>mais de 90 dias</strong> — régua e propostas especiais de negociação</p>
      </div>

      {/* Aviso: sem redução antes de 90 dias */}
      <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 10, alignItems: "center" }}>
        <span style={{ fontSize: 18 }}>🔒</span>
        <div style={{ fontSize: 13, color: "#1E3A8A" }}>
          <strong>Regra de proteção ativa:</strong> Propostas de desconto ou renegociação só são liberadas após <strong>90 dias de atraso</strong>. Dívidas mais recentes seguem a régua padrão sem redução de valor.
        </div>
      </div>

      {etapa === "sucesso" && (
        <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 16, padding: 32, textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", marginBottom: 8 }}>Propostas enviadas!</div>
          <div style={{ fontSize: 14, color: "#64748B", marginBottom: 20 }}>{selecionados.length} cliente(s) receberam a proposta de negociação agora.</div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <Btn onClick={() => { setEtapa("lista"); setSelecionados([]); }}>Nova rodada</Btn>
            <Btn variant="ghost" onClick={() => setTela("historico")}>Ver histórico</Btn>
          </div>
        </div>
      )}

      {etapa === "enviando" && (
        <div style={{ background: "#fff", border: "1px solid #F1F5F9", borderRadius: 16, padding: 40, textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📤</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>Enviando propostas...</div>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 6 }}>Aguarde enquanto preparamos as mensagens</div>
        </div>
      )}

      {(etapa === "lista" || etapa === "proposta") && (
        <>
          {/* Calculadora de potencial */}
          {antigas.length > 0 && (
            <div style={{ background: "linear-gradient(135deg, #0F172A, #1E3A5F)", borderRadius: 16, padding: 22, marginBottom: 22, color: "#fff" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#93C5FD", letterSpacing: 1, marginBottom: 12 }}>💡 CALCULADORA DE RECUPERAÇÃO</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16, marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 13, color: "#94A3B8", marginBottom: 4 }}>Total em dívidas antigas (+90 dias)</div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: "#fff", letterSpacing: -1 }}>{fmt(totalAntigo)}</div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>{antigas.length} devedor(es) · média de {antigas.length > 0 ? Math.round(antigas.reduce((a,c) => a + c.diasAtraso, 0) / antigas.length) : 0} dias de atraso</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {projecoes.map(p => (
                  <div key={p.pct} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 12, padding: "12px 14px", textAlign: "center", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 6 }}>{p.label}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: p.color }}>{fmt(totalAntigo * p.pct / 100)}</div>
                    <div style={{ fontSize: 11, color: "#64748B", marginTop: 3 }}>se recuperar {p.pct}%</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, fontSize: 12, color: "#64748B", textAlign: "center" }}>
                * Dívidas até 12 meses têm 40–60% de recuperação com a abordagem certa. Não é dívida perdida — é dívida sem estratégia.
              </div>
            </div>
          )}

          {/* Aviso de dívidas se aproximando de 90 dias */}
          {recentesEmRisco.length > 0 && (
            <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: 14, marginBottom: 18 }}>
              <div style={{ fontWeight: 700, color: "#92400E", fontSize: 13, marginBottom: 4 }}>
                ⏰ {recentesEmRisco.length} dívida(s) se aproximando dos 90 dias
              </div>
              <div style={{ fontSize: 12, color: "#B45309" }}>
                Estas ainda seguem a régua padrão sem desconto. Em breve estarão disponíveis aqui para negociação.
              </div>
            </div>
          )}

          {/* Lista de antigas */}
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #F1F5F9", overflow: "hidden", marginBottom: 20 }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#0F172A" }}>Devedores com +90 dias de atraso</div>
                <div style={{ fontSize: 12, color: "#94A3B8" }}>{antigas.length} clientes · {fmt(totalAntigo)} em aberto</div>
              </div>
              {antigas.length > 0 && (
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#374151" }}>
                  <input type="checkbox" checked={selecionados.length === antigas.length && antigas.length > 0} onChange={toggleTodos} style={{ width: 16, height: 16 }} />
                  Selecionar todos
                </label>
              )}
            </div>

            {antigas.length === 0 && (
              <div style={{ padding: 48, textAlign: "center", color: "#94A3B8" }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#0F172A", marginBottom: 6 }}>Nenhuma dívida antiga no momento</div>
                <div style={{ fontSize: 13 }}>Todas as cobranças estão dentro de 90 dias. Continue assim!</div>
              </div>
            )}

            {antigas.map(c => {
              const faixa = faixaAtraso(c.diasAtraso);
              const sel = selecionados.includes(c.id);
              return (
                <div key={c.id} onClick={() => toggleSel(c.id)}
                  style={{ padding: "14px 18px", borderBottom: "1px solid #F8FAFC", cursor: "pointer", background: sel ? "#EFF6FF" : "#fff", display: "flex", gap: 12, alignItems: "center" }}>
                  <input type="checkbox" checked={sel} onChange={() => toggleSel(c.id)} onClick={e => e.stopPropagation()} style={{ width: 16, height: 16, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{c.nome}</div>
                        <div style={{ fontSize: 12, color: "#94A3B8" }}>{c.cpf || "CPF não informado"} · {c.telefone}</div>
                        <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                          <span style={{ background: faixa.bg, color: faixa.color, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>
                            ⚠️ {faixa.label} em atraso
                          </span>
                          {c.vencimento && <span style={{ fontSize: 11, color: "#94A3B8" }}>Venceu em {c.vencimento}</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: "#DC2626" }}>{fmt(c.totalDivida)}</div>
                        {c.diasAtraso >= 90 && c.diasAtraso < 180 && <div style={{ fontSize: 11, color: "#D97706", fontWeight: 600 }}>Proposta de desconto disponível</div>}
                        {c.diasAtraso >= 180 && c.diasAtraso < 365 && <div style={{ fontSize: 11, color: "#DC2626", fontWeight: 600 }}>Risco alto — negociar urgente</div>}
                        {c.diasAtraso >= 365 && <div style={{ fontSize: 11, color: "#7C3AED", fontWeight: 600 }}>Caso crítico — negativação recomendada</div>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Painel de ação — aparece quando há selecionados */}
          {selecionados.length > 0 && etapa === "lista" && (
            <div style={{ background: "#fff", borderRadius: 16, border: "2px solid #1E40AF", padding: 22, marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#0F172A", marginBottom: 4 }}>
                {selecionados.length} devedor(es) selecionado(s) · {fmt(totalSelecionado)} em aberto
              </div>
              <div style={{ fontSize: 13, color: "#64748B", marginBottom: 18 }}>Escolha a estratégia de abordagem para esses clientes:</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
                {[
                  { key: "reativacao", emoji: "👋", label: "Reativação", desc: "Primeiro contato amigável após longo período. Tom de recomeço." },
                  { key: "avista", emoji: "🎯", label: "Desconto à vista", desc: "Oferta de " + (descontoAvista) + "% off para pagamento imediato via Pix." },
                  { key: "parcelado", emoji: "📅", label: "Parcelamento extra", desc: "Dividir em mais " + (parcelasExtra) + "x sem juros adicionais." },
                  { key: "ultimaChance", emoji: "⛔", label: "Última chance", desc: "Aviso formal antes de negativação. Tom firme e definitivo." },
                ].map(op => (
                  <div key={op.key} onClick={() => setTipoOferta(op.key)}
                    style={{ background: tipoOferta === op.key ? "#EFF6FF" : "#F8FAFC", border: "2px solid " + (tipoOferta === op.key ? "#1E40AF" : "#E2E8F0") + "", borderRadius: 12, padding: "12px 14px", cursor: "pointer" }}>
                    <div style={{ fontSize: 20, marginBottom: 6 }}>{op.emoji}</div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: tipoOferta === op.key ? "#1E40AF" : "#0F172A", marginBottom: 4 }}>{op.label}</div>
                    <div style={{ fontSize: 11, color: "#64748B", lineHeight: 1.4 }}>{op.desc}</div>
                  </div>
                ))}
              </div>

              {/* Configuração do desconto/parcelamento */}
              {tipoOferta === "avista" && (
                <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#166534", marginBottom: 12 }}>🎯 Configurar desconto à vista</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Percentual de desconto: <strong style={{ color: "#16A34A" }}>{descontoAvista}%</strong></label>
                      <input type="range" min="5" max="40" value={descontoAvista} onChange={e => setDescontoAvista(Number(e.target.value))}
                        style={{ width: "100%", accentColor: "#16A34A" }} />
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94A3B8" }}><span>5% mín.</span><span>40% máx.</span></div>
                    </div>
                    <div style={{ background: "#fff", borderRadius: 10, padding: "10px 16px", textAlign: "center", border: "1px solid #D1FAE5" }}>
                      <div style={{ fontSize: 11, color: "#64748B" }}>Você recebe</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#16A34A" }}>{fmt(totalSelecionado * (1 - descontoAvista / 100))}</div>
                      <div style={{ fontSize: 10, color: "#94A3B8" }}>de {fmt(totalSelecionado)}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "#065F46", marginTop: 10, background: "#DCFCE7", borderRadius: 8, padding: "6px 10px" }}>
                    💡 Dica: descontos entre 10–20% têm a maior taxa de conversão para dívidas entre 90 e 180 dias.
                  </div>
                </div>
              )}

              {tipoOferta === "parcelado" && (
                <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#1E3A8A", marginBottom: 12 }}>📅 Configurar parcelamento extra</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>Parcelas adicionais: <strong style={{ color: "#1E40AF" }}>+{parcelasExtra}x</strong></label>
                      <input type="range" min="1" max="12" value={parcelasExtra} onChange={e => setParcelasExtra(Number(e.target.value))}
                        style={{ width: "100%", accentColor: "#1E40AF" }} />
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94A3B8" }}><span>+1x</span><span>+12x</span></div>
                    </div>
                    <div style={{ background: "#fff", borderRadius: 10, padding: "10px 16px", textAlign: "center", border: "1px solid #BFDBFE" }}>
                      <div style={{ fontSize: 11, color: "#64748B" }}>Parcela média</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#1E40AF" }}>
                        {selecionados.length === 1
                          ? fmt(totalSelecionado / ((clientes.find(c => c.id === selecionados[0])?.parcelas || 1) + parcelasExtra))
                          : "Varia"}
                      </div>
                      <div style={{ fontSize: 10, color: "#94A3B8" }}>valor integral</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview da mensagem */}
              {tipoOferta && (
                <div style={{ background: "#F8FAFC", borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", marginBottom: 8 }}>📱 PREVIEW DA MENSAGEM</div>
                  <div style={{ background: "#E5DDD5", borderRadius: 10, padding: 14 }}>
                    <div style={{ background: "#fff", borderRadius: "10px 10px 10px 0", padding: "10px 14px", maxWidth: "90%", fontSize: 13, color: "#0F172A", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {antigas.length > 0 && selecionados.length > 0
                        ? gerarMensagem(clientes.find(c => c.id === selecionados[0]), tipoOferta)
                        : "Selecione um cliente para ver o preview"}
                    </div>
                  </div>
                </div>
              )}

              <Btn onClick={enviarPropostas} style={{ width: "100%", justifyContent: "center", fontSize: 15 }}>
                <Ic.send /> Enviar para {selecionados.length} devedor(es)
              </Btn>
            </div>
          )}
        </>
      )}
    </div>
  );
}


const REGUA_PADRAO = [
  { key: "d_3",  label: "D-3",   desc: "3 dias antes do vencimento", dias: -3,  tom: "lembrete",    emoji: "🔔" },
  { key: "d0",   label: "D0",    desc: "No dia do vencimento",        dias: 0,   tom: "lembrete",    emoji: "📅" },
  { key: "d7",   label: "D+7",   desc: "7 dias em atraso",            dias: 7,   tom: "atraso",      emoji: "⚠️" },
  { key: "d15",  label: "D+15",  desc: "15 dias em atraso",           dias: 15,  tom: "ultimoAviso", emoji: "🚨" },
  { key: "d30",  label: "D+30",  desc: "30 dias — risco de negativação", dias: 30, tom: "negativacao", emoji: "⛔" },
];

function Regua({ clientes, setClientes, setTela }) {
  const [busca, setBusca] = useState("");
  const [clienteConfig, setClienteConfig] = useState(null);
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const naoPageos = clientes.filter(c => c.status !== "pago" && c.nome.toLowerCase().includes(busca.toLowerCase()));
  const suspensos = clientes.filter(c => c.suspenso && c.status !== "pago");

  // Retorna etapas ativas de um cliente (todas por padrão)
  const etapasAtivas = (c) => c.etapasSuspensas || [];

  const toggleSuspensao = (clienteId) => {
    setClientes(prev => prev.map(c => c.id === clienteId ? { ...c, suspenso: !c.suspenso } : c));
    const c = clientes.find(x => x.id === clienteId);
    showToast(c?.suspenso ? "✅ Cobrança de " + (c?.nome?.split(" ")[0]) + " reativada" : "⏸ Cobrança de " + (c?.nome?.split(" ")[0]) + " suspensa");
  };

  const toggleEtapa = (clienteId, etapaKey) => {
    setClientes(prev => prev.map(c => {
      if (c.id !== clienteId) return c;
      const atual = c.etapasSuspensas || [];
      const novas = atual.includes(etapaKey) ? atual.filter(e => e !== etapaKey) : [...atual, etapaKey];
      return { ...c, etapasSuspensas: novas };
    }));
    const c = clientes.find(x => x.id === clienteId);
    const upd = c?.etapasSuspensas || [];
    const suspendendo = !upd.includes(etapaKey);
    const etapa = REGUA_PADRAO.find(e => e.key === etapaKey);
    showToast(suspendendo ? `Etapa ${etapa?.label} desativada para ${c?.nome?.split(" ")[0]}` : `Etapa ${etapa?.label} reativada para ${c?.nome?.split(" ")[0]}`);
    if (clienteConfig?.id === clienteId) {
      setClienteConfig(prev => {
        const atuais = prev.etapasSuspensas || [];
        return { ...prev, etapasSuspensas: atuais.includes(etapaKey) ? atuais.filter(e => e !== etapaKey) : [...atuais, etapaKey] };
      });
    }
  };

  return (
    <div>
      {toast && <ToastMsg {...toast} />}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0F172A" }}>Régua de Cobrança</h1>
        <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 14 }}>Todas as cobranças são automáticas. Suspenda ou ajuste por cliente quando necessário.</p>
      </div>

      {/* Régua padrão visual */}
      <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: "1px solid #F1F5F9", marginBottom: 22 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A", marginBottom: 14 }}>⚡ Régua padrão ativa para todos os clientes</div>
        <div style={{ display: "flex", gap: 0, alignItems: "center", overflowX: "auto", paddingBottom: 4 }}>
          {REGUA_PADRAO.map((e, i) => (
            <div key={e.key} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
              <div style={{ textAlign: "center", minWidth: 90 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: i === 0 ? "#EFF6FF" : i === 1 ? "#FFFBEB" : i === 2 ? "#FEF3C7" : i === 3 ? "#FEF2F2" : "#FDF2F8", border: "2px solid " + (i === 0 ? "#3B82F6" : i === 1 ? "#F59E0B" : i === 2 ? "#D97706" : i === 3 ? "#DC2626" : "#9333EA") + "", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, margin: "0 auto 6px" }}>{e.emoji}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#0F172A" }}>{e.label}</div>
                <div style={{ fontSize: 10, color: "#64748B", marginTop: 2, lineHeight: 1.3 }}>{e.desc}</div>
              </div>
              {i < REGUA_PADRAO.length - 1 && <div style={{ width: 28, height: 2, background: "linear-gradient(90deg, #CBD5E1, #94A3B8)", margin: "0 2px", flexShrink: 0 }} />}
            </div>
          ))}
        </div>
        {suspensos.length > 0 && (
          <div style={{ marginTop: 14, background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#92400E" }}>
            ⏸ <strong>{suspensos.length} cliente(s)</strong> com cobrança suspensa no momento
          </div>
        )}
      </div>

      {/* Busca */}
      <input placeholder="🔍 Buscar cliente..." value={busca} onChange={e => setBusca(e.target.value)}
        style={{ width: "100%", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", background: "#F8FAFC", boxSizing: "border-box", marginBottom: 14 }} />

      {/* Lista de clientes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {naoPageos.map(c => {
          const etapasOff = etapasAtivas(c);
          const totalAtivas = REGUA_PADRAO.length - etapasOff.length;
          return (
            <div key={c.id} style={{ background: "#fff", borderRadius: 14, border: "1.5px solid " + (c.suspenso ? "#FDE68A" : "#F1F5F9") + "", overflow: "hidden" }}>
              {/* Header do cliente */}
              <div style={{ padding: "13px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, background: c.suspenso ? "#FFFBEB" : "#fff" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 36, height: 36, background: c.suspenso ? "linear-gradient(135deg, #FEF3C7, #FDE68A)" : c.diasAtraso > 0 ? "linear-gradient(135deg, #FEE2E2, #FECACA)" : "linear-gradient(135deg, #DBEAFE, #BFDBFE)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: c.suspenso ? "#92400E" : c.diasAtraso > 0 ? "#DC2626" : "#1E40AF" }}>
                    {c.suspenso ? "⏸" : c.nome.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{c.nome}</div>
                    <div style={{ fontSize: 12, color: "#94A3B8" }}>
                      {c.suspenso ? <span style={{ color: "#D97706", fontWeight: 600 }}>Cobrança suspensa</span>
                        : etapasOff.length > 0 ? <span style={{ color: "#7C3AED" }}>{totalAtivas}/{REGUA_PADRAO.length} etapas ativas</span>
                        : <span style={{ color: "#16A34A" }}>⚡ Todas as etapas ativas</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ textAlign: "right", marginRight: 4 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: c.diasAtraso > 0 ? "#DC2626" : "#0F172A" }}>{fmt(c.totalDivida)}</div>
                    {c.diasAtraso > 0 && <div style={{ fontSize: 11, color: "#DC2626", fontWeight: 600 }}>⚠️ {c.diasAtraso} dias atraso</div>}
                  </div>
                  <Btn small variant={c.suspenso ? "green" : "ghost"} onClick={() => toggleSuspensao(c.id)}>
                    {c.suspenso ? "▶ Reativar" : "⏸ Suspender"}
                  </Btn>
                  <Btn small variant="ghost" onClick={() => setClienteConfig(clienteConfig?.id === c.id ? null : { ...c })}>
                    {clienteConfig?.id === c.id ? "▲ Fechar" : "⚙️ Etapas"}
                  </Btn>
                </div>
              </div>

              {/* Painel de etapas expandido */}
              {clienteConfig?.id === c.id && !c.suspenso && (
                <div style={{ padding: "14px 16px", borderTop: "1px solid #F1F5F9", background: "#F8FAFC" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 12 }}>
                    ETAPAS DA RÉGUA — ative ou desative para {c.nome.split(" ")[0]}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {REGUA_PADRAO.map(etapa => {
                      const off = (c.etapasSuspensas || []).includes(etapa.key);
                      return (
                        <div key={etapa.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: off ? "#F8FAFC" : "#fff", borderRadius: 10, padding: "10px 14px", border: "1px solid " + (off ? "#E2E8F0" : "#D1FAE5") + "", opacity: off ? 0.6 : 1 }}>
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <span style={{ fontSize: 18 }}>{etapa.emoji}</span>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: "#0F172A" }}>{etapa.label} — {etapa.desc}</div>
                              <div style={{ fontSize: 11, color: "#64748B" }}>Tom: {etapa.tom === "lembrete" ? "Amigável" : etapa.tom === "atraso" ? "Urgente" : etapa.tom === "ultimoAviso" ? "Último aviso" : "Alerta de negativação"}</div>
                            </div>
                          </div>
                          <div onClick={() => toggleEtapa(c.id, etapa.key)}
                            style={{ width: 42, height: 23, background: off ? "#E2E8F0" : "#16A34A", borderRadius: 99, position: "relative", cursor: "pointer", flexShrink: 0, transition: "background 0.2s" }}>
                            <div style={{ width: 17, height: 17, background: "#fff", borderRadius: "50%", position: "absolute", top: 3, left: off ? 3 : 22, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 12, fontSize: 12, color: "#64748B", fontStyle: "italic" }}>
                    As etapas desativadas não serão enviadas para esse cliente, mas continuam ativas para os demais.
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {naoPageos.length === 0 && (
          <div style={{ textAlign: "center", padding: 48, color: "#94A3B8" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <div style={{ fontWeight: 600 }}>Nenhum cliente ativo no momento</div>
          </div>
        )}
      </div>
    </div>
  );
}

function Aprovacoes({ clientes, historico, setHistorico, pixKey, setTela }) {
  const [aprovando, setAprovando] = useState(null);
  const [msgEditada, setMsgEditada] = useState({});
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  // Clientes com aprovação manual que têm cobrança pendente
  const pendentes = clientes.filter(c => c.automatico === false && c.status !== "pago");

  const linkPix = (valor) => pixKey
    ? "💳 Pix: *" + pixKey + "* | Valor: *" + fmt(valor) + "*"
    : `👉 [configure sua chave Pix nas Configurações]`;

  const gerarMensagem = (c) => {
    if (msgEditada[c.id]) return msgEditada[c.id];
    if (c.diasAtraso > 0) return `Oi ${c.nome.split(" ")[0]},\n\nIdentificamos uma pendência de *${fmt(c.totalDivida)}* em atraso há ${c.diasAtraso} dias.\n\nPara regularizar:\n${linkPix(c.totalDivida)}\n\nEstamos à disposição para negociar. 🤝`;
    return `Olá ${c.nome.split(" ")[0]} 😊\n\nPassando para lembrar que você tem uma parcela de *${fmt(c.totalDivida / c.parcelas)}* com vencimento em *${c.vencimento}*.\n\nPague via Pix:\n${linkPix(c.totalDivida / c.parcelas)}\n\nQualquer dúvida, é só chamar! 🙏`;
  };

  const aprovar = (c) => {
    setAprovando(c.id);
    setTimeout(() => {
      setHistorico(prev => [{
        id: Date.now(),
        clienteId: c.id,
        tipo: "whatsapp",
        data: new Date().toLocaleString("pt-BR"),
        mensagem: gerarMensagem(c),
        status: "entregue",
        aprovada: true,
      }, ...prev]);
      setAprovando(null);
      showToast("✅ Cobrança de " + (c.nome.split(" ")[0]) + " aprovada e enviada!");
    }, 900);
  };

  const recusar = (c) => {
    showToast("Cobrança de " + (c.nome.split(" ")[0]) + " ignorada.", "error");
  };

  const aprovarTodas = () => {
    pendentes.forEach(c => {
      setHistorico(prev => [{
        id: Date.now() + Math.random(),
        clienteId: c.id,
        tipo: "whatsapp",
        data: new Date().toLocaleString("pt-BR"),
        mensagem: gerarMensagem(c),
        status: "entregue",
        aprovada: true,
      }, ...prev]);
    });
    showToast("✅ " + (pendentes.length) + " cobranças aprovadas e enviadas!");
  };

  return (
    <div>
      {toast && <ToastMsg {...toast} />}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0F172A" }}>Fila de Aprovação</h1>
        <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 14 }}>Cobranças aguardando sua autorização antes de serem enviadas</p>
      </div>

      {/* Aviso Pix */}
      {!pixKey && (
        <div style={{ background: "#FFF7ED", border: "1.5px solid #FED7AA", borderRadius: 12, padding: 14, marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontSize: 13, color: "#92400E", fontWeight: 600 }}>⚡ Configure sua chave Pix para as mensagens terem link de pagamento</div>
          <Btn small variant="orange" onClick={() => setTela("config")}>Configurar Pix →</Btn>
        </div>
      )}

      {pendentes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 16, border: "1px solid #F1F5F9" }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>✅</div>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#0F172A", marginBottom: 6 }}>Nenhuma cobrança pendente</div>
          <div style={{ fontSize: 14, color: "#64748B", marginBottom: 24 }}>Todos os clientes com aprovação manual já foram processados.</div>
          <Btn variant="ghost" onClick={() => setTela("clientes")}>Ver clientes</Btn>
        </div>
      ) : (
        <>
          {/* Ação em massa */}
          <div style={{ background: "linear-gradient(135deg, #EFF6FF, #DBEAFE)", border: "1px solid #BFDBFE", borderRadius: 14, padding: 16, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#1E40AF" }}>
                {pendentes.length} cobrança(s) aguardando aprovação
              </div>
              <div style={{ fontSize: 13, color: "#3B82F6", marginTop: 2 }}>
                Total: {fmt(pendentes.reduce((a, c) => a + c.totalDivida, 0))}
              </div>
            </div>
            <Btn onClick={aprovarTodas}>
              <Ic.check /> Aprovar todas ({pendentes.length})
            </Btn>
          </div>

          {/* Cards individuais */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {pendentes.map(c => (
              <div key={c.id} style={{ background: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                {/* Cabeçalho do card */}
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ width: 38, height: 38, background: c.diasAtraso > 0 ? "linear-gradient(135deg, #FEE2E2, #FECACA)" : "linear-gradient(135deg, #DBEAFE, #BFDBFE)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: c.diasAtraso > 0 ? "#DC2626" : "#1E40AF" }}>
                      {c.nome.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#0F172A" }}>{c.nome}</div>
                      <div style={{ fontSize: 12, color: "#94A3B8" }}>{c.telefone} · {c.cpf || "CPF não informado"}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: c.diasAtraso > 0 ? "#DC2626" : "#0F172A" }}>{fmt(c.totalDivida)}</div>
                    {c.diasAtraso > 0
                      ? <div style={{ fontSize: 12, color: "#DC2626", fontWeight: 600 }}>⚠️ {c.diasAtraso} dias em atraso</div>
                      : <div style={{ fontSize: 12, color: "#64748B" }}>Vence: {c.vencimento}</div>
                    }
                  </div>
                </div>

                {/* Preview + edição da mensagem */}
                <div style={{ padding: "14px 18px", background: "#F8FAFC" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#64748B", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                    <span>📱 MENSAGEM QUE SERÁ ENVIADA</span>
                    <span style={{ color: "#1E40AF", cursor: "pointer", fontWeight: 600 }} onClick={() => setMsgEditada(p => ({ ...p, [c.id]: p[c.id] !== undefined ? undefined : gerarMensagem(c) }))}>
                      {msgEditada[c.id] !== undefined ? "← Restaurar original" : "✏️ Editar"}
                    </span>
                  </div>
                  {msgEditada[c.id] !== undefined ? (
                    <textarea
                      value={msgEditada[c.id]}
                      onChange={e => setMsgEditada(p => ({ ...p, [c.id]: e.target.value }))}
                      rows={5}
                      style={{ width: "100%", border: "1.5px solid #3B82F6", borderRadius: 10, padding: "10px 12px", fontSize: 13, outline: "none", background: "#fff", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.5 }}
                    />
                  ) : (
                    <div style={{ background: "#fff", borderRadius: 10, padding: "12px 14px", border: "1px solid #E2E8F0", fontSize: 13, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {gerarMensagem(c)}
                    </div>
                  )}
                </div>

                {/* Botões de ação */}
                <div style={{ padding: "12px 18px", display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid #F1F5F9" }}>
                  <Btn small variant="ghost" onClick={() => recusar(c)}>
                    Ignorar agora
                  </Btn>
                  <Btn small variant="green" onClick={() => aprovar(c)} disabled={aprovando === c.id}>
                    {aprovando === c.id ? "Enviando..." : <><Ic.send /> Aprovar e enviar</>}
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Cobrancas({ clientes, historico, setHistorico, clientePreSelecionado, setClientePreSelecionado, pixKey, setTela, nomeCobranca }) {
  const [clienteSel, setClienteSel] = useState(clientePreSelecionado?.id?.toString() || "");
  const [canal, setCanal] = useState("whatsapp");
  const [template, setTemplate] = useState("lembrete");
  const [msg, setMsg] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const linkPix = (valor) => pixKey
    ? "💳 Pix: *" + pixKey + "* | Valor: *" + fmt(valor) + "*"
    : `👉 [configure sua chave Pix nas Configurações]`;

  const tpls = {
    lembrete: (c) => `Olá ${c?.nome?.split(" ")[0]} 😊\n\nPassando para lembrar que você tem uma parcela de *${fmt(c?.totalDivida / c?.parcelas)}* com vencimento em *${c?.vencimento}*.\n\nPague agora via Pix:\n${linkPix(c?.totalDivida / c?.parcelas)}\n\nQualquer dúvida, é só chamar! 🙏`,
    atraso: (c) => `Oi ${c?.nome?.split(" ")[0]},\n\nIdentificamos uma pendência de *${fmt(c?.totalDivida)}* em atraso.\n\nRegularize agora via Pix:\n${linkPix(c?.totalDivida)}\n\nEstamos à disposição para negociar. 🤝`,
    ultimoAviso: (c) => `${c?.nome?.split(" ")[0]}, aviso importante ⚠️\n\nSua dívida de *${fmt(c?.totalDivida)}* está há mais de 30 dias em aberto.\n\nSem pagamento, o débito será negativado no Serasa.\n\nPague agora:\n${linkPix(c?.totalDivida)}`,
    negociacao: (c) => `Olá ${c?.nome?.split(" ")[0]}! 🤝\n\nQue tal negociarmos sua dívida de *${fmt(c?.totalDivida)}*?\n\nTemos condições especiais disponíveis. Se preferir pagar hoje:\n${linkPix(c?.totalDivida)}\n\nResponda essa mensagem! ✅`,
  };
  const clienteSelecionado = clientes.find(c => c.id.toString() === clienteSel);
  useEffect(() => { if (clienteSelecionado) setMsg(tpls[template](clienteSelecionado)); }, [clienteSel, template]);
  useEffect(() => { if (clientePreSelecionado) { setClienteSel(clientePreSelecionado.id.toString()); setClientePreSelecionado(null); } }, []);
  const atrasados = clientes.filter(c => c.status === "atrasado");
  const enviar = () => {
    if (!clienteSel || !msg) return;
    setEnviando(true);
    setTimeout(() => { setHistorico(prev => [{ id: Date.now(), clienteId: parseInt(clienteSel), tipo: canal, data: new Date().toLocaleString("pt-BR"), mensagem: msg, status: "entregue" }, ...prev]); setEnviando(false); setSucesso(true); setTimeout(() => setSucesso(false), 3000); }, 1400);
  };
  return (
    <div>
      <div style={{ marginBottom: 20 }}><h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0F172A" }}>Enviar Cobrança</h1><p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 14 }}>Via WhatsApp ou e-mail</p></div>

      {!pixKey && (
        <div style={{ background: "#FFF7ED", border: "1.5px solid #FED7AA", borderRadius: 14, padding: 14, marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 22 }}>⚡</span>
            <div><div style={{ fontWeight: 700, color: "#92400E", fontSize: 14 }}>Chave Pix não configurada</div><div style={{ fontSize: 13, color: "#B45309" }}>As cobranças ficam sem link de pagamento. Configure agora.</div></div>
          </div>
          <Btn variant="orange" small onClick={() => setTela("config")}>Configurar Pix →</Btn>
        </div>
      )}
      {pixKey && (
        <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 12, padding: "10px 16px", marginBottom: 18, display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 16 }}>⚡</span>
          <div style={{ fontSize: 13, color: "#166534" }}>Pix: <strong style={{ fontFamily: "monospace" }}>{pixKey}</strong> — inserido automaticamente nas cobranças</div>
        </div>
      )}

      {atrasados.length > 0 && (
        <div style={{ background: "linear-gradient(135deg, #FEF2F2, #FEE2E2)", border: "1px solid #FECACA", borderRadius: 14, padding: 14, marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div><div style={{ fontWeight: 700, color: "#DC2626", fontSize: 14 }}>⚡ Cobrar todos os atrasados</div><div style={{ fontSize: 13, color: "#B91C1C" }}>{atrasados.length} clientes · {fmt(atrasados.reduce((a, c) => a + c.totalDivida, 0))}</div></div>
            <Btn variant="danger" onClick={() => { atrasados.forEach(c => setHistorico(prev => [{ id: Date.now() + Math.random(), clienteId: c.id, tipo: "whatsapp", data: new Date().toLocaleString("pt-BR"), mensagem: tpls.atraso(c), status: "entregue" }, ...prev])); setSucesso(true); setTimeout(() => setSucesso(false), 3000); }}>
              <Ic.robot /> Cobrar {atrasados.length}
            </Btn>
          </div>
        </div>
      )}
      {sucesso && <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 12, padding: 12, marginBottom: 16, display: "flex", gap: 8, alignItems: "center", color: "#16A34A", fontWeight: 600 }}><Ic.check /> Cobrança enviada!</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: "1px solid #F1F5F9" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>Configurar</h3>
          <Sel label="Cliente" value={clienteSel} onChange={e => setClienteSel(e.target.value)}>
            <option value="">Selecione...</option>
            {clientes.filter(c => c.status !== "pago").map(c => <option key={c.id} value={c.id}>{c.nome} — {fmt(c.totalDivida)}</option>)}
          </Sel>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Canal</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ k: "whatsapp", l: "WhatsApp", i: <Ic.whatsapp /> }, { k: "email", l: "E-mail", i: <Ic.email /> }].map(ch => (
                <button key={ch.k} onClick={() => setCanal(ch.k)} style={{ flex: 1, background: canal === ch.k ? "#EFF6FF" : "#F8FAFC", border: "2px solid " + (canal === ch.k ? "#1E40AF" : "#E2E8F0") + "", borderRadius: 10, padding: "9px 10px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13, fontWeight: 600, color: canal === ch.k ? "#1E40AF" : "#64748B" }}>{ch.i} {ch.l}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Template</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[{ k: "lembrete", l: "🔔 Lembrete" }, { k: "atraso", l: "⚠️ Atraso" }, { k: "ultimoAviso", l: "🚨 Último aviso" }, { k: "negociacao", l: "🤝 Negociação" }].map(t => (
                <button key={t.k} onClick={() => setTemplate(t.k)} style={{ background: template === t.k ? "#EFF6FF" : "#F8FAFC", border: "1.5px solid " + (template === t.k ? "#1E40AF" : "#E2E8F0") + "", borderRadius: 8, padding: "7px 10px", cursor: "pointer", fontSize: 12, fontWeight: 600, color: template === t.k ? "#1E40AF" : "#64748B" }}>{t.l}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5 }}>Mensagem</label>
            <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={5} style={{ width: "100%", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "10px 12px", fontSize: 13, outline: "none", background: "#F8FAFC", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.5 }} />
          </div>
          <Btn onClick={enviar} style={{ width: "100%", justifyContent: "center" }}>{enviando ? "Enviando..." : <><Ic.send /> Enviar Cobrança</>}</Btn>
        </div>
        <div style={{ background: "#ECF0F1", borderRadius: 16, padding: 20 }}>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>Preview WhatsApp</h3>
          <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
            <div style={{ background: "#075E54", padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 32, height: 32, background: "#25D366", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>{clienteSelecionado?.nome?.charAt(0) || "?"}</div>
              <div><div style={{ color: "#fff", fontWeight: 600, fontSize: 13 }}>{clienteSelecionado?.nome || "Selecione um cliente"}</div><div style={{ color: "#B2DFDB", fontSize: 10 }}>online</div></div>
            </div>
            <div style={{ background: "#E5DDD5", minHeight: 160, padding: 14 }}>
              {msg ? <div style={{ background: "#fff", borderRadius: "10px 10px 10px 0", padding: "10px 12px", maxWidth: "85%", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}><p style={{ margin: 0, fontSize: 12, color: "#0F172A", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{msg}</p><div style={{ fontSize: 10, color: "#94A3B8", textAlign: "right", marginTop: 4 }}>agora ✓✓</div></div>
              : <div style={{ textAlign: "center", paddingTop: 40, color: "#94A3B8", fontSize: 12 }}>Selecione um cliente para ver o preview</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Historico({ historico, setHistorico, clientes, setClientes }) {
  const get = (id) => clientes.find(c => c.id === id);
  const [toast, setToast] = useState(null);
  const [confirmando, setConfirmando] = useState(null);
  const [modalComprovante, setModalComprovante] = useState(null); // cliente que pagou
  const [modalRenegociar, setModalRenegociar] = useState(null); // cliente para renegociar
  const [novaData, setNovaData] = useState("");
  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const aguardando = historico.filter(h => {
    const c = get(h.clienteId);
    return c && c.status !== "pago" && h.status !== "pago_confirmado" && h.status !== "nao_pago";
  });

  const confirmarPagamento = (h) => {
    setConfirmando(h.id);
    setTimeout(() => {
      setHistorico(prev => prev.map(x => x.id === h.id ? { ...x, status: "pago_confirmado", dataPagamento: new Date().toLocaleString("pt-BR") } : x));
      setClientes(prev => prev.map(c => c.id === h.clienteId ? { ...c, status: "pago", parcelasPagas: c.parcelas, diasAtraso: 0 } : c));
      setConfirmando(null);
      // Abre modal de comprovante automaticamente
      const cliente = get(h.clienteId);
      if (cliente) setModalComprovante({ cliente, valor: cliente.totalDivida, data: new Date().toLocaleString("pt-BR") });
      showToast("✅ Pagamento confirmado!");
    }, 800);
  };

  const recusarPagamento = (id) => {
    setHistorico(prev => prev.map(x => x.id === id ? { ...x, status: "nao_pago" } : x));
    showToast("Marcado como não pago.", "error");
  };

  const renegociarDivida = () => {
    if (!novaData || !modalRenegociar) return;
    setClientes(prev => prev.map(c => c.id === modalRenegociar.id ? {
      ...c,
      vencimento: novaData,
      status: "pendente",
      diasAtraso: 0,
      renegociado: true,
    } : c));
    setHistorico(prev => [{
      id: Date.now(),
      clienteId: modalRenegociar.id,
      tipo: "whatsapp",
      data: new Date().toLocaleString("pt-BR"),
      mensagem: `Olá ${modalRenegociar.nome.split(" ")[0]}, confirmamos a renegociação da sua dívida de *${fmt(modalRenegociar.totalDivida)}*.\n\nNova data de vencimento: *${novaData}*.\n\nConte conosco! 🤝`,
      status: "entregue",
      tipoRenegociacao: true,
    }, ...prev]);
    showToast(`✅ Dívida de ${modalRenegociar.nome.split(" ")[0]} renegociada para ${novaData}`);
    setModalRenegociar(null);
    setNovaData("");
  };

  const enviarComprovante = (cliente, valor, data) => {
    showToast("📲 Comprovante enviado para " + (cliente.nome.split(" ")[0]) + "!");
    setModalComprovante(null);
  };

  return (
    <div>
      {toast && <ToastMsg {...toast} />}

      {/* Modal Comprovante */}
      {modalComprovante && (
        <Modal title="Comprovante de Pagamento" onClose={() => setModalComprovante(null)}>
          <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 14, padding: 20, marginBottom: 20 }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 800, fontSize: 18, color: "#0F172A" }}>Pagamento Confirmado</div>
              <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>{modalComprovante.data}</div>
            </div>
            <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid #D1FAE5" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>
                <span style={{ fontSize: 13, color: "#64748B" }}>Cliente</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{modalComprovante.cliente.nome}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>
                <span style={{ fontSize: 13, color: "#64748B" }}>Valor recebido</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: "#16A34A" }}>{fmt(modalComprovante.valor)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F1F5F9" }}>
                <span style={{ fontSize: 13, color: "#64748B" }}>Data/hora</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{modalComprovante.data}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                <span style={{ fontSize: 13, color: "#64748B" }}>Forma</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>Pix</span>
              </div>
            </div>
            <div style={{ fontSize: 12, color: "#16A34A", textAlign: "center", marginTop: 12, fontWeight: 600 }}>
              CobrarFácil · cobrarfacil.com.br
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: "#374151", fontWeight: 600, marginBottom: 8 }}>Deseja enviar comprovante para o cliente?</div>
            <div style={{ fontSize: 12, color: "#64748B", background: "#F8FAFC", borderRadius: 10, padding: "10px 14px", lineHeight: 1.6 }}>
              Uma mensagem de confirmação será enviada via WhatsApp para <strong>{modalComprovante.cliente.telefone}</strong>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="ghost" onClick={() => setModalComprovante(null)} style={{ flex: 1, justifyContent: "center" }}>
              Não enviar
            </Btn>
            <Btn variant="green" onClick={() => enviarComprovante(modalComprovante.cliente, modalComprovante.valor, modalComprovante.data)} style={{ flex: 1, justifyContent: "center" }}>
              📲 Enviar comprovante
            </Btn>
          </div>
        </Modal>
      )}

      {/* Modal Renegociar */}
      {modalRenegociar && (
        <Modal title="Renegociar Dívida" onClose={() => setModalRenegociar(null)}>
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: 14, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#1E40AF", marginBottom: 4 }}>📅 Rolando dívida de {modalRenegociar.nome}</div>
            <div style={{ fontSize: 13, color: "#3B82F6" }}>Valor: {fmt(modalRenegociar.totalDivida)} · Vencimento atual: {modalRenegociar.vencimento || "não definido"}</div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Nova data de vencimento *</label>
            <input type="date" value={novaData} onChange={e => setNovaData(e.target.value)}
              style={{ width: "100%", border: "2px solid #3B82F6", borderRadius: 10, padding: "12px 14px", fontSize: 15, outline: "none", boxSizing: "border-box", background: "#F8FAFC" }} />
          </div>
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "#92400E" }}>
            💡 O ciclo de cobranças automáticas será reiniciado a partir da nova data. O cliente receberá uma confirmação da renegociação.
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="ghost" onClick={() => { setModalRenegociar(null); setNovaData(""); }} style={{ flex: 1, justifyContent: "center" }}>Cancelar</Btn>
            <Btn onClick={renegociarDivida} disabled={!novaData} style={{ flex: 1, justifyContent: "center" }}>
              📅 Confirmar renegociação
            </Btn>
          </div>
        </Modal>
      )}

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0F172A" }}>Histórico de Cobranças</h1>
        <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 14 }}>{historico.length} mensagens enviadas</p>
      </div>

      {/* Aguardando confirmação */}
      {aguardando.length > 0 && (
        <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 16, padding: 20, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 20 }}>⏳</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#92400E" }}>Aguardando confirmação de pagamento</div>
              <div style={{ fontSize: 13, color: "#B45309" }}>{aguardando.length} cobrança(s) — o cliente pagou?</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {aguardando.map(h => {
              const c = get(h.clienteId);
              return (
                <div key={h.id} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid #FDE68A", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #DBEAFE, #BFDBFE)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#1E40AF" }}>{c?.nome?.charAt(0) || "?"}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{c?.nome || "—"}</div>
                      <div style={{ fontSize: 12, color: "#94A3B8" }}>{h.data}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#D97706" }}>{fmt(c?.totalDivida || 0)}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Btn small variant="ghost" onClick={() => c && setModalRenegociar(c)}>📅 Rolar dívida</Btn>
                    <Btn small variant="ghost" onClick={() => recusarPagamento(h.id)}>Não pagou</Btn>
                    <Btn small variant="green" onClick={() => confirmarPagamento(h)} disabled={confirmando === h.id}>
                      {confirmando === h.id ? "..." : <><Ic.check /> Pix recebido</>}
                    </Btn>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista histórico */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {historico.map(h => {
          const c = get(h.clienteId);
          const statusInfo = {
            entregue:        { bg: "#F0FDF4", color: "#16A34A", label: "✓ Entregue" },
            lido:            { bg: "#EFF6FF", color: "#1E40AF", label: "✓✓ Lido" },
            pago_confirmado: { bg: "#DCFCE7", color: "#15803D", label: "💰 Pago" },
            nao_pago:        { bg: "#FEF2F2", color: "#DC2626", label: "✗ Não pagou" },
          }[h.status] || { bg: "#F1F5F9", color: "#64748B", label: h.status };

          return (
            <div key={h.id} style={{ background: "#fff", borderRadius: 14, padding: "14px 18px", border: h.status === "pago_confirmado" ? "1px solid #86EFAC" : h.status === "nao_pago" ? "1px solid #FECACA" : "1px solid #F1F5F9" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ width: 34, height: 34, background: h.tipo === "whatsapp" ? "#F0FDF4" : "#EFF6FF", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: h.tipo === "whatsapp" ? "#16A34A" : "#1E40AF", flexShrink: 0 }}>
                    {h.tipo === "whatsapp" ? <Ic.whatsapp /> : <Ic.email />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{c?.nome || "—"}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 4 }}>
                      {h.data}{h.dataPagamento ? " · Pago: " + (h.dataPagamento) + "" : ""}
                      {h.tipoRenegociacao && <span style={{ marginLeft: 6, background: "#EFF6FF", color: "#1E40AF", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 99 }}>RENEGOCIADO</span>}
                    </div>
                    <div style={{ fontSize: 12, color: "#374151", background: "#F8FAFC", borderRadius: 8, padding: "6px 10px" }}>
                      {h.mensagem.substring(0, 90)}{h.mensagem.length > 90 ? "..." : ""}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <span style={{ background: statusInfo.bg, color: statusInfo.color, fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>
                    {statusInfo.label}
                  </span>
                  {h.status !== "pago_confirmado" && h.status !== "nao_pago" && c?.status !== "pago" && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => c && setModalRenegociar(c)} style={{ fontSize: 11, color: "#1E40AF", fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0 }}>📅 Rolar</button>
                      <button onClick={() => confirmarPagamento(h)} style={{ fontSize: 11, color: "#16A34A", fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0 }}>✓ Confirmar</button>
                    </div>
                  )}
                  {h.status === "pago_confirmado" && (
                    <button onClick={() => c && setModalComprovante({ cliente: c, valor: c.totalDivida, data: h.dataPagamento })}
                      style={{ fontSize: 11, color: "#16A34A", fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      📄 Ver comprovante
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {historico.length === 0 && <div style={{ textAlign: "center", padding: 60, color: "#94A3B8" }}><div style={{ fontSize: 40, marginBottom: 8 }}>📭</div><div style={{ fontWeight: 600 }}>Sem cobranças enviadas</div></div>}
      </div>
    </div>
  );
}

  // Cobranças aguardando confirmação = enviadas há mais de 0 dias e cliente ainda não pago
  const aguardando = historico.filter(h => {
    const c = get(h.clienteId);
    return c && c.status !== "pago" && h.status !== "pago_confirmado";
  });

  const confirmarPagamento = (h) => {
    setConfirmando(h.id);
    setTimeout(() => {
      // Marca o histórico como pago confirmado
      setHistorico(prev => prev.map(x => x.id === h.id ? { ...x, status: "pago_confirmado", dataPagamento: new Date().toLocaleString("pt-BR") } : x));
      // Marca o cliente como pago
      setClientes(prev => prev.map(c => c.id === h.clienteId ? { ...c, status: "pago", parcelasPagas: c.parcelas, diasAtraso: 0 } : c));
      setConfirmando(null);
      showToast("✅ Pagamento confirmado! Cliente atualizado.");
    }, 800);
  };

  const recusarPagamento = (id) => {
    setHistorico(prev => prev.map(x => x.id === id ? { ...x, status: "nao_pago" } : x));
    showToast("Marcado como não pago. Envie uma nova cobrança.", "error");
  };

  return (
    <div>
      {toast && <ToastMsg {...toast} />}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0F172A" }}>Histórico de Cobranças</h1>
        <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 14 }}>{historico.length} mensagens enviadas</p>
      </div>

      {/* Painel: aguardando confirmação */}
      {aguardando.length > 0 && (
        <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 16, padding: 20, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 20 }}>⏳</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#92400E" }}>Aguardando confirmação de pagamento</div>
              <div style={{ fontSize: 13, color: "#B45309" }}>{aguardando.length} cobrança(s) enviada(s) — o cliente pagou?</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {aguardando.map(h => {
              const c = get(h.clienteId);
              return (
                <div key={h.id} style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "1px solid #FDE68A", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #DBEAFE, #BFDBFE)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#1E40AF" }}>{c?.nome?.charAt(0) || "?"}</div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{c?.nome || "—"}</div>
                      <div style={{ fontSize: 12, color: "#94A3B8" }}>Cobrança enviada: {h.data}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#D97706", marginTop: 2 }}>{fmt(c?.totalDivida || 0)}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Btn small variant="green" onClick={() => confirmarPagamento(h)} disabled={confirmando === h.id}>
                      {confirmando === h.id ? "Salvando..." : <><Ic.check /> Pix recebido</>}
                    </Btn>
                    <Btn small variant="ghost" onClick={() => recusarPagamento(h.id)}>
                      Não pagou
                    </Btn>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista completa */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {historico.map(h => {
          const c = get(h.clienteId);
          const statusInfo = {
            entregue:        { bg: "#F0FDF4", color: "#16A34A", label: "✓ Entregue" },
            lido:            { bg: "#EFF6FF", color: "#1E40AF", label: "✓✓ Lido" },
            pago_confirmado: { bg: "#DCFCE7", color: "#15803D", label: "💰 Pago" },
            nao_pago:        { bg: "#FEF2F2", color: "#DC2626", label: "✗ Não pagou" },
          }[h.status] || { bg: "#F1F5F9", color: "#64748B", label: h.status };

          return (
            <div key={h.id} style={{ background: "#fff", borderRadius: 14, padding: "14px 18px", border: h.status === "pago_confirmado" ? "1px solid #86EFAC" : h.status === "nao_pago" ? "1px solid #FECACA" : "1px solid #F1F5F9" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ width: 34, height: 34, background: h.tipo === "whatsapp" ? "#F0FDF4" : "#EFF6FF", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: h.tipo === "whatsapp" ? "#16A34A" : "#1E40AF", flexShrink: 0 }}>
                    {h.tipo === "whatsapp" ? <Ic.whatsapp /> : <Ic.email />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{c?.nome || "—"}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 4 }}>
                      {h.data}{h.dataPagamento ? " · Pago em: " + (h.dataPagamento) + "" : ""}
                    </div>
                    <div style={{ fontSize: 12, color: "#374151", background: "#F8FAFC", borderRadius: 8, padding: "6px 10px" }}>
                      {h.mensagem.substring(0, 90)}{h.mensagem.length > 90 ? "..." : ""}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <span style={{ background: statusInfo.bg, color: statusInfo.color, fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>
                    {statusInfo.label}
                  </span>
                  {h.status !== "pago_confirmado" && h.status !== "nao_pago" && c?.status !== "pago" && (
                    <button onClick={() => confirmarPagamento(h)} style={{ fontSize: 11, color: "#16A34A", fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      + Confirmar pagamento
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {historico.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "#94A3B8" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
            <div style={{ fontWeight: 600 }}>Sem cobranças enviadas</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MINHA ASSINATURA (PAGAR.ME REAL) ────────────────────────────────────────
function MinhaAssinatura({ user }) {
  const [aba, setAba] = useState("mensalidade");
  const [plano, setPlano] = useState("pro");
  const [formaPag, setFormaPag] = useState("pix");
  const [dadosCartao, setDadosCartao] = useState({ numero: "", nome: "", validade: "", cvv: "" });
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const planos = {
    starter:    { nome: "Starter", valor: 4700,  label: "R$47/mês" },
    pro:        { nome: "Pro",     valor: 9700,  label: "R$97/mês" },
    enterprise: { nome: "Enterprise", valor: 29700, label: "R$297/mês" },
  };

  const pagar = async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch(BACKEND_URL + "/pagamento/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: user.name,
          email: user.email,
          cpf: user.cnpj,
          telefone: "(44) 99999-0000",
          plano: plano,
          forma_pagamento: formaPag,
        }),
      });
      const data = await res.json();
      if (data.sucesso) {
        setResultado(data.dados);
        showToast("✅ Pedido criado com sucesso!");
      } else {
        setErro(data.erro || "Erro ao processar pagamento");
        showToast("Erro: " + (data.erro || "tente novamente"), "error");
      }
    } catch (e) {
      setErro("Erro de conexão com o servidor");
      showToast("Erro de conexão", "error");
    }
    setLoading(false);
  };

  const pixData = resultado?.charges?.[0]?.last_transaction?.qr_code;
  const pixUrl = resultado?.charges?.[0]?.last_transaction?.qr_code_url;
  const status = resultado?.status;

  return (
    <div>
      {toast && <ToastMsg {...toast} />}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0F172A" }}>Minha Assinatura</h1>
        <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 14 }}>Gerencie seu plano e pagamentos — processado via Pagar.me (Stone)</p>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {[["mensalidade", "💳 Pagar mensalidade"], ["historico", "📋 Histórico"]].map(([k, l]) => (
          <button key={k} onClick={() => setAba(k)} style={{ background: aba === k ? "#1E40AF" : "#F1F5F9", color: aba === k ? "#fff" : "#64748B", border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{l}</button>
        ))}
      </div>

      {aba === "mensalidade" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Selecionar plano */}
          <div style={{ background: "#fff", borderRadius: 16, padding: 22, border: "1px solid #F1F5F9" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>Selecione seu plano</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              {Object.entries(planos).map(([k, p]) => (
                <div key={k} onClick={() => setPlano(k)}
                  style={{ border: "2px solid " + (plano === k ? "#1E40AF" : "#E2E8F0"), borderRadius: 12, padding: "14px", textAlign: "center", cursor: "pointer", background: plano === k ? "#EFF6FF" : "#F8FAFC" }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: plano === k ? "#1E40AF" : "#0F172A" }}>{p.nome}</div>
                  <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>{p.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Forma de pagamento */}
          <div style={{ background: "#fff", borderRadius: 16, padding: 22, border: "1px solid #F1F5F9" }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>Forma de pagamento</h3>
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              {[["pix", "💠 Pix"], ["cartao", "💳 Cartão"]].map(([k, l]) => (
                <button key={k} onClick={() => setFormaPag(k)}
                  style={{ flex: 1, background: formaPag === k ? "#1E40AF" : "#F1F5F9", color: formaPag === k ? "#fff" : "#64748B", border: "none", borderRadius: 10, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{l}</button>
              ))}
            </div>

            {formaPag === "cartao" && (
              <div>
                <Inp label="Número do cartão" value={dadosCartao.numero} onChange={e => setDadosCartao(p => ({ ...p, numero: e.target.value }))} placeholder="0000 0000 0000 0000" />
                <Inp label="Nome no cartão" value={dadosCartao.nome} onChange={e => setDadosCartao(p => ({ ...p, nome: e.target.value }))} placeholder="NOME SOBRENOME" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Inp label="Validade" value={dadosCartao.validade} onChange={e => setDadosCartao(p => ({ ...p, validade: e.target.value }))} placeholder="MM/AA" />
                  <Inp label="CVV" value={dadosCartao.cvv} onChange={e => setDadosCartao(p => ({ ...p, cvv: e.target.value }))} placeholder="123" />
                </div>
              </div>
            )}

            {formaPag === "pix" && (
              <div style={{ background: "#F0FDF4", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#166534", fontWeight: 600 }}>
                💠 Aprovação imediata. O QR Code será gerado ao confirmar.
              </div>
            )}
          </div>

          {/* Resultado do pagamento */}
          {resultado && (
            <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 16, padding: 22 }}>
              <div style={{ fontWeight: 800, fontSize: 16, color: "#166534", marginBottom: 12 }}>✅ Pedido criado com sucesso!</div>
              <div style={{ fontSize: 13, color: "#374151", marginBottom: 8 }}>ID: <strong>{resultado.id}</strong></div>
              <div style={{ fontSize: 13, color: "#374151", marginBottom: 8 }}>Status: <strong>{status}</strong></div>
              {pixData && (
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>Código Pix (copia e cola):</div>
                  <div style={{ background: "#fff", borderRadius: 8, padding: "10px 14px", fontFamily: "monospace", fontSize: 11, wordBreak: "break-all", border: "1px solid #E2E8F0", marginBottom: 10 }}>{pixData}</div>
                  {pixUrl && <a href={pixUrl} target="_blank" rel="noreferrer" style={{ color: "#1E40AF", fontWeight: 700, fontSize: 13 }}>🔗 Ver QR Code completo</a>}
                </div>
              )}
            </div>
          )}

          {erro && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: 16, fontSize: 14, color: "#DC2626", fontWeight: 600 }}>
              ❌ {erro}
            </div>
          )}

          <div style={{ background: "#fff", borderRadius: 16, padding: 22, border: "1px solid #F1F5F9" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 13, color: "#64748B" }}>Total a pagar</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: "#0F172A" }}>{(planos[plano].valor / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
              </div>
              <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "6px 12px", fontSize: 12, color: "#1E40AF", fontWeight: 700 }}>Plano {planos[plano].nome}</div>
            </div>
            <Btn onClick={pagar} disabled={loading} style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "14px" }}>
              {loading ? "Processando..." : formaPag === "pix" ? "💠 Gerar Pix agora" : "💳 Pagar com cartão"}
            </Btn>
            <div style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", marginTop: 10 }}>🔒 Pagamento seguro via Pagar.me (Stone)</div>
          </div>
        </div>
      )}

      {aba === "historico" && (
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #F1F5F9", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", background: "#F8FAFC", borderBottom: "1px solid #F1F5F9" }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Histórico de Pagamentos</h3>
          </div>
          {[
            { mes: "Junho/2026", valor: 97, status: "pago", data: "24/06/2026", forma: "Pix" },
            { mes: "Maio/2026", valor: 97, status: "pago", data: "24/05/2026", forma: "Cartão" },
          ].map((h, i) => (
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
    </div>
  );
}

function Configuracoes({ user, pixKey, setPixKey, nomeCobranca, setNomeCobranca }) {
  const [saved, setSaved] = useState(false);
  const [pixInput, setPixInput] = useState(pixKey || "");
  const [pixTipo, setPixTipo] = useState("telefone");
  const [pixSalvo, setPixSalvo] = useState(!!pixKey);
  const [nomeInput, setNomeInput] = useState(nomeCobranca || user.business);
  const [toggles, setToggles] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cobrarfacil_toggles")) || { t0: true, t1: true, t2: false, t3: true }; } catch { return { t0: true, t1: true, t2: false, t3: true }; }
  });
  const salvarToggle = (k) => {
    const next = { ...toggles, [k]: !toggles[k] };
    try { localStorage.setItem("cobrarfacil_toggles", JSON.stringify(next)); } catch {}
    setToggles(next);
  };

  const tiposLabel = { telefone: "📱 Telefone", cpf: "🪪 CPF/CNPJ", email: "✉️ E-mail", aleatoria: "🔑 Chave aleatória" };
  const placeholders = { telefone: "(44) 99999-0000", cpf: "000.000.000-00", email: "seu@email.com", aleatoria: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" };

  const salvarPix = () => {
    if (!pixInput.trim()) return;
    setPixKey(pixInput.trim());
    setPixSalvo(true);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const salvarNome = () => {
    if (!nomeInput.trim()) return;
    try { localStorage.setItem("cobrarfacil_nome_cobranca", nomeInput.trim()); } catch {}
    setNomeCobranca(nomeInput.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h1 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 800, color: "#0F172A" }}>Configurações</h1>
      <div style={{ display: "grid", gap: 18, maxWidth: 580 }}>

        {/* ── BLOCO NOME NA COBRANÇA ── */}
        <div style={{ borderRadius: 16, border: "2px solid #E0E7FF", background: "#EEF2FF", padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ fontSize: 26 }}>🏪</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A" }}>Nome da empresa nas cobranças</div>
              <div style={{ fontSize: 13, color: "#6366F1" }}>Esse nome aparece nas mensagens enviadas aos devedores — não "CobrarFácil"</div>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Nome que aparecerá nas mensagens *</label>
            <input
              value={nomeInput}
              onChange={e => setNomeInput(e.target.value)}
              placeholder="Ex: Look Up Store, Moda Feminina da Ana..."
              style={{ width: "100%", border: "2px solid #6366F1", borderRadius: 10, padding: "12px 16px", fontSize: 15, color: "#0F172A", outline: "none", boxSizing: "border-box", background: "#fff" }}
            />
          </div>
          {/* Preview da mensagem */}
          <div style={{ background: "#fff", borderRadius: 10, padding: "12px 14px", border: "1px solid #C7D2FE", marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: "#6366F1", fontWeight: 700, marginBottom: 6 }}>PREVIEW — COMO FICARÁ NA MENSAGEM</div>
            <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
              {`Olá João 😊\n\nA *${nomeInput || "sua empresa"}* identificou uma parcela em aberto de *R$ 300,00* com vencimento em *30/06/2026*.\n\nPague via Pix:\n💳 Pix: *${pixKey || "(configure sua chave Pix)"}*\n\nQualquer dúvida, fale conosco! 🙏`}
            </div>
          </div>
          <Btn onClick={salvarNome} disabled={!nomeInput.trim()}>
            🏪 Salvar nome da empresa
          </Btn>
          {nomeCobranca && <span style={{ marginLeft: 12, fontSize: 13, color: "#16A34A", fontWeight: 600 }}>✅ {nomeCobranca}</span>}
        </div>

        {/* ── BLOCO PIX ── */}
        <div style={{ borderRadius: 16, border: pixSalvo ? "2px solid #22C55E" : "2px dashed #93C5FD", background: pixSalvo ? "#F0FDF4" : "#EFF6FF", padding: 22, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ fontSize: 28 }}>⚡</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A" }}>Chave Pix para recebimento</div>
              <div style={{ fontSize: 13, color: "#64748B" }}>Inserida automaticamente nas mensagens de cobrança</div>
            </div>
            {pixSalvo && <span style={{ marginLeft: "auto", background: "#16A34A", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>✓ Configurado</span>}
          </div>

          {pixSalvo ? (
            <div style={{ marginTop: 16 }}>
              <div style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", border: "1px solid #86EFAC", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600, marginBottom: 3 }}>CHAVE CADASTRADA</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", fontFamily: "monospace" }}>{pixKey}</div>
                </div>
                <Btn small variant="ghost" onClick={() => { setPixSalvo(false); setPixInput(pixKey); }}>✏️ Alterar</Btn>
              </div>
              <div style={{ marginTop: 12, background: "#fff", borderRadius: 10, padding: "10px 14px", border: "1px solid #D1FAE5" }}>
                <div style={{ fontSize: 12, color: "#065F46", fontWeight: 600, marginBottom: 4 }}>COMO APARECE NA COBRANÇA</div>
                <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6 }}>
                  <em>{"👉 Pix: "}<strong>{pixKey}</strong>{" | Valor: R$ [valor da dívida]"}</em>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Tipo de chave Pix</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {Object.entries(tiposLabel).map(([k, v]) => (
                    <button key={k} onClick={() => { setPixTipo(k); setPixInput(""); }}
                      style={{ background: pixTipo === k ? "#1E40AF" : "#fff", color: pixTipo === k ? "#fff" : "#374151", border: "1.5px solid " + (pixTipo === k ? "#1E40AF" : "#E2E8F0") + "", borderRadius: 10, padding: "9px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600, textAlign: "center" }}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Chave Pix ({tiposLabel[pixTipo]})</label>
                <input
                  value={pixInput}
                  onChange={e => setPixInput(e.target.value)}
                  placeholder={placeholders[pixTipo]}
                  style={{ width: "100%", border: "2px solid #3B82F6", borderRadius: 10, padding: "12px 16px", fontSize: 15, color: "#0F172A", outline: "none", boxSizing: "border-box", background: "#fff", fontFamily: pixTipo === "aleatoria" ? "monospace" : "inherit" }}
                />
              </div>
              <Btn onClick={salvarPix} disabled={!pixInput.trim()} style={{ width: "100%", justifyContent: "center", fontSize: 15 }}>
                ⚡ Salvar chave Pix
              </Btn>
              {!pixInput && <div style={{ fontSize: 12, color: "#64748B", textAlign: "center", marginTop: 8 }}>Sem chave Pix, as cobranças ficam sem link de pagamento</div>}
            </div>
          )}
        </div>

        <div style={{ background: "#fff", borderRadius: 16, padding: 22, border: "1px solid #F1F5F9" }}>
          <h3 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 700 }}>Meu Perfil</h3>
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 18 }}>
            <div style={{ width: 50, height: 50, background: "linear-gradient(135deg, #1E40AF, #3B82F6)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>{user.avatar}</div>
            <div><div style={{ fontWeight: 700, fontSize: 15 }}>{user.name}</div><div style={{ fontSize: 13, color: "#64748B" }}>{user.business}</div><span style={{ background: "#EFF6FF", color: "#1E40AF", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>Plano {user.plan}</span></div>
          </div>
          <Inp label="Nome" defaultValue={user.name} />
          <Inp label="Empresa" defaultValue={user.business} />
          <Inp label="CNPJ" defaultValue={user.cnpj} />
          <Inp label="E-mail" defaultValue={user.email} type="email" />
          <Btn onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }}>{saved ? "✅ Salvo!" : "Salvar"}</Btn>
        </div>
        <div style={{ background: "#fff", borderRadius: 16, padding: 22, border: "1px solid #F1F5F9" }}>
          <h3 style={{ margin: "0 0 18px", fontSize: 15, fontWeight: 700 }}>Automações</h3>
          {[["t0", "Lembrete 3 dias antes do vencimento", "WhatsApp automático"], ["t1", "Cobrança no dia do vencimento", "Mensagem no dia exato"], ["t2", "Cobrança após 7 dias de atraso", "Tom mais urgente"], ["t3", "Relatório semanal por e-mail", "Toda segunda-feira"]].map(([k, lbl, desc], i, arr) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: i < arr.length - 1 ? "1px solid #F1F5F9" : "none" }}>
              <div><div style={{ fontWeight: 600, fontSize: 14 }}>{lbl}</div><div style={{ fontSize: 12, color: "#94A3B8" }}>{desc}</div></div>
              <div onClick={() => salvarToggle(k)} style={{ width: 44, height: 24, background: toggles[k] ? "#1E40AF" : "#E2E8F0", borderRadius: 99, position: "relative", cursor: "pointer", flexShrink: 0, transition: "background 0.2s" }}>
                <div style={{ width: 18, height: 18, background: "#fff", borderRadius: "50%", position: "absolute", top: 3, left: toggles[k] ? 23 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: "linear-gradient(135deg, #0F172A, #1E40AF)", borderRadius: 16, padding: 22 }}>
          <div style={{ color: "#93C5FD", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>PLANO ATUAL</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 8 }}>Pro — R$97/mês</div>
          <div style={{ color: "#BFDBFE", fontSize: 13, marginBottom: 14 }}>✅ Ilimitado · ✅ WhatsApp · ✅ Importação · ✅ Negativação · ✅ Relatórios</div>
          <Btn variant="ghost">Gerenciar assinatura</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── DADOS SIMULADOS DO ADMIN ─────────────────────────────────────────────
const ADMIN_LOJISTAS = [
  { id: 1, nome: "Look Up Store", email: "tiago@lookupmoda.com.br", plano: "Pro", status: "ativo", clientes: 6, mrr: 97, vencimento: "2026-07-24", pagamento: "Pix", inadimplente: false, cadastro: "2026-01-10" },
  { id: 2, nome: "Moda Feminina da Ana", email: "ana@modafeminina.com.br", plano: "Pro", status: "ativo", clientes: 23, mrr: 97, vencimento: "2026-07-15", pagamento: "Cartão", inadimplente: false, cadastro: "2026-02-03" },
  { id: 3, nome: "Calçados Mendes", email: "carlos@calcadosmendes.com.br", plano: "Starter", status: "ativo", clientes: 8, mrr: 47, vencimento: "2026-07-20", pagamento: "Boleto", inadimplente: false, cadastro: "2026-03-15" },
  { id: 4, nome: "Pedro Eletro", email: "pedro@pedroeletro.com.br", plano: "Pro", status: "inadimplente", clientes: 14, mrr: 97, vencimento: "2026-06-10", pagamento: "Pix", inadimplente: true, cadastro: "2026-02-28" },
  { id: 5, nome: "Farmácia Bem Estar", email: "farma@bemestar.com.br", plano: "Pro", status: "ativo", clientes: 41, mrr: 97, vencimento: "2026-07-05", pagamento: "Cartão", inadimplente: false, cadastro: "2026-01-22" },
  { id: 6, nome: "Supermercado Vitória", email: "vitoria@mercado.com.br", plano: "Enterprise", status: "ativo", clientes: 187, mrr: 297, vencimento: "2026-07-01", pagamento: "Boleto", inadimplente: false, cadastro: "2025-12-05" },
  { id: 7, nome: "Ótica Visão Clara", email: "visao@otica.com.br", plano: "Starter", status: "cancelado", clientes: 3, mrr: 0, vencimento: "—", pagamento: "—", inadimplente: false, cadastro: "2026-03-01" },
];

function AdminPanel({ onLogout }) {
  const [aba, setAba] = useState("overview");
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  const ativos = ADMIN_LOJISTAS.filter(l => l.status === "ativo");
  const inadimplentes = ADMIN_LOJISTAS.filter(l => l.inadimplente);
  const cancelados = ADMIN_LOJISTAS.filter(l => l.status === "cancelado");
  const mrr = ADMIN_LOJISTAS.filter(l => l.status === "ativo").reduce((a, l) => a + l.mrr, 0);
  const arr = mrr * 12;
  const totalClientes = ADMIN_LOJISTAS.reduce((a, l) => a + l.clientes, 0);

  const filtrados = ADMIN_LOJISTAS.filter(l => {
    const ok = filtroStatus === "todos" || l.status === filtroStatus;
    const bOk = l.nome.toLowerCase().includes(busca.toLowerCase()) || l.email.toLowerCase().includes(busca.toLowerCase());
    return ok && bOk;
  });

  const planos = [
    { nome: "Starter", preco: "R$47", count: ADMIN_LOJISTAS.filter(l => l.plano === "Starter" && l.status === "ativo").length },
    { nome: "Pro", preco: "R$97", count: ADMIN_LOJISTAS.filter(l => l.plano === "Pro" && l.status === "ativo").length },
    { nome: "Enterprise", preco: "R$297", count: ADMIN_LOJISTAS.filter(l => l.plano === "Enterprise" && l.status === "ativo").length },
  ];

  const statusBadge = {
    ativo:        { bg: "#DCFCE7", color: "#16A34A", label: "✅ Ativo" },
    inadimplente: { bg: "#FEF3C7", color: "#D97706", label: "⚠️ Inadimplente" },
    cancelado:    { bg: "#FEE2E2", color: "#DC2626", label: "❌ Cancelado" },
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0F172A", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Header Admin */}
      <div style={{ background: "#1E293B", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #22C55E, #0D9488)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff" }}>C$</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>CobrarFácil Admin</div>
              <div style={{ fontSize: 11, color: "#64748B" }}>Painel Gerencial — Tiago Cabral</div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ background: "#16A34A", color: "#fff", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 99 }}>MRR: {fmt(mrr)}</div>
          <Btn small variant="ghost" onClick={onLogout}>Sair</Btn>
        </div>
      </div>

      <div style={{ padding: 28 }}>
        {/* Abas */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
          {[["overview", "📊 Visão Geral"], ["lojistas", "🏪 Clientes"], ["financeiro", "💰 Financeiro"], ["planos", "📦 Planos"]].map(([k, l]) => (
            <button key={k} onClick={() => setAba(k)} style={{ background: aba === k ? "#1E40AF" : "#1E293B", color: aba === k ? "#fff" : "#64748B", border: "1px solid " + (aba === k ? "#1E40AF" : "#334155") + "", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{l}</button>
          ))}
        </div>

        {/* ABA: VISÃO GERAL */}
        {aba === "overview" && (
          <div>
            {/* Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 24 }}>
              {[
                { label: "MRR", value: fmt(mrr), sub: "Receita mensal recorrente", color: "#22C55E", bg: "#052e16" },
                { label: "ARR", value: fmt(arr), sub: "Projeção anual", color: "#3B82F6", bg: "#0c1a3a" },
                { label: "Clientes ativos", value: ativos.length, sub: "" + (cancelados.length) + " cancelados", color: "#A78BFA", bg: "#1a0a3a" },
                { label: "Inadimplentes", value: inadimplentes.length, sub: fmt(inadimplentes.reduce((a, l) => a + l.mrr, 0)) + " em risco", color: "#F59E0B", bg: "#2a1a00" },
                { label: "Total devedores", value: totalClientes, sub: "Nos sistemas dos clientes", color: "#94A3B8", bg: "#1a2234" },
              ].map(c => (
                <div key={c.label} style={{ background: c.bg, borderRadius: 14, padding: 18, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: c.color, marginBottom: 4 }}>{c.value}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0" }}>{c.label}</div>
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 3 }}>{c.sub}</div>
                </div>
              ))}
            </div>

            {/* Inadimplentes */}
            {inadimplentes.length > 0 && (
              <div style={{ background: "#2A1600", border: "1px solid #D97706", borderRadius: 14, padding: 18, marginBottom: 20 }}>
                <div style={{ fontWeight: 700, color: "#F59E0B", fontSize: 15, marginBottom: 12 }}>⚠️ Clientes inadimplentes com CobrarFácil</div>
                {inadimplentes.map(l => (
                  <div key={l.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(245,158,11,0.15)" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#FDE68A" }}>{l.nome}</div>
                      <div style={{ fontSize: 12, color: "#D97706" }}>{l.email} · Venceu em {l.vencimento}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 800, color: "#F59E0B" }}>{fmt(l.mrr)}/mês</div>
                      <div style={{ fontSize: 11, color: "#D97706" }}>Plano {l.plano}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Distribuição por plano */}
            <div style={{ background: "#1E293B", borderRadius: 14, padding: 20, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontWeight: 700, color: "#E2E8F0", fontSize: 14, marginBottom: 14 }}>Distribuição por plano</div>
              <div style={{ display: "flex", gap: 12 }}>
                {planos.map(p => (
                  <div key={p.nome} style={{ flex: 1, background: "#0F172A", borderRadius: 10, padding: 14, textAlign: "center" }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: "#60A5FA" }}>{p.count}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0" }}>{p.nome}</div>
                    <div style={{ fontSize: 11, color: "#64748B" }}>{p.preco}/mês</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ABA: LOJISTAS */}
        {aba === "lojistas" && (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <input placeholder="🔍 Buscar cliente..." value={busca} onChange={e => setBusca(e.target.value)}
                style={{ flex: 1, minWidth: 200, background: "#1E293B", border: "1px solid #334155", borderRadius: 10, padding: "9px 14px", fontSize: 14, color: "#E2E8F0", outline: "none" }} />
              {["todos", "ativo", "inadimplente", "cancelado"].map(s => (
                <button key={s} onClick={() => setFiltroStatus(s)} style={{ background: filtroStatus === s ? "#1E40AF" : "#1E293B", color: filtroStatus === s ? "#fff" : "#64748B", border: "1px solid " + (filtroStatus === s ? "#1E40AF" : "#334155") + "", borderRadius: 10, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{s === "todos" ? "Todos" : s}</button>
              ))}
            </div>
            <div style={{ background: "#1E293B", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#0F172A" }}>
                    {["Negócio", "Plano", "Clientes", "MRR", "Vencimento", "Pagamento", "Status", "Cadastro"].map(h => (
                      <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontWeight: 700, color: "#64748B", borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((l, i) => {
                    const s = statusBadge[l.status];
                    return (
                      <tr key={l.id} style={{ background: i % 2 === 0 ? "#1E293B" : "#1a2538" }}>
                        <td style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <div style={{ fontWeight: 700, color: "#E2E8F0" }}>{l.nome}</div>
                          <div style={{ fontSize: 11, color: "#64748B" }}>{l.email}</div>
                        </td>
                        <td style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <span style={{ background: l.plano === "Enterprise" ? "#1a0a3a" : l.plano === "Pro" ? "#0c1a3a" : "#1a2a0a", color: l.plano === "Enterprise" ? "#A78BFA" : l.plano === "Pro" ? "#60A5FA" : "#86EFAC", fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>{l.plano}</span>
                        </td>
                        <td style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", color: "#94A3B8", textAlign: "center" }}>{l.clientes}</td>
                        <td style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", fontWeight: 700, color: l.mrr > 0 ? "#22C55E" : "#64748B" }}>{l.mrr > 0 ? fmt(l.mrr) : "—"}</td>
                        <td style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", color: l.inadimplente ? "#F59E0B" : "#94A3B8", fontWeight: l.inadimplente ? 700 : 400 }}>{l.vencimento}</td>
                        <td style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", color: "#94A3B8" }}>{l.pagamento}</td>
                        <td style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                          <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 99 }}>{s.label}</span>
                        </td>
                        <td style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", color: "#64748B", fontSize: 12 }}>{l.cadastro}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA: FINANCEIRO */}
        {aba === "financeiro" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              {[
                { label: "Receita do mês atual", value: fmt(mrr), sub: "" + (ativos.length) + " clientes ativos", color: "#22C55E" },
                { label: "A receber este mês", value: fmt(mrr - inadimplentes.reduce((a, l) => a + l.mrr, 0)), sub: "Excluindo inadimplentes", color: "#3B82F6" },
                { label: "Em risco (inadimplentes)", value: fmt(inadimplentes.reduce((a, l) => a + l.mrr, 0)), sub: "" + (inadimplentes.length) + " cliente(s)", color: "#F59E0B" },
                { label: "Perdido (cancelados)", value: fmt(cancelados.length * 97), sub: "" + (cancelados.length) + " cancelado(s)", color: "#EF4444" },
              ].map(c => (
                <div key={c.label} style={{ background: "#1E293B", borderRadius: 14, padding: 20, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600, marginBottom: 4 }}>{c.label.toUpperCase()}</div>
                  <div style={{ fontSize: 26, fontWeight: 800, color: c.color }}>{c.value}</div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>{c.sub}</div>
                </div>
              ))}
            </div>

            {/* Últimas transações simuladas */}
            <div style={{ background: "#1E293B", borderRadius: 14, padding: 20, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontWeight: 700, color: "#E2E8F0", fontSize: 14, marginBottom: 14 }}>Últimos recebimentos</div>
              {[
                { nome: "Farmácia Bem Estar", valor: 97, data: "24/06/2026", forma: "Cartão", status: "pago" },
                { nome: "Look Up Store", valor: 97, data: "24/06/2026", forma: "Pix", status: "pago" },
                { nome: "Supermercado Vitória", valor: 297, data: "23/06/2026", forma: "Boleto", status: "pago" },
                { nome: "Moda Feminina da Ana", valor: 97, data: "20/06/2026", forma: "Cartão", status: "pago" },
                { nome: "Pedro Eletro", valor: 97, data: "10/06/2026", forma: "Pix", status: "pendente" },
              ].map((t, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "#E2E8F0", fontSize: 13 }}>{t.nome}</div>
                    <div style={{ fontSize: 11, color: "#64748B" }}>{t.data} · {t.forma}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800, color: t.status === "pago" ? "#22C55E" : "#F59E0B", fontSize: 15 }}>{fmt(t.valor)}</div>
                    <div style={{ fontSize: 11, color: t.status === "pago" ? "#16A34A" : "#D97706", fontWeight: 600 }}>{t.status === "pago" ? "✅ Pago" : "⏳ Pendente"}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA: PLANOS */}
        {aba === "planos" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
            {[
              { nome: "Starter", preco: 47, cor: "#86EFAC", bg: "#052e16", features: ["Até 50 clientes", "WhatsApp manual", "Importação CSV", "Régua básica (3 etapas)", "Suporte por e-mail"] },
              { nome: "Pro", preco: 97, cor: "#60A5FA", bg: "#0c1a3a", features: ["Clientes ilimitados", "WhatsApp automático", "Importação CSV/Excel", "Régua completa (5 etapas)", "Negativação Serasa/SPC", "Relatórios avançados", "Suporte prioritário"], destaque: true },
              { nome: "Enterprise", preco: 297, cor: "#A78BFA", bg: "#1a0a3a", features: ["Tudo do Pro", "Multi-usuário (até 5)", "API de integração", "Onboarding dedicado", "SLA garantido", "Gerente de conta"] },
            ].map(p => (
              <div key={p.nome} style={{ background: p.bg, borderRadius: 16, padding: 24, border: "2px solid " + (p.destaque ? p.cor : "rgba(255,255,255,0.08)") + "", position: "relative" }}>
                {p.destaque && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: "#1E40AF", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 99 }}>MAIS POPULAR</div>}
                <div style={{ fontSize: 14, fontWeight: 700, color: p.cor, marginBottom: 4 }}>{p.nome}</div>
                <div style={{ fontSize: 30, fontWeight: 800, color: "#fff", marginBottom: 4 }}>{fmt(p.preco)}<span style={{ fontSize: 13, fontWeight: 400, color: "#64748B" }}>/mês</span></div>
                <div style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>
                  {ADMIN_LOJISTAS.filter(l => l.plano === p.nome && l.status === "ativo").length} cliente(s) ativo(s)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {p.features.map(f => <div key={f} style={{ fontSize: 13, color: "#CBD5E1", display: "flex", gap: 8 }}><span style={{ color: p.cor }}>✓</span>{f}</div>)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CobrarFacil() {
  const [logado, setLogado] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [tela, setTela] = useState("dashboard");
  const [clientes, setClientes] = useState(DB.clientes);
  const [historico, setHistorico] = useState(DB.historico);
  const [clienteParaCobrar, setClienteParaCobrar] = useState(null);
  const [pixKey, setPixKey] = useState(() => {
    try { return localStorage.getItem("cobrarfacil_pix") || ""; } catch { return ""; }
  });
  const [nomeCobranca, setNomeCobranca] = useState(() => {
    try { return localStorage.getItem("cobrarfacil_nome_cobranca") || DB.user.business; } catch { return DB.user.business; }
  });

  const salvarPixKey = (key) => {
    try { localStorage.setItem("cobrarfacil_pix", key); } catch {}
    setPixKey(key);
  };

  if (!logado) return <LoginScreen onLogin={(admin) => { setLogado(true); setIsAdmin(!!admin); }} />;
  if (isAdmin) return <AdminPanel onLogout={() => { setLogado(false); setIsAdmin(false); }} />;

  const irParaCobranca = (c) => { setClienteParaCobrar(c); setTela("cobrancas"); };
  const nav = [
    { key: "dashboard",   label: "Painel",      icon: <Ic.dash /> },
    { key: "clientes",    label: "Clientes",    icon: <Ic.clients /> },
    { key: "regua",       label: "Régua",       icon: <Ic.approve /> },
    { key: "recuperacao", label: "Recuperação", icon: <Ic.recover /> },
    { key: "cobrancas",   label: "Cobranças",   icon: <Ic.charge /> },
    { key: "historico",   label: "Histórico",   icon: <Ic.history /> },
    { key: "importar",    label: "Importar",    icon: <Ic.upload /> },
    { key: "negativacao", label: "Negativação", icon: <Ic.negat /> },
    { key: "assinatura",  label: "Minha Conta", icon: <Ic.credit /> },
    { key: "config",      label: "Config.",     icon: <Ic.settings /> },
  ];
  const atrasadosCount = clientes.filter(c => c.status === "atrasado").length;
  const suspensoCount = clientes.filter(c => c.suspenso && c.status !== "pago").length;
  const antigasCount = clientes.filter(c => c.status !== "pago" && c.diasAtraso >= 90).length;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {menuAberto && <div onClick={() => setMenuAberto(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99 }} />}
      <div style={{ width: 220, background: "#0F172A", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: menuAberto ? 0 : "var(--sidebar-left, 0)", bottom: 0, zIndex: 100, transition: "left 0.25s" }}>
        <div style={{ padding: "18px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, background: "linear-gradient(135deg, #22C55E, #0D9488)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff" }}>C$</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: -0.5 }}>CobrarFácil</div>
              <div style={{ fontSize: 10, color: "#475569" }}>SISTEMA DE COBRANÇA</div>
            </div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "14px 10px", overflowY: "auto" }}>
          {nav.map(n => (
            <button key={n.key} onClick={() => { setTela(n.key); setMenuAberto(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer", marginBottom: 3, background: tela === n.key ? "rgba(59,130,246,0.15)" : "transparent", color: tela === n.key ? "#60A5FA" : "#64748B", fontSize: 13, fontWeight: tela === n.key ? 700 : 500, textAlign: "left" }}>
              {n.icon} {n.label}
              {n.key === "clientes" && atrasadosCount > 0 && <span style={{ marginLeft: "auto", background: "#DC2626", color: "#fff", borderRadius: 99, fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>{atrasadosCount}</span>}
              {n.key === "regua" && suspensoCount > 0 && <span style={{ marginLeft: "auto", background: "#D97706", color: "#fff", borderRadius: 99, fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>{suspensoCount}⏸</span>}
              {n.key === "recuperacao" && antigasCount > 0 && <span style={{ marginLeft: "auto", background: "#7C3AED", color: "#fff", borderRadius: 99, fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>{antigasCount}</span>}
              {n.key === "negativacao" && <span style={{ marginLeft: "auto", background: "#EA580C", color: "#fff", borderRadius: 99, fontSize: 9, fontWeight: 700, padding: "1px 5px" }}>NOVO</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #1E40AF, #3B82F6)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff" }}>{DB.user.avatar}</div>
            <div><div style={{ fontSize: 12, fontWeight: 700, color: "#E2E8F0" }}>{DB.user.name}</div><div style={{ fontSize: 10, color: "#475569" }}>Plano Pro</div></div>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, marginLeft: "min(220px, 30vw)", minWidth: 0 }}>
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
            {atrasadosCount > 0 && <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#FEF2F2", color: "#DC2626", padding: "5px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700 }}><Ic.bell /> {atrasadosCount}</div>}
            <div style={{ width: 34, height: 34, background: "linear-gradient(135deg, #1E40AF, #3B82F6)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff" }}>{DB.user.avatar}</div>
          </div>
        </div>
        <div style={{ padding: "20px 16px" }}>
          {tela === "dashboard"    && <Dashboard clientes={clientes} />}
          {tela === "clientes"     && <Clientes clientes={clientes} setClientes={setClientes} onCobranca={irParaCobranca} />}
          {tela === "regua"        && <Regua clientes={clientes} setClientes={setClientes} setTela={setTela} nomeCobranca={nomeCobranca} />}
          {tela === "recuperacao"  && <Recuperacao clientes={clientes} setClientes={setClientes} historico={historico} setHistorico={setHistorico} pixKey={pixKey} nomeCobranca={nomeCobranca} setTela={setTela} />}
          {tela === "cobrancas"    && <Cobrancas clientes={clientes} historico={historico} setHistorico={setHistorico} clientePreSelecionado={clienteParaCobrar} setClientePreSelecionado={setClienteParaCobrar} pixKey={pixKey} setTela={setTela} nomeCobranca={nomeCobranca} />}
          {tela === "historico"    && <Historico historico={historico} setHistorico={setHistorico} clientes={clientes} setClientes={setClientes} />}
          {tela === "importar"     && <ImportarPlanilha setClientes={setClientes} setTela={setTela} />}
          {tela === "negativacao"  && <Negativacao clientes={clientes} user={DB.user} />}
          {tela === "assinatura"   && <MinhaAssinatura user={DB.user} />}
          {tela === "config"       && <Configuracoes user={DB.user} pixKey={pixKey} setPixKey={salvarPixKey} nomeCobranca={nomeCobranca} setNomeCobranca={setNomeCobranca} />}
        </div>
      </div>
    </div>
  );
}
