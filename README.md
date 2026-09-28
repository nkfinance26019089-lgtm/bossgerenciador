# BSS Eventos · Painel de custos

Painel para controlar os gastos dos eventos da **BSS Eventos**: orçamento por evento, gastos por categoria, contas a pagar, comprovantes e equipe com níveis de acesso.

**Tecnologia:** Next.js (hospedado na Vercel) + Supabase (login, banco de dados e arquivos).

---

## O que o painel faz

| Área | O que tem |
|---|---|
| **Eventos** | Vários eventos, cada um com orçamento, data, local e situação (planejamento, em andamento, encerrado). Ao criar um evento dá para copiar as categorias de um evento anterior. |
| **Visão geral** | Quanto já foi comprometido × orçamento, pago × a pagar × livre, cartões por categoria com alerta quando passa do previsto, contas a pagar e histórico de atividade. |
| **Gastos** | Lista com busca e filtros (status, categoria, responsável), cadastro e edição, “marcar como pago”, comprovante (foto ou PDF — fotos do celular são reduzidas automaticamente) e exportação para planilha (CSV que abre no Excel). |
| **Categorias** | Nome, cor e valor previsto de cada categoria. Mostra se a soma do previsto passou do orçamento total. |
| **Responsáveis** | Convite por link (enviado pelo WhatsApp, sem depender de e-mail), papéis e último acesso. |
| **Equipe online** | Quem está usando o painel agora (e em qual tela), quando cada pessoa entrou e saiu, quanto tempo ficou e de qual aparelho. Atualiza sozinho. |
| **Logs** | Histórico de tudo o que foi feito em cada evento: quem, quando e o que mudou (valor antigo → novo), mais as entradas e saídas da equipe. |

### Papéis

| Papel | Pode |
|---|---|
| **Administrador geral** | Tudo, em todos os eventos. Único que cria e exclui eventos. (O primeiro usuário cadastrado vira administrador geral.) |
| **Administrador do evento** | Configura o evento, orçamento e categorias; convida, altera e remove pessoas; edita e exclui qualquer gasto. |
| **Editor** | Registra gastos, anexa comprovantes e edita os gastos que ele mesmo lançou. |
| **Leitor** | Só visualiza e exporta a planilha. |

As permissões ficam **no próprio banco de dados** (Row Level Security): mesmo que alguém tente acessar direto pela API, só enxerga os eventos dos quais participa e só altera o que o papel permite.

---

## Como colocar no ar (≈ 15 minutos)

### 1. Supabase — banco de dados

