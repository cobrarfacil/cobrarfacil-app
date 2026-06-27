import { useState, useEffect, useRef } from "react";

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
  key:      () => <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
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

// ─── TELA DE TROCA DE SENHA ───────────────────────────────────────────────
function TrocarSenha({ email, onSucesso }) {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const trocar = async () => {
    setErro("");
    if (novaSenha.length < 6) { setErro("A nova senha deve ter pelo menos 6 caracteres"); return; }
    if (novaSenha !== confirmar) { setErro("As senhas não coincidem"); return; }
    setLoading(true);
    try {
      const res = await fetch(BACKEND_URL + "/auth/trocar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha_atual: senhaAtual, nova_senha: novaSenha }),
      });
      const data = await res.json();
      if (data.sucesso) {
        onSucesso();
      } else {
        setErro(data.erro || "Erro ao trocar senha");
      }
    } catch (e) {
      setErro("Erro de conexão");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 50%, #1E40AF 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, background: "linear-gradient(135deg, #F59E0B, #D97706)", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28 }}>🔑</div>
          <h2 style={{ color: "#fff", fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>Crie sua senha</h2>
          <p style={{ color: "#94A3B8", fontSize: 14, margin: 0 }}>Por segurança, troque a senha temporária antes de continuar</p>
        </div>
        <div style={{ background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 25px 80px rgba(0,0,0,0.3)" }}>
          <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 10, padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "#92400E" }}>
            ⚠️ Use a senha temporária que recebeu no WhatsApp como senha atual
          </div>
          <Inp label="Senha atual (temporária)" type="password" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} placeholder="Senha recebida no WhatsApp" />
          <Inp label="Nova senha" type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
          <Inp label="Confirmar nova senha" type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)} placeholder="Repita a nova senha" />
          {erro && <div style={{ background: "#FEF2F2", color: "#DC2626", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 12 }}>{erro}</div>}
          <Btn onClick={trocar} disabled={loading || !senhaAtual || !novaSenha || !confirmar} style={{ width: "100%", justifyContent: "center" }}>
            {loading ? "Salvando..." : "🔑 Definir nova senha"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ─── CHECKOUT ─────────────────────────────────────────────────────────────
function Checkout({ planoInicial, onVoltar }) {
  const [step, setStep] = useState(1); // 1=dados, 2=pagamento, 3=sucesso
  const [plano, setPlano] = useState(planoInicial || "trimestral");
  const [formaPag, setFormaPag] = useState("pix");
  const [dados, setDados] = useState({ nome: "", email: "", cpf: "", telefone: "" });
  const [cartao, setCartao] = useState({ numero: "", nome: "", validade: "", cvv: "" });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState(null);

  const planos = {
    mensal:     { nome: "Mensal",     valor: 14700,  label: "R$147/mês",  economia: null,            parcelas: 1, parcelasLabel: "à vista" },
    trimestral: { nome: "Trimestral", valor: 35700,  label: "R$119/mês",  economia: "Economize R$84", parcelas: 2, parcelasLabel: "em até 2x" },
    anual:      { nome: "Anual",      valor: 116400, label: "R$97/mês",   economia: "Economize R$600", parcelas: 3, parcelasLabel: "em até 3x" },
  };

  const planoSel = planos[plano];

  const pagar = async () => {
    setErro("");
    if (formaPag === "cartao") {
      if (!cartao.numero || !cartao.nome || !cartao.validade || !cartao.cvv) {
        setErro("Preencha todos os dados do cartão"); return;
      }
    }
    setLoading(true);
    try {
      const res = await fetch(BACKEND_URL + "/pagamento/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...dados, plano, forma_pagamento: formaPag,
          card_number: cartao.numero,
          card_name: cartao.nome,
          card_expiry: cartao.validade,
          card_cvv: cartao.cvv,
        }),
      });
      const data = await res.json();
      if (data.sucesso) {
        setResultado(data.dados);
        setStep(3);
      } else {
        setErro(data.erro?.message || data.erro || "Erro ao processar pagamento");
      }
    } catch (e) {
      setErro("Erro de conexão com o servidor");
    }
    setLoading(false);
  };

  const pixCode = resultado?.charges?.[0]?.last_transaction?.qr_code;
  const pixUrl = resultado?.charges?.[0]?.last_transaction?.qr_code_url;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 50%, #1E40AF 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 520 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <button onClick={onVoltar} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, width: 34, height: 34, cursor: "pointer", color: "#fff", fontSize: 18 }}>←</button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #22C55E, #0D9488)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff" }}>C$</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>CobrarFácil</div>
          </div>
        </div>

        {/* Steps */}
        {step < 3 && (
          <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
            {[["1", "Seus dados"], ["2", "Pagamento"]].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: step > i + 1 ? "#22C55E" : step === i + 1 ? "#fff" : "rgba(255,255,255,0.2)", color: step === i + 1 ? "#1E40AF" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>{step > i + 1 ? "✓" : s[0]}</div>
                  <span style={{ fontSize: 13, fontWeight: step === i + 1 ? 700 : 400, color: step === i + 1 ? "#fff" : "rgba(255,255,255,0.5)" }}>{s[1]}</span>
                </div>
                {i === 0 && <div style={{ flex: 1, height: 2, background: step > 1 ? "#22C55E" : "rgba(255,255,255,0.2)", margin: "0 12px" }} />}
              </div>
            ))}
          </div>
        )}

        <div style={{ background: "#fff", borderRadius: 20, padding: 28, boxShadow: "0 25px 80px rgba(0,0,0,0.3)" }}>

          {/* STEP 1: Dados */}
          {step === 1 && (
            <div>
              <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 800, color: "#0F172A" }}>Seus dados</h2>
              <p style={{ margin: "0 0 22px", fontSize: 13, color: "#64748B" }}>Usaremos para criar seu acesso e enviar credenciais por WhatsApp</p>

              {/* Seleção de plano */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Plano escolhido</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {Object.entries(planos).map(([k, p]) => (
                    <div key={k} onClick={() => setPlano(k)} style={{ flex: 1, background: plano === k ? "#EFF6FF" : "#F8FAFC", border: "2px solid " + (plano === k ? "#1E40AF" : "#E2E8F0"), borderRadius: 10, padding: "10px 8px", textAlign: "center", cursor: "pointer" }}>
                      <div style={{ fontWeight: 800, fontSize: 13, color: plano === k ? "#1E40AF" : "#0F172A" }}>{p.nome}</div>
                      <div style={{ fontSize: 12, color: "#64748B" }}>{p.label}</div>
                      {p.economia && <div style={{ fontSize: 10, color: "#16A34A", fontWeight: 700 }}>🎁 {p.economia}</div>}
                    </div>
                  ))}
                </div>
              </div>

              <Inp label="Nome completo *" value={dados.nome} onChange={e => setDados(p => ({ ...p, nome: e.target.value }))} placeholder="João da Silva" />
              <Inp label="E-mail *" type="email" value={dados.email} onChange={e => setDados(p => ({ ...p, email: e.target.value }))} placeholder="seu@email.com" />
              <Inp label="CPF *" value={dados.cpf} onChange={e => setDados(p => ({ ...p, cpf: e.target.value }))} placeholder="000.000.000-00" />
              <Inp label="WhatsApp * (receberá seu acesso aqui)" value={dados.telefone} onChange={e => setDados(p => ({ ...p, telefone: e.target.value }))} placeholder="(44) 99999-0000" />

              {erro && <div style={{ background: "#FEF2F2", color: "#DC2626", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 12 }}>{erro}</div>}

              <Btn onClick={() => { if (!dados.nome || !dados.email || !dados.cpf || !dados.telefone) { setErro("Preencha todos os campos"); return; } setErro(""); setStep(2); }} style={{ width: "100%", justifyContent: "center" }}>
                Continuar para pagamento →
              </Btn>

              <div style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: "#94A3B8" }}>
                🔒 Seus dados são protegidos · 7 dias de garantia ou devolvemos
              </div>
            </div>
          )}

          {/* STEP 2: Pagamento */}
          {step === 2 && (
            <div>
              <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 800, color: "#0F172A" }}>Pagamento</h2>

              {/* Resumo */}
              <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#0F172A" }}>Plano {planoSel.nome}</div>
                  <div style={{ fontSize: 12, color: "#64748B" }}>{dados.nome} · {dados.email}</div>
                </div>
                <div style={{ fontWeight: 900, fontSize: 22, color: "#1E40AF" }}>
                  {(planoSel.valor / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
              </div>

              {/* Forma de pagamento */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8 }}>Forma de pagamento</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[["pix", "💠 Pix", "Aprovação imediata"], ["cartao", "💳 Cartão", "Crédito em até 12x"]].map(([k, l, sub]) => (
                    <div key={k} onClick={() => setFormaPag(k)} style={{ flex: 1, background: formaPag === k ? "#EFF6FF" : "#F8FAFC", border: "2px solid " + (formaPag === k ? "#1E40AF" : "#E2E8F0"), borderRadius: 10, padding: "12px", textAlign: "center", cursor: "pointer" }}>
                      <div style={{ fontSize: 18, marginBottom: 4 }}>{l}</div>
                      <div style={{ fontSize: 11, color: "#64748B" }}>{sub}</div>
                    </div>
                  ))}
                </div>
              </div>

              {formaPag === "pix" && (
                <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "12px 14px", marginBottom: 18, fontSize: 13, color: "#1E3A8A" }}>
                  💠 Após confirmar, o QR Code Pix aparecerá na tela. Pague e receba seu acesso no WhatsApp em instantes.
                </div>
              )}

              {formaPag === "cartao" && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#166534", fontWeight: 600 }}>
                    💳 Plano {planoSel.nome}: {planoSel.parcelasLabel} no crédito
                  </div>
                  <Inp label="Número do cartão" value={cartao.numero} onChange={e => setCartao(p => ({ ...p, numero: e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim() }))} placeholder="0000 0000 0000 0000" maxLength={19} />
                  <Inp label="Nome no cartão" value={cartao.nome} onChange={e => setCartao(p => ({ ...p, nome: e.target.value.toUpperCase() }))} placeholder="NOME SOBRENOME" />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Inp label="Validade" value={cartao.validade} onChange={e => { let v = e.target.value.replace(/\D/g, ''); if (v.length >= 2) v = v.slice(0,2) + '/' + v.slice(2,4); setCartao(p => ({ ...p, validade: v })); }} placeholder="MM/AA" maxLength={5} />
                    <Inp label="CVV" value={cartao.cvv} onChange={e => setCartao(p => ({ ...p, cvv: e.target.value.replace(/\D/g, '') }))} placeholder="123" maxLength={4} />
                  </div>
                </div>
              )}

              {erro && <div style={{ background: "#FEF2F2", color: "#DC2626", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 12 }}>{erro}</div>}

              <Btn onClick={pagar} disabled={loading} style={{ width: "100%", justifyContent: "center", fontSize: 15, padding: "14px" }}>
                {loading ? "Processando..." : formaPag === "pix" ? "💠 Gerar QR Code Pix" : "💳 Pagar com cartão"}
              </Btn>

              <div style={{ fontSize: 11, color: "#94A3B8", textAlign: "center", marginTop: 10 }}>
                🔒 Pagamento seguro via Pagar.me (Stone) · 7 dias de garantia
              </div>
            </div>
          )}

          {/* STEP 3: Sucesso */}
          {step === 3 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", marginBottom: 8 }}>Pedido confirmado!</h2>
              <p style={{ color: "#64748B", fontSize: 14, marginBottom: 24 }}>
                Assim que o pagamento for identificado, você receberá seu login e senha no WhatsApp <strong>{dados.telefone}</strong>.
              </p>

              {pixCode && (
                <div style={{ background: "#F8FAFC", borderRadius: 14, padding: 20, marginBottom: 20, border: "1px solid #E2E8F0" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A", marginBottom: 12 }}>💠 QR Code Pix</div>
                  {pixUrl && <img src={pixUrl} alt="QR Code Pix" style={{ width: 180, height: 180, borderRadius: 8 }} />}
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, color: "#64748B", marginBottom: 8 }}>Ou copie o código abaixo:</div>
                    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 12px", fontFamily: "monospace", fontSize: 10, wordBreak: "break-all", color: "#374151" }}>{pixCode}</div>
                    <button onClick={() => navigator.clipboard?.writeText(pixCode)} style={{ marginTop: 8, background: "#1E40AF", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                      📋 Copiar código Pix
                    </button>
                  </div>
                </div>
              )}

              <div style={{ background: "#FEF3C7", border: "1px solid #FDE68A", borderRadius: 12, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#92400E" }}>
                ⏳ Aguarde o pagamento ser confirmado. Você receberá login e senha via WhatsApp automaticamente.
              </div>

              <button onClick={onVoltar} style={{ background: "#F1F5F9", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", color: "#374151" }}>
                Voltar ao login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [aba, setAba] = useState("login");
  const [checkout, setCheckout] = useState(false);
  const [planoCheckout, setPlanoCheckout] = useState("trimestral");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  if (checkout) return <Checkout planoInicial={planoCheckout} onVoltar={() => setCheckout(false)} />;

  const go = async () => {
    setErro("");
    if (!email || !senha) { setErro("Preencha e-mail e senha"); return; }
    if (email === "admin@cobrarfacil.com.br" && senha === "admin2026") {
      onLogin({ isAdmin: true }); return;
    }
    setLoading(true);
    try {
      const res = await fetch(BACKEND_URL + "/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      const data = await res.json();
      if (data.sucesso) {
        localStorage.setItem("cobrarfacil_token", data.token);
        localStorage.setItem("cobrarfacil_usuario", JSON.stringify(data.usuario));
        onLogin({ isAdmin: false, usuario: data.usuario, token: data.token });
      } else {
        setErro(data.erro || "Email ou senha incorretos");
      }
    } catch (e) {
      setErro("Erro de conexão com o servidor");
    }
    setLoading(false);
  };

  const planos = [
    { key: "mensal",     nome: "Mensal",     preco: "R$147", periodo: "/mês", economia: null,           cor: "#3B82F6" },
    { key: "trimestral", nome: "Trimestral", preco: "R$119", periodo: "/mês", economia: "Economize R$84",  cor: "#7C3AED", destaque: true },
    { key: "anual",      nome: "Anual",      preco: "R$97",  periodo: "/mês", economia: "Economize R$600", cor: "#16A34A" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0F172A 0%, #1E3A5F 50%, #1E40AF 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: aba === "planos" ? 700 : 420 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <div style={{ width: 42, height: 42, background: "linear-gradient(135deg, #22C55E, #0D9488)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "#fff" }}>C$</div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: -1 }}>CobrarFácil</div>
              <div style={{ fontSize: 10, color: "#93C5FD", fontWeight: 500, letterSpacing: 1 }}>SISTEMA DE COBRANÇA</div>
            </div>
          </div>
          <p style={{ color: "#94A3B8", fontSize: 14, margin: 0 }}>Seus clientes pagam. Você recebe.</p>
        </div>

        <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: 4, marginBottom: 20 }}>
          {[["login", "Entrar"], ["planos", "Assinar"]].map(([k, l]) => (
            <button key={k} onClick={() => setAba(k)} style={{ flex: 1, background: aba === k ? "#fff" : "transparent", color: aba === k ? "#1E40AF" : "#94A3B8", border: "none", borderRadius: 9, padding: "9px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{l}</button>
          ))}
        </div>

        {aba === "login" && (
          <div style={{ background: "#fff", borderRadius: 20, padding: 32, boxShadow: "0 25px 80px rgba(0,0,0,0.3)" }}>
            <h2 style={{ margin: "0 0 22px", fontSize: 20, fontWeight: 700, color: "#0F172A" }}>Entrar na plataforma</h2>
            <Inp label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
            <Inp label="Senha" type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && go()} />
            {erro && <div style={{ background: "#FEF2F2", color: "#DC2626", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 12 }}>{erro}</div>}
            <div style={{ textAlign: "right", marginBottom: 18 }}><span style={{ fontSize: 13, color: "#1E40AF", cursor: "pointer", fontWeight: 600 }}>Esqueci minha senha</span></div>
            <Btn onClick={go} disabled={loading} style={{ width: "100%", justifyContent: "center" }}>{loading ? "Entrando..." : "Entrar na plataforma →"}</Btn>
            <div style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: "#64748B" }}>
              Não tem conta? <span onClick={() => setAba("planos")} style={{ color: "#1E40AF", fontWeight: 600, cursor: "pointer" }}>Assinar agora</span>
            </div>
          </div>
        )}

        {aba === "planos" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
              {planos.map(p => (
                <div key={p.key} style={{ background: "#fff", borderRadius: 16, padding: 20, border: p.destaque ? "2px solid " + p.cor : "1px solid #E2E8F0", position: "relative" }}>
                  {p.destaque && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: p.cor, color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99, whiteSpace: "nowrap" }}>⭐ MAIS ESCOLHIDO</div>}
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#0F172A", marginBottom: 4 }}>{p.nome}</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: p.cor }}>{p.preco}<span style={{ fontSize: 12, fontWeight: 400, color: "#64748B" }}>{p.periodo}</span></div>
                  {p.economia && <div style={{ fontSize: 11, color: "#16A34A", fontWeight: 700, marginTop: 3 }}>🎁 {p.economia}</div>}
                  <ul style={{ margin: "12px 0 0", padding: "0 0 0 14px", fontSize: 12, color: "#374151", lineHeight: 1.9 }}>
                    <li>Todas as funções</li>
                    <li>WhatsApp automático</li>
                    <li>Suporte prioritário</li>
                    <li>7 dias de garantia</li>
                  </ul>
                  <button onClick={() => { setPlanoCheckout(p.key); setCheckout(true); }} style={{ display: "block", width: "100%", marginTop: 14, background: p.cor, color: "#fff", border: "none", borderRadius: 10, padding: "10px", textAlign: "center", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                    Assinar agora
                  </button>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", fontSize: 12, color: "#94A3B8" }}>
              🔒 Pagamento seguro · 7 dias de garantia ou devolvemos · Cancele quando quiser
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 16, marginTop: 24, justifyContent: "center", flexWrap: "wrap" }}>
          {["✅ 7 dias de garantia", "📱 WhatsApp automático", "💳 Pix ou Cartão"].map(f => <div key={f} style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500 }}>{f}</div>)}
        </div>
      </div>
    </div>
  );
}

// ─── DADOS MOCK (clientes de demonstração) ────────────────────────────────
const DB_DEMO = {
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

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────
const ADMIN_LOJISTAS = [
  { id: 1, nome: "Look Up Store", email: "tiago@lookupmoda.com.br", plano: "Pro", status: "ativo", clientes: 6, mrr: 97, vencimento: "2026-07-24", pagamento: "Pix", inadimplente: false, cadastro: "2026-01-10" },
  { id: 2, nome: "Moda Feminina da Ana", email: "ana@modafeminina.com.br", plano: "Pro", status: "ativo", clientes: 23, mrr: 97, vencimento: "2026-07-15", pagamento: "Cartão", inadimplente: false, cadastro: "2026-02-03" },
  { id: 3, nome: "Calçados Mendes", email: "carlos@calcadosmendes.com.br", plano: "Starter", status: "ativo", clientes: 8, mrr: 47, vencimento: "2026-07-20", pagamento: "Boleto", inadimplente: false, cadastro: "2026-03-15" },
  { id: 4, nome: "Pedro Eletro", email: "pedro@pedroeletro.com.br", plano: "Pro", status: "inadimplente", clientes: 14, mrr: 97, vencimento: "2026-06-10", pagamento: "Pix", inadimplente: true, cadastro: "2026-02-28" },
];

function AdminPanel({ onLogout }) {
  const mrr = ADMIN_LOJISTAS.filter(l => l.status === "ativo").reduce((a, l) => a + l.mrr, 0);
  const ativos = ADMIN_LOJISTAS.filter(l => l.status === "ativo");
  const inadimplentes = ADMIN_LOJISTAS.filter(l => l.inadimplente);

  const statusBadge = {
    ativo:        { bg: "#DCFCE7", color: "#16A34A", label: "✅ Ativo" },
    inadimplente: { bg: "#FEF3C7", color: "#D97706", label: "⚠️ Inadimplente" },
    cancelado:    { bg: "#FEE2E2", color: "#DC2626", label: "❌ Cancelado" },
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0F172A", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ background: "#1E293B", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #22C55E, #0D9488)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff" }}>C$</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>CobrarFácil Admin</div>
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
            { label: "Clientes ativos", value: ativos.length, color: "#3B82F6", bg: "#0c1a3a" },
            { label: "Inadimplentes", value: inadimplentes.length, color: "#F59E0B", bg: "#2a1a00" },
          ].map(c => (
            <div key={c.label} style={{ background: c.bg, borderRadius: 14, padding: 18, border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#E2E8F0", marginTop: 4 }}>{c.label}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "#1E293B", borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#0F172A" }}>
                {["Negócio", "Plano", "MRR", "Status"].map(h => (
                  <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontWeight: 700, color: "#64748B", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ADMIN_LOJISTAS.map((l, i) => {
                const s = statusBadge[l.status];
                return (
                  <tr key={l.id} style={{ background: i % 2 === 0 ? "#1E293B" : "#1a2538" }}>
                    <td style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ fontWeight: 700, color: "#E2E8F0" }}>{l.nome}</div>
                      <div style={{ fontSize: 11, color: "#64748B" }}>{l.email}</div>
                    </td>
                    <td style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", color: "#60A5FA", fontWeight: 700 }}>{l.plano}</td>
                    <td style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", fontWeight: 700, color: "#22C55E" }}>{l.mrr > 0 ? fmt(l.mrr) : "—"}</td>
                    <td style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 99 }}>{s.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────
function Dashboard({ clientes }) {
  const total = clientes.reduce((a, c) => a + c.totalDivida, 0);
  const atrasados = clientes.filter(c => c.status === "atrasado");
  const pagos = clientes.filter(c => c.status === "pago");
  const totalRecebido = pagos.reduce((a, c) => a + c.totalDivida, 0);
  const totalEmRisco = atrasados.reduce((a, c) => a + c.totalDivida, 0);

  const cards = [
    { label: "Total em cobrança", value: fmt(total), icon: <Ic.money />, color: "#1E40AF", bg: "#EFF6FF" },
    { label: "Já recebido", value: fmt(totalRecebido), icon: <Ic.trend />, color: "#16A34A", bg: "#F0FDF4" },
    { label: "Em risco", value: fmt(totalEmRisco), icon: <Ic.alert />, color: "#DC2626", bg: "#FEF2F2" },
    { label: "Clientes", value: clientes.length, icon: <Ic.users />, color: "#7C3AED", bg: "#F5F3FF" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0F172A" }}>Painel Geral</h1>
        <p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 14 }}>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      </div>
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
      <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: "1px solid #F1F5F9" }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>Situação dos Clientes</h3>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          {[{ label: "Pagos", count: pagos.length, color: "#16A34A", bg: "#F0FDF4" }, { label: "Pendentes", count: clientes.filter(c => c.status === "pendente").length, color: "#D97706", bg: "#FFFBEB" }, { label: "Atrasados", count: atrasados.length, color: "#DC2626", bg: "#FEF2F2" }].map(s => (
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
    </div>
  );
}

// ─── CLIENTES ─────────────────────────────────────────────────────────────
function Clientes({ clientes, setClientes, onCobranca }) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [modalAdd, setModalAdd] = useState(false);
  const [novo, setNovo] = useState({ nome: "", cpf: "", telefone: "", email: "", totalDivida: "", parcelas: "1", vencimento: "" });
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const calcDiasAtraso = (vencimento) => {
    if (!vencimento) return 0;
    const diff = Math.floor((new Date() - new Date(vencimento)) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const filtrados = clientes.filter(c => (filtro === "todos" || c.status === filtro) && c.nome.toLowerCase().includes(busca.toLowerCase()));

  const addCliente = () => {
    if (!novo.nome || !novo.telefone || !novo.totalDivida) return;
    const diasAtraso = calcDiasAtraso(novo.vencimento);
    const status = diasAtraso > 0 ? "atrasado" : "pendente";
    setClientes(prev => [{ ...novo, id: Date.now(), totalDivida: parseFloat(novo.totalDivida), parcelas: parseInt(novo.parcelas), parcelasPagas: 0, status, diasAtraso }, ...prev]);
    setModalAdd(false);
    setNovo({ nome: "", cpf: "", telefone: "", email: "", totalDivida: "", parcelas: "1", vencimento: "" });
    showToast("Cliente cadastrado com sucesso!");
  };

  return (
    <div>
      {toast && <ToastMsg {...toast} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0F172A" }}>Clientes</h1>
          <p style={{ margin: "3px 0 0", fontSize: 13, color: "#64748B" }}>{clientes.length} cadastrados · {clientes.filter(c => c.status === "atrasado").length} em atraso</p>
        </div>
        <Btn onClick={() => setModalAdd(true)}><Ic.plus /> Novo cliente</Btn>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <input placeholder="🔍 Buscar..." value={busca} onChange={e => setBusca(e.target.value)} style={{ flex: 1, minWidth: 160, border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "9px 14px", fontSize: 14, outline: "none", background: "#F8FAFC" }} />
        {["todos", "pendente", "atrasado", "pago"].map(f => (
          <button key={f} onClick={() => setFiltro(f)} style={{ background: filtro === f ? "#1E40AF" : "#F1F5F9", color: filtro === f ? "#fff" : "#64748B", border: "none", borderRadius: 10, padding: "9px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {f === "todos" ? "Todos" : statusColor[f]?.label || f}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtrados.map(c => (
          <div key={c.id} style={{ background: "#fff", borderRadius: 14, border: "1px solid " + (c.status === "atrasado" ? "#FECACA" : "#F1F5F9"), padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #DBEAFE, #BFDBFE)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#1E40AF" }}>{c.nome.charAt(0)}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#0F172A" }}>{c.nome}</div>
                  <div style={{ fontSize: 12, color: "#94A3B8" }}>{c.cpf || "—"} · {c.telefone}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Badge status={c.status} />
                {c.diasAtraso > 0 && <span style={{ fontSize: 12, color: "#DC2626", fontWeight: 600, background: "#FEF2F2", padding: "2px 8px", borderRadius: 99 }}>⚠️ {c.diasAtraso} dias em atraso</span>}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: c.status === "atrasado" ? "#DC2626" : c.status === "pago" ? "#16A34A" : "#0F172A", marginBottom: 8 }}>{fmt(c.totalDivida)}</div>
              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                {c.status !== "pago" && <Btn small variant="green" onClick={() => onCobranca(c)}><Ic.send /> Cobrar</Btn>}
                {c.status !== "pago" && <Btn small variant="ghost" onClick={() => { setClientes(prev => prev.map(x => x.id === c.id ? { ...x, status: "pago", parcelasPagas: x.parcelas, diasAtraso: 0 } : x)); showToast("Marcado como pago! ✅"); }}><Ic.check /> Pago</Btn>}
                {c.status === "pago" && <span style={{ fontSize: 12, color: "#16A34A", fontWeight: 600 }}>✅ Recebido</span>}
              </div>
            </div>
          </div>
        ))}
        {filtrados.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#94A3B8" }}><div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div><div style={{ fontWeight: 600 }}>Nenhum cliente encontrado</div></div>}
      </div>
      {modalAdd && (
        <Modal title="Cadastrar Novo Cliente" onClose={() => setModalAdd(false)}>
          <Inp label="Nome completo *" value={novo.nome} onChange={e => setNovo(p => ({ ...p, nome: e.target.value }))} placeholder="João da Silva" />
          <Inp label="CPF" value={novo.cpf} onChange={e => setNovo(p => ({ ...p, cpf: e.target.value }))} placeholder="000.000.000-00" />
          <Inp label="WhatsApp *" value={novo.telefone} onChange={e => setNovo(p => ({ ...p, telefone: e.target.value }))} placeholder="(44) 99999-0000" />
          <Inp label="E-mail" value={novo.email} onChange={e => setNovo(p => ({ ...p, email: e.target.value }))} placeholder="joao@email.com" />
          <Inp label="Valor total (R$) *" type="number" value={novo.totalDivida} onChange={e => setNovo(p => ({ ...p, totalDivida: e.target.value }))} placeholder="0,00" />
          <Inp label="Data de vencimento" type="date" value={novo.vencimento} onChange={e => setNovo(p => ({ ...p, vencimento: e.target.value }))} />
          <Sel label="Parcelas" value={novo.parcelas} onChange={e => setNovo(p => ({ ...p, parcelas: e.target.value }))}>
            {[1,2,3,4,6,8,10,12].map(n => <option key={n} value={n}>{n}x</option>)}
          </Sel>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="ghost" onClick={() => setModalAdd(false)} style={{ flex: 1, justifyContent: "center" }}>Cancelar</Btn>
            <Btn onClick={addCliente} disabled={!novo.nome || !novo.telefone || !novo.totalDivida} style={{ flex: 1, justifyContent: "center" }}><Ic.plus /> Cadastrar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── COBRANÇAS ────────────────────────────────────────────────────────────
function Cobrancas({ clientes, historico, setHistorico, clientePreSelecionado, setClientePreSelecionado, pixKey }) {
  const [clienteSel, setClienteSel] = useState(clientePreSelecionado?.id?.toString() || "");
  const [canal, setCanal] = useState("whatsapp");
  const [msg, setMsg] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const clienteSelecionado = clientes.find(c => c.id.toString() === clienteSel);

  useEffect(() => {
    if (clientePreSelecionado) { setClienteSel(clientePreSelecionado.id.toString()); setClientePreSelecionado(null); }
  }, []);

  useEffect(() => {
    if (clienteSelecionado) {
      const pix = pixKey ? "\n💳 Pix: *" + pixKey + "* | Valor: *" + fmt(clienteSelecionado.totalDivida) + "*" : "";
      setMsg(`Olá ${clienteSelecionado.nome.split(" ")[0]} 😊\n\nIdentificamos uma pendência de *${fmt(clienteSelecionado.totalDivida)}* em aberto.\n\nRegularize agora via Pix:${pix}\n\nQualquer dúvida, é só chamar! 🙏`);
    }
  }, [clienteSel]);

  const enviar = () => {
    if (!clienteSel || !msg) return;
    setEnviando(true);
    setTimeout(() => {
      setHistorico(prev => [{ id: Date.now(), clienteId: parseInt(clienteSel), tipo: canal, data: new Date().toLocaleString("pt-BR"), mensagem: msg, status: "entregue" }, ...prev]);
      setEnviando(false); setSucesso(true); setTimeout(() => setSucesso(false), 3000);
    }, 1200);
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}><h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0F172A" }}>Enviar Cobrança</h1></div>
      {sucesso && <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 12, padding: 12, marginBottom: 16, color: "#16A34A", fontWeight: 600 }}>✅ Cobrança enviada!</div>}
      <div style={{ background: "#fff", borderRadius: 16, padding: 20, border: "1px solid #F1F5F9" }}>
        <Sel label="Cliente" value={clienteSel} onChange={e => setClienteSel(e.target.value)}>
          <option value="">Selecione...</option>
          {clientes.filter(c => c.status !== "pago").map(c => <option key={c.id} value={c.id}>{c.nome} — {fmt(c.totalDivida)}</option>)}
        </Sel>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Canal</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[{ k: "whatsapp", l: "WhatsApp" }, { k: "email", l: "E-mail" }].map(ch => (
              <button key={ch.k} onClick={() => setCanal(ch.k)} style={{ flex: 1, background: canal === ch.k ? "#EFF6FF" : "#F8FAFC", border: "2px solid " + (canal === ch.k ? "#1E40AF" : "#E2E8F0"), borderRadius: 10, padding: "9px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: canal === ch.k ? "#1E40AF" : "#64748B" }}>{ch.l}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 5 }}>Mensagem</label>
          <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={5} style={{ width: "100%", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "10px 12px", fontSize: 13, outline: "none", background: "#F8FAFC", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
        </div>
        <Btn onClick={enviar} style={{ width: "100%", justifyContent: "center" }}>{enviando ? "Enviando..." : <><Ic.send /> Enviar Cobrança</>}</Btn>
      </div>
    </div>
  );
}

// ─── HISTÓRICO ────────────────────────────────────────────────────────────
function Historico({ historico, setHistorico, clientes, setClientes }) {
  const get = (id) => clientes.find(c => c.id === id);
  const [toast, setToast] = useState(null);
  const [confirmando, setConfirmando] = useState(null);
  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const confirmarPagamento = (h) => {
    setConfirmando(h.id);
    setTimeout(() => {
      setHistorico(prev => prev.map(x => x.id === h.id ? { ...x, status: "pago_confirmado", dataPagamento: new Date().toLocaleString("pt-BR") } : x));
      setClientes(prev => prev.map(c => c.id === h.clienteId ? { ...c, status: "pago", parcelasPagas: c.parcelas, diasAtraso: 0 } : c));
      setConfirmando(null);
      showToast("✅ Pagamento confirmado!");
    }, 800);
  };

  const statusInfo = (status) => ({
    entregue:        { bg: "#F0FDF4", color: "#16A34A", label: "✓ Entregue" },
    lido:            { bg: "#EFF6FF", color: "#1E40AF", label: "✓✓ Lido" },
    pago_confirmado: { bg: "#DCFCE7", color: "#15803D", label: "💰 Pago" },
    nao_pago:        { bg: "#FEE2E2", color: "#DC2626", label: "✗ Não pagou" },
  }[status] || { bg: "#F1F5F9", color: "#64748B", label: status });

  return (
    <div>
      {toast && <ToastMsg {...toast} />}
      <div style={{ marginBottom: 20 }}><h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0F172A" }}>Histórico</h1><p style={{ margin: "4px 0 0", color: "#64748B", fontSize: 14 }}>{historico.length} mensagens</p></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {historico.map(h => {
          const c = get(h.clienteId);
          const s = statusInfo(h.status);
          return (
            <div key={h.id} style={{ background: "#fff", borderRadius: 14, padding: "14px 18px", border: "1px solid #F1F5F9" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ width: 34, height: 34, background: "#F0FDF4", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#16A34A", flexShrink: 0 }}><Ic.whatsapp /></div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{c?.nome || "—"}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 4 }}>{h.data}</div>
                    <div style={{ fontSize: 12, color: "#374151", background: "#F8FAFC", borderRadius: 8, padding: "6px 10px" }}>{h.mensagem.substring(0, 80)}...</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <span style={{ background: s.bg, color: s.color, fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>{s.label}</span>
                  {h.status !== "pago_confirmado" && h.status !== "nao_pago" && c?.status !== "pago" && (
                    <Btn small variant="green" onClick={() => confirmarPagamento(h)} disabled={confirmando === h.id}>
                      {confirmando === h.id ? "..." : <><Ic.check /> Confirmar pago</>}
                    </Btn>
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

// ─── CONFIGURAÇÕES ────────────────────────────────────────────────────────
function Configuracoes({ usuario, pixKey, setPixKey }) {
  const [pixInput, setPixInput] = useState(pixKey || "");
  const [pixSalvo, setPixSalvo] = useState(!!pixKey);
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2000); };

  const salvarPix = () => {
    if (!pixInput.trim()) return;
    setPixKey(pixInput.trim());
    setPixSalvo(true);
    showToast("Chave Pix salva!");
  };

  return (
    <div>
      {toast && <ToastMsg {...toast} />}
      <h1 style={{ margin: "0 0 20px", fontSize: 22, fontWeight: 800, color: "#0F172A" }}>Configurações</h1>
      <div style={{ display: "grid", gap: 18, maxWidth: 580 }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 22, border: "1px solid #F1F5F9" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>Meu Perfil</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {[["Nome", usuario?.nome], ["E-mail", usuario?.email], ["Plano", usuario?.plano]].map(([k, v]) => (
              <div key={k} style={{ background: "#F8FAFC", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "#64748B" }}>{k}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{v || "—"}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background: "#fff", borderRadius: 16, padding: 22, border: "1px solid #F1F5F9" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700 }}>⚡ Chave Pix</h3>
          {pixSalvo ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F0FDF4", borderRadius: 10, padding: "12px 16px", border: "1px solid #86EFAC" }}>
              <div>
                <div style={{ fontSize: 12, color: "#64748B", marginBottom: 2 }}>Chave cadastrada</div>
                <div style={{ fontWeight: 800, fontFamily: "monospace", fontSize: 15 }}>{pixKey}</div>
              </div>
              <Btn small variant="ghost" onClick={() => setPixSalvo(false)}>✏️ Alterar</Btn>
            </div>
          ) : (
            <div>
              <Inp label="Chave Pix" value={pixInput} onChange={e => setPixInput(e.target.value)} placeholder="Telefone, CPF, e-mail ou chave aleatória" />
              <Btn onClick={salvarPix} disabled={!pixInput.trim()}>Salvar chave Pix</Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── APP PRINCIPAL ────────────────────────────────────────────────────────
export default function CobrarFacil() {
  const [sessao, setSessao] = useState(null); // null = não logado
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const [tela, setTela] = useState("dashboard");
  const [menuAberto, setMenuAberto] = useState(false);
  const [clientes, setClientes] = useState(DB_DEMO.clientes);
  const [historico, setHistorico] = useState(DB_DEMO.historico);
  const [clienteParaCobrar, setClienteParaCobrar] = useState(null);
  const [pixKey, setPixKey] = useState(() => { try { return localStorage.getItem("cobrarfacil_pix") || ""; } catch { return ""; } });

  // Verificar sessão salva
  useEffect(() => {
    try {
      const token = localStorage.getItem("cobrarfacil_token");
      const usuario = localStorage.getItem("cobrarfacil_usuario");
      if (token && usuario) {
        setSessao({ isAdmin: false, usuario: JSON.parse(usuario), token });
      }
    } catch {}
  }, []);

  const salvarPixKey = (key) => { try { localStorage.setItem("cobrarfacil_pix", key); } catch {} setPixKey(key); };

  const logout = () => {
    try { localStorage.removeItem("cobrarfacil_token"); localStorage.removeItem("cobrarfacil_usuario"); } catch {}
    setSessao(null);
    setTrocandoSenha(false);
  };

  const onLogin = (dados) => {
    setSessao(dados);
    if (!dados.isAdmin && dados.usuario?.primeiro_acesso) {
      setTrocandoSenha(true);
    }
  };

  if (!sessao) return <LoginScreen onLogin={onLogin} />;
  if (sessao.isAdmin) return <AdminPanel onLogout={logout} />;
  if (trocandoSenha) return <TrocarSenha email={sessao.usuario?.email} onSucesso={() => setTrocandoSenha(false)} />;

  const irParaCobranca = (c) => { setClienteParaCobrar(c); setTela("cobrancas"); };

  const nav = [
    { key: "dashboard", label: "Painel",    icon: <Ic.dash /> },
    { key: "clientes",  label: "Clientes",  icon: <Ic.clients /> },
    { key: "cobrancas", label: "Cobranças", icon: <Ic.charge /> },
    { key: "historico", label: "Histórico", icon: <Ic.history /> },
    { key: "config",    label: "Config.",   icon: <Ic.settings /> },
  ];

  const atrasadosCount = clientes.filter(c => c.status === "atrasado").length;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {menuAberto && <div onClick={() => setMenuAberto(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99 }} />}
      <div style={{ width: 220, background: "#0F172A", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 100 }}>
        <div style={{ padding: "18px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, background: "linear-gradient(135deg, #22C55E, #0D9488)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff" }}>C$</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>CobrarFácil</div>
              <div style={{ fontSize: 10, color: "#475569" }}>SISTEMA DE COBRANÇA</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "14px 10px", overflowY: "auto" }}>
          {nav.map(n => (
            <button key={n.key} onClick={() => { setTela(n.key); setMenuAberto(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer", marginBottom: 3, background: tela === n.key ? "rgba(59,130,246,0.15)" : "transparent", color: tela === n.key ? "#60A5FA" : "#64748B", fontSize: 13, fontWeight: tela === n.key ? 700 : 500, textAlign: "left" }}>
              {n.icon} {n.label}
              {n.key === "clientes" && atrasadosCount > 0 && <span style={{ marginLeft: "auto", background: "#DC2626", color: "#fff", borderRadius: 99, fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>{atrasadosCount}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #1E40AF, #3B82F6)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff" }}>{sessao.usuario?.nome?.charAt(0) || "U"}</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#E2E8F0" }}>{sessao.usuario?.nome?.split(" ")[0] || "Usuário"}</div>
              <div style={{ fontSize: 10, color: "#475569" }}>Plano {sessao.usuario?.plano || "Pro"}</div>
            </div>
          </div>
          <button onClick={logout} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "7px", color: "#94A3B8", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Sair</button>
        </div>
      </div>
      <div style={{ flex: 1, marginLeft: 220, minWidth: 0 }}>
        <div style={{ background: "#fff", borderBottom: "1px solid #F1F5F9", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 50 }}>
          <span style={{ fontSize: 13, color: "#64748B", fontWeight: 600 }}>Bem-vindo, {sessao.usuario?.nome?.split(" ")[0] || ""}!</span>
          {atrasadosCount > 0 && <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#FEF2F2", color: "#DC2626", padding: "5px 10px", borderRadius: 99, fontSize: 12, fontWeight: 700 }}><Ic.bell /> {atrasadosCount} em atraso</div>}
        </div>
        <div style={{ padding: "20px 16px" }}>
          {tela === "dashboard" && <Dashboard clientes={clientes} />}
          {tela === "clientes"  && <Clientes clientes={clientes} setClientes={setClientes} onCobranca={irParaCobranca} />}
          {tela === "cobrancas" && <Cobrancas clientes={clientes} historico={historico} setHistorico={setHistorico} clientePreSelecionado={clienteParaCobrar} setClientePreSelecionado={setClienteParaCobrar} pixKey={pixKey} />}
          {tela === "historico" && <Historico historico={historico} setHistorico={setHistorico} clientes={clientes} setClientes={setClientes} />}
          {tela === "config"    && <Configuracoes usuario={sessao.usuario} pixKey={pixKey} setPixKey={salvarPixKey} />}
        </div>
      </div>
    </div>
  );
}
