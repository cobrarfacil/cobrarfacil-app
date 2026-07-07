import { useMemo, useState } from "react";
import {
  Home, Users, Zap, MessageSquare, Bell, Settings, LogOut, ChevronDown,
  HelpCircle, Bot, DollarSign, Wallet, Target, Send, Hourglass,
  AlertTriangle, MessageCircle, CheckCircle2, FileText, ArrowRight,
  Sparkles, ThumbsUp, TrendingUp
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

// ── Dados de exemplo — no app real, isto vem de GET /metricas, GET /cobrancas/historico,
//    GET /clientes (ordenado por total_divida) e do futuro endpoint de análise de IA ──

const METRICAS = {
  recebido_mes: 8450.0,
  recebido_mes_variacao: 23,
  em_aberto: 10994.0,
  em_aberto_clientes: 31,
  clientes_atraso: 31,
  clientes_atraso_valor: 10994.0,
  taxa_recuperacao: 28,
  taxa_recuperacao_variacao: 8,
  cobrancas_enviadas_mes: 147,
};

const FOCO_HOJE = [
  { icon: Hourglass, tone: "amber", qtd: 2, titulo: "Pagamentos aguardando confirmação", sub: "Clientes enviaram comprovantes" },
  { icon: AlertTriangle, tone: "red", qtd: 35, titulo: "Cobranças não enviadas", sub: "Falha no envio (verifique o motivo)" },
  { icon: MessageCircle, tone: "amber", qtd: 5, titulo: "Clientes prometeram pagar hoje", sub: "Acompanhe e confirme o pagamento" },
  { icon: MessageSquare, tone: "purple", qtd: 8, titulo: "Clientes responderam", sub: "Mensagens não lidas" },
];

const RECEBIMENTOS_30D = [
  120, 150, 90, 200, 180, 250, 300, 220, 280, 310, 260, 340, 290, 380, 350,
  420, 390, 460, 410, 500, 480, 540, 520, 600, 980, 650, 700, 680, 720, 760,
].map((valor, i) => ({ dia: i + 1, valor }));

const FUNIL = [
  { etapa: "Cobranças enviadas", qtd: 147, pct: 100, conversao: null },
  { etapa: "Entregues", qtd: 118, pct: 80, conversao: 80, label: "entregue" },
  { etapa: "Visualizadas", qtd: 93, pct: 63, conversao: 63, label: "visualizado" },
  { etapa: "Respondidas", qtd: 18, pct: 12, conversao: 19, label: "respondido" },
  { etapa: "Pagamentos", qtd: 7, pct: 5, conversao: 39, label: "pagou" },
];

const ATIVIDADE_RECENTE = [
  { hora: "15:01", icon: CheckCircle2, tone: "emerald", titulo: "Pagamento confirmado", sub: "João da Silva — R$ 350,00" },
  { hora: "14:22", icon: Send, tone: "sky", titulo: "Cobrança enviada", sub: "Maria Santos — R$ 200,00" },
  { hora: "13:47", icon: MessageCircle, tone: "amber", titulo: "Cliente respondeu", sub: "Pedro Lima — \u201cPago amanhã\u201d" },
  { hora: "12:32", icon: FileText, tone: "purple", titulo: "Comprovante recebido", sub: "Ana Paula — R$ 150,00" },
  { hora: "11:05", icon: CheckCircle2, tone: "emerald", titulo: "Pagamento confirmado", sub: "Carlos Eduardo — R$ 95,00" },
];

const MAIORES_DEVEDORES = [
  { nome: "Alice Aquino", sub: "9 dias em atraso", valor: 350.0, status: "atraso" },
  { nome: "Neide F. da Costa", sub: "1 dia em atraso", valor: 120.0, status: "atraso" },
  { nome: "Maria Santos", sub: "Aguardando confirmação", valor: 200.0, status: "aguardando" },
  { nome: "Douglas Rezini", sub: "5 dias em atraso", valor: 390.0, status: "atraso" },
  { nome: "João da Silva", sub: "Pago", valor: 350.0, status: "pago" },
];

const RESUMO_IA = [
  { icon: ThumbsUp, tone: "emerald", titulo: "4 clientes têm alta probabilidade de pagar", sub: "Eles responderam positivamente e interagiram recentemente." },
  { icon: AlertTriangle, tone: "amber", titulo: "2 clientes demonstram dificuldade financeira", sub: "Sugestão: ofereça negociação personalizada." },
  { icon: Bell, tone: "red", titulo: "5 clientes não respondem há mais de 5 dias", sub: "Sugestão: enviar uma nova abordagem." },
];

const NAV = [
  { label: "Painel", icon: Home, active: true },
  { label: "Clientes", icon: Users },
  { label: "Cobrança Automática", icon: Zap },
  { label: "Conversas", icon: MessageSquare },
  { label: "Pendências", icon: Bell, badge: 6 },
  { label: "Configurações", icon: Settings },
];

const TONES = {
  amber: "bg-amber-50 text-amber-600",
  red: "bg-red-50 text-red-600",
  purple: "bg-purple-50 text-purple-600",
  emerald: "bg-emerald-50 text-emerald-600",
  sky: "bg-sky-50 text-sky-600",
};

function fmtBRL(v) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function StatCard({ icon: Icon, label, value, sub, subTone = "text-gray-400", iconTone }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 min-w-0">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{label}</span>
        <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${iconTone}`}>
          <Icon size={17} strokeWidth={2.2} />
        </span>
      </div>
      <div className="text-2xl font-semibold text-gray-900 truncate">{value}</div>
      {sub && <div className={`text-xs font-medium ${subTone}`}>{sub}</div>}
    </div>
  );
}

function Panel({ title, action, children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function Painel() {
  const [periodo] = useState("Últimos 30 dias");
  const totalRecuperado = useMemo(
    () => FUNIL[FUNIL.length - 1].qtd * (METRICAS.recebido_mes / 25),
    []
  );
  const melhorDia = useMemo(
    () => RECEBIMENTOS_30D.reduce((a, b) => (b.valor > a.valor ? b : a)),
    []
  );
  const mediaDiaria = useMemo(
    () => RECEBIMENTOS_30D.reduce((s, d) => s + d.valor, 0) / RECEBIMENTOS_30D.length,
    []
  );

  return (
    <div className="min-h-screen bg-gray-50 flex text-gray-900" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* ── Sidebar ───────────────────────────────────────────── */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-[#0B2B24] text-white p-5">
        <div className="flex items-center gap-2 mb-8 px-1">
          <div className="w-9 h-9 rounded-lg bg-[#4ADE80] text-[#0B2B24] flex items-center justify-center font-bold">
            C
          </div>
          <div className="leading-tight">
            <div className="font-semibold">CobrarFácil</div>
            <div className="text-[10px] tracking-wide text-white/50">SISTEMA DE COBRANÇA</div>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV.map((item) => (
            <button
              key={item.label}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                item.active ? "bg-[#4ADE80] text-[#0B2B24] font-semibold" : "text-white/80 hover:bg-white/10"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <item.icon size={17} />
                {item.label}
              </span>
              {item.badge && (
                <span className="bg-red-500 text-white text-[11px] font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-3 pt-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <Bot size={16} className="text-[#4ADE80]" />
              <span className="text-sm font-medium">IA CobrarFácil</span>
            </div>
            <p className="text-xs text-white/50 mb-2">Trabalhando por você 24h</p>
            <button className="text-xs font-medium text-[#4ADE80] flex items-center gap-1">
              Ver análise completa <ArrowRight size={12} />
            </button>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <p className="text-xs text-white/50 mb-0.5">Seu plano</p>
            <p className="text-sm font-semibold mb-2">Profissional</p>
            <p className="text-[11px] text-white/40 mb-2">Vencimento: 12/08/2026</p>
            <button className="w-full text-xs font-medium bg-white/10 hover:bg-white/15 rounded-lg py-2">
              Gerenciar plano
            </button>
          </div>

          <button className="flex items-center gap-2 text-sm text-white/60 hover:text-white px-1 pt-1">
            <LogOut size={15} /> Sair do sistema
          </button>
        </div>
      </aside>

      {/* ── Conteúdo ──────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">Bom dia, Victor! 👋</h1>
            <p className="text-sm text-gray-500">Terça-feira, 07 de julho</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative flex items-center gap-1.5 text-sm font-medium border border-gray-200 rounded-full px-3.5 py-2 bg-white">
              <Bell size={15} /> Pendências
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-semibold rounded-full w-4.5 h-4.5 w-[18px] h-[18px] flex items-center justify-center">6</span>
            </button>
            <button className="flex items-center gap-1.5 text-sm font-medium border border-gray-200 rounded-full px-3.5 py-2 bg-white">
              <HelpCircle size={15} /> Central de ajuda
            </button>
            <button className="flex items-center gap-2 border border-gray-200 rounded-full pl-1 pr-2.5 py-1 bg-white">
              <span className="w-7 h-7 rounded-full bg-[#0B2B24] text-white text-xs font-semibold flex items-center justify-center">VM</span>
              <span className="text-left leading-tight">
                <span className="block text-xs font-semibold">Victor Martins</span>
                <span className="block text-[10px] text-gray-400">Plano Profissional</span>
              </span>
              <ChevronDown size={14} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatCard icon={DollarSign} label="Recebido este mês" value={fmtBRL(METRICAS.recebido_mes)}
            sub={`↑ ${METRICAS.recebido_mes_variacao}% vs mês passado`} subTone="text-emerald-600"
            iconTone="bg-emerald-50 text-emerald-600" />
          <StatCard icon={Wallet} label="Em aberto" value={fmtBRL(METRICAS.em_aberto)}
            sub={`${METRICAS.em_aberto_clientes} clientes`} subTone="text-sky-600"
            iconTone="bg-sky-50 text-sky-600" />
          <StatCard icon={Users} label="Clientes em atraso" value={METRICAS.clientes_atraso}
            sub={fmtBRL(METRICAS.clientes_atraso_valor)} subTone="text-red-500"
            iconTone="bg-orange-50 text-orange-600" />
          <StatCard icon={Target} label="Taxa de recuperação" value={`${METRICAS.taxa_recuperacao}%`}
            sub={`↑ ${METRICAS.taxa_recuperacao_variacao}% vs mês passado`} subTone="text-emerald-600"
            iconTone="bg-purple-50 text-purple-600" />
          <StatCard icon={Send} label="Cobranças enviadas" value={METRICAS.cobrancas_enviadas_mes}
            sub="este mês" iconTone="bg-blue-50 text-blue-600" />
        </div>

        {/* Linha 2: foco / recebimentos / funil */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <Panel title="O que você precisa focar hoje">
            <div className="flex flex-col divide-y divide-gray-100">
              {FOCO_HOJE.map((f) => (
                <div key={f.titulo} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${TONES[f.tone]}`}>
                    <f.icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight">
                      <span className="font-semibold">{f.qtd}</span> {f.titulo}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{f.sub}</p>
                  </div>
                  <button className="text-xs font-medium text-emerald-700 whitespace-nowrap flex items-center gap-0.5">
                    Ver agora <ArrowRight size={11} />
                  </button>
                </div>
              ))}
            </div>
            <button className="mt-3 text-xs font-medium text-emerald-700 flex items-center gap-1">
              Ver todas as pendências <ArrowRight size={12} />
            </button>
          </Panel>

          <Panel
            title="Recebimentos dos últimos 30 dias"
            action={<span className="text-xs text-gray-400 border border-gray-200 rounded-md px-2 py-1">{periodo}</span>}
          >
            <div className="mb-1">
              <p className="text-xs text-gray-400">Total recebido</p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-semibold">{fmtBRL(METRICAS.recebido_mes)}</span>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">
                  ↑ {METRICAS.recebido_mes_variacao}% vs período anterior
                </span>
              </div>
            </div>
            <div className="h-36 -ml-2 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={RECEBIMENTOS_30D}>
                  <CartesianGrid vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="dia" tick={false} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    formatter={(v) => fmtBRL(v)}
                    labelFormatter={(l) => `Dia ${l}`}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="valor" radius={[3, 3, 0, 0]} fill="#4ADE80" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-100">
              <div>
                <p className="text-[11px] text-gray-400">Melhor dia</p>
                <p className="text-sm font-semibold">{fmtBRL(melhorDia.valor)}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-400">Média diária</p>
                <p className="text-sm font-semibold">{fmtBRL(mediaDiaria)}</p>
              </div>
            </div>
          </Panel>

          <Panel title="Funil de cobrança — Este mês">
            <div className="flex flex-col gap-2.5 flex-1">
              {FUNIL.map((f) => (
                <div key={f.etapa} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500 truncate">{f.etapa}</span>
                      <span className="font-medium">{f.qtd} ({f.pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${f.pct}%` }} />
                    </div>
                  </div>
                  {f.conversao != null && (
                    <span className="text-xs font-semibold text-emerald-700 w-16 text-right shrink-0">
                      {f.conversao}%<span className="block text-[9px] font-normal text-gray-400">{f.label}</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">Total recuperado</span>
              <span className="text-sm font-semibold text-emerald-700">{fmtBRL(totalRecuperado)}</span>
            </div>
          </Panel>
        </div>

        {/* Linha 3: atividade / devedores / IA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Panel title="Atividade recente">
            <div className="flex flex-col gap-4">
              {ATIVIDADE_RECENTE.map((a, i) => (
                <div key={i} className="flex gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${TONES[a.tone]}`}>
                    <a.icon size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400">{a.hora}</p>
                    <p className="text-sm font-medium leading-tight">{a.titulo}</p>
                    <p className="text-xs text-gray-500 truncate">{a.sub}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-4 text-xs font-medium text-emerald-700 flex items-center gap-1">
              Ver todas as atividades <ArrowRight size={12} />
            </button>
          </Panel>

          <Panel
            title="Clientes que mais devem"
            action={<button className="text-xs font-medium text-emerald-700 flex items-center gap-1">Ver ranking completo <ArrowRight size={11} /></button>}
          >
            <div className="flex flex-col divide-y divide-gray-100">
              {MAIORES_DEVEDORES.map((c, i) => (
                <div key={c.nome} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="w-4 text-xs text-gray-300 font-medium">{i + 1}</span>
                  <span className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold flex items-center justify-center shrink-0">
                    {c.nome[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{c.nome}</p>
                    <p className="text-xs text-gray-400 truncate">{c.sub}</p>
                  </div>
                  <span className={`text-sm font-semibold shrink-0 ${
                    c.status === "pago" ? "text-emerald-600" : c.status === "aguardando" ? "text-amber-500" : "text-red-500"
                  }`}>
                    {fmtBRL(c.valor)}
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="" className="relative">
            <div className="flex items-center gap-2 -mt-1 mb-3">
              <span className="w-8 h-8 rounded-full bg-[#0B2B24] text-[#4ADE80] flex items-center justify-center">
                <Bot size={15} />
              </span>
              <h3 className="text-sm font-semibold">Resumo da IA</h3>
            </div>
            <div className="flex flex-col gap-3 flex-1">
              {RESUMO_IA.map((r, i) => (
                <div key={i} className="flex gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${TONES[r.tone]}`}>
                    <r.icon size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-tight">{r.titulo}</p>
                    <p className="text-xs text-gray-400">{r.sub}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-4 text-xs font-medium text-emerald-700 flex items-center gap-1">
              Ver análise completa da IA <ArrowRight size={12} />
            </button>
          </Panel>
        </div>

        {/* Footer info bar */}
        <div className="mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="text-xs text-gray-500 flex items-center gap-2">
            <Sparkles size={14} className="text-emerald-500" />
            A régua de cobrança está ativa para <span className="font-semibold text-gray-700">31 clientes</span>. Última cobrança enviada hoje às 15:00.
          </p>
          <button className="text-xs font-medium text-emerald-700 flex items-center gap-1">
            <Settings size={13} /> Configurar régua
          </button>
        </div>
      </main>
    </div>
  );
}