1. Em [supabase.com](https://supabase.com/dashboard) crie um **projeto novo** (recomendado — o painel usa as tabelas `perfis`, `eventos`, `gastos` etc.).
2. Vá em **SQL Editor › New query**, cole **todo** o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**. Deve aparecer “Success”.
   Depois, numa nova query de cada vez, faça o mesmo com [`supabase/002_online_e_logs.sql`](supabase/002_online_e_logs.sql) (equipe online e logs) e [`supabase/003_cadastro_e_aprovacao.sql`](supabase/003_cadastro_e_aprovacao.sql) (cadastro com aprovação).
3. Em **Authentication › Sign In / Providers**, **desligue** “Allow new users to sign up”. O botão **Criar conta** do painel continua funcionando (a conta é criada pelo servidor do painel, já confirmada) — assim ninguém cria conta por fora do painel. A opção “Confirm email” não importa: o Supabase não pede nenhuma confirmação. Contas novas ficam **aguardando aprovação** e não veem nada até um administrador geral aprovar no painel.
4. Em **Authentication › Sessions**, deixe **Time-box user sessions** e **Inactivity timeout** desligados (padrão) — assim quem entra continua conectado até clicar em **Sair**.
5. Crie o seu usuário (será o administrador geral):
   **Authentication › Users › Add user › Create new user** → seu e-mail + uma senha, marque **Auto Confirm User**.
6. Anote as chaves em **Project Settings › API Keys** (ou *API*):
   - **Project URL**
   - **Publishable key** (ou a antiga *anon public*)
   - **Secret key** (ou a antiga *service_role*) — é secreta, nunca compartilhe.

### 2. Vercel — site

1. Em [vercel.com/new](https://vercel.com/new) importe o repositório **`nickdardo/bosspainel`**.
2. Em **Environment Variables** adicione:

   | Nome | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL do Supabase |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (ou anon key) |
   | `SUPABASE_SECRET_KEY` | Secret key (ou service_role key) |

3. Clique em **Deploy**. Ao terminar, copie o endereço (ex.: `https://bosspainel.vercel.app`).
4. **Velocidade:** em **Settings › Functions › Function Region**, escolha a mesma região do seu Supabase (veja em Supabase › Project Settings › General). Se o Supabase está em São Paulo (`sa-east-1`), escolha **São Paulo, Brazil (gru1)**. Com regiões diferentes, cada tela fica bem mais lenta.

### 3. Supabase — endereço do site

Em **Authentication › URL Configuration**:

- **Site URL:** o endereço da Vercel (ex.: `https://bosspainel.vercel.app`)
- **Redirect URLs:** adicione `https://bosspainel.vercel.app/**` (e `http://localhost:3000/**` se for rodar no computador)

**Opcional (recomendado)** — para o “Esqueci minha senha” funcionar mesmo abrindo o e-mail em outro aparelho, em **Authentication › Emails › Reset Password** troque o link do modelo por:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/conta">Criar nova senha</a>
```

> O e-mail padrão do Supabase tem limite de poucos envios por hora. Isso só afeta o “Esqueci minha senha” — os **convites** são links gerados pelo painel e enviados por você (WhatsApp), sem e-mail. Se quiser e-mails sem limite, configure um SMTP (ex.: Resend) em **Authentication › Emails › SMTP Settings**.

### 4. Primeiro uso

1. Entre com o e-mail e senha criados no passo 1.5. Marque “Lembrar meu e-mail e senha” — o navegador guarda a senha e você continua conectado até clicar em Sair.
2. **Novo evento** → preencha nome, data, local e orçamento.
3. Em **Categorias**, ajuste o valor previsto de cada uma.
4. Cada pessoa abre o painel, toca em **Criar conta** e cadastra nome, e-mail e senha. A conta fica **aguardando aprovação**.
5. Um **administrador geral** aprova no painel: **Equipe › Pedidos de acesso** → **Aprovar como administrador** (vê tudo: todos os eventos, todos os logs, equipe online) ou **Aprovar como membro** (vê só os eventos em que for adicionado em Responsáveis). Ou **Recusar**. Não é preciso fazer nada no Supabase.
6. A tela da pessoa abre o painel sozinha em até 20 segundos depois de aprovada.
7. Alternativa: em **Responsáveis › Convidar pessoa** você ainda pode gerar um link de convite (já aprovado) e mandar pelo WhatsApp.

**Logs gerais** (menu do topo e da lateral, só administradores gerais): tudo o que aconteceu em todos os eventos, contas aprovadas/recusadas, quem virou administrador e todas as entradas e saídas — os 5 administradores veem os mesmos logs.
   - O link vale uma única vez e expira (padrão do Supabase: 1 hora; dá para aumentar em **Authentication › Providers › Email › Email OTP Expiration**, até 24 h). Se expirar, use o botão **Link de acesso** na linha da pessoa.
5. Pessoas que já têm acesso ao painel podem ser adicionadas a outros eventos pelo mesmo formulário (entram com a senha de sempre).

---

## Aplicativo no celular (PWA)

O painel é um aplicativo instalável — não precisa de loja:

- **Android (Chrome):** aparece o botão **Instalar app** (na tela de entrada, na lista de eventos, no Menu e em Minha conta). Depois de instalado, fica na gaveta de apps com o ícone da BSS e abre em tela cheia.
- **iPhone (Safari):** toque em **Compartilhar › Adicionar à Tela de Início › Adicionar**. O painel mostra esse passo a passo.
- Continua conectado, atualiza os números ao voltar para o app e mostra a tela “Sem conexão” quando falta internet.

## Atualizações do banco

Se o painel já estava no ar, rode no SQL Editor apenas os arquivos novos, na ordem:

| Arquivo | O que adiciona |
|---|---|
| `supabase/002_online_e_logs.sql` | Equipe online, histórico de entradas/saídas e logs |
| `supabase/003_cadastro_e_aprovacao.sql` | Cadastro pelo painel com aprovação e administradores gerais |

## Rodar no computador (opcional)

```bash
npm install
cp .env.example .env.local   # preencha com as chaves do Supabase
npm run dev                  # abre em http://localhost:3000
```

## Tarefas úteis no Supabase (SQL Editor)

```sql
-- tornar alguém administrador geral
update public.perfis set super_admin = true where email = 'pessoa@email.com';
```

## Estrutura

```
app/
  login/                     entrar e “esqueci minha senha”
  auth/confirm/              recebe os links de convite/acesso
  conta/                     nome e senha
  eventos/                   lista de eventos e “novo evento”
  eventos/[id]/              visão geral do evento
  eventos/[id]/gastos/       lista, novo, editar, comprovante e exportar CSV
  eventos/[id]/categorias/   categorias e valores previstos
  eventos/[id]/responsaveis/ equipe, papéis e convites
  eventos/[id]/configurar/   dados do evento (admin)
  eventos/[id]/logs/         histórico de alterações do evento (admin)
  equipe/                    equipe online e histórico de acessos (admins)
components/                  barra lateral, ícones, botões
lib/                         acesso ao Supabase, formatação (R$, datas), consultas
supabase/schema.sql          banco: tabelas, permissões, gatilhos e storage
supabase/002_online_e_logs.sql  sessões (online/entrou/saiu) e logs de auditoria
supabase/003_cadastro_e_aprovacao.sql  cadastro com aprovação e administradores gerais
```
