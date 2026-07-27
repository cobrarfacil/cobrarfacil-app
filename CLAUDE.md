# CobrarFácil — Frontend (app)

App React do CobrarFácil, um SaaS de **cobrança via WhatsApp** para pequenos negócios brasileiros. Roda em `app.cobrarfacil.com.br` (Vercel). O backend é o repo `cobrarfacil-backend` (Node/Express + Postgres, Railway).

## Propósito e filosofia (leia antes de propor feature)

Resolver a dor da **cobrança** de forma **simples** para um dono de negócio leigo e corrido. Simplicidade acima de tudo — quem gosta de muita função é programador. O **Pix cai direto na conta do lojista** (nunca passa pela empresa) — é o diferencial que mantém tudo simples e vendável em escala. **Só Pix** (sem cartão/boleto/link, sem e-mail, sem recorrência/portal/NFS-e — descartados de propósito). A memória completa do projeto e as decisões estão no repo `negocios-docs` → `cobrarfacil/CLAUDE.md`.

## Estrutura

- **Tudo em `src/App.jsx`** (arquivo único grande, ~4400 linhas), React + estilos inline. Sem lib de UI, sem router (navegação por estado `tela`/`aba`).
- Componente raiz `CobrarFacil` no fim do arquivo; telas: Dashboard, Clientes, Cobrancas, Marketing, Conversas, Historico, Pagamentos, Relatorio, Configuracoes, AdminPanel, LoginScreen/Checkout, OnboardingWizard.
- `api(path, options, token)` centraliza as chamadas (retorna `{erro}` em falha — **sempre checar `data.erro`/`data.sucesso`** antes de atualizar a UI; já corrigido em vários lugares onde "mentia sucesso").
- `BACKEND_URL` no topo aponta pro Railway.

## Convenções

- Português brasileiro em toda a UI; copy curto e humano, nada que "soe a IA".
- Estilos inline no padrão já existente (cores, `Btn`, `Modal`, `Inp`, `Ic.*`, classes `cf-*` do `GLOBAL_STYLES`).
- Sempre `npm run build` antes de considerar pronto.

## Deploy

Merge da branch de trabalho na **`main`** → a Vercel publica sozinha. Não commitar `node_modules/` nem `dist/` (ver `.gitignore`).

## Infra — servidor de WhatsApp no Brasil (REGRA global do Tiago)

O componente que conecta ao WhatsApp (Evolution API) deve rodar num **IP brasileiro (São Paulo)** — número BR + servidor no exterior (Railway US) dispara "suspeita de golpe" no WhatsApp e aumenta risco de bloqueio. Ver regra completa em `negocios-docs/CLAUDE.md`. Hoje o backend está na Railway (EUA): a Evolution API deveria migrar pra um host de SP (Vultr/AWS `sa-east-1`/Magalu/Hostinger BR). Ao reconectar num servidor novo, cada lojista lê o QR de novo uma vez.

## Gotchas

- **Modo suporte (impersonação):** `isAdmin` continua true; carregamento de dados e vigia de WhatsApp consideram `impersonando`. (Foi o bug de "clientes sumiram".)
- **Modo demo:** se a conta está em `modo_demo`, o backend **simula** envios (nada real sai). Se "não enviou nada", suspeitar disso + conexão do WhatsApp.
- **Cartão de crédito** no checkout está **escondido** (só Pix) — a tokenização com Pagar.me nunca foi feita.
- Marketing: campanha **não é instantânea** (lotes espaçados anti-spam). Aba "Campanhas" mostra histórico salvo, status ao vivo, e deixa ver/editar/reutilizar/parar.
- **Produção com cliente real** — mudança cirúrgica e validada.
