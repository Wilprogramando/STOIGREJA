# Backup mensal por e-mail

Todo dia **1º de cada mês, às 9h (UTC)**, a Vercel chama `/api/backup-mensal`.
A função lê as tabelas do Supabase, monta o mesmo JSON do botão
"Exportar Backup" e envia o arquivo anexado por e-mail.

Destino configurado: **williananjos123@gmail.com**

## O que falta fazer (uma vez só)

### 1. Criar a conta de envio (Resend)

1. Criar conta gratuita em <https://resend.com> (3.000 e-mails/mês).
2. Em **API Keys**, gerar uma chave e copiar.
3. Em **Domains**, verificar um domínio *ou* usar o remetente de teste
   `onboarding@resend.dev` (funciona sem domínio próprio).

### 2. Pegar a chave de serviço do Supabase

No painel do Supabase: **Settings → API → service_role**.
Essa chave ignora as regras de acesso, então só pode ficar na Vercel —
nunca no código do site.

### 3. Cadastrar as variáveis na Vercel

**Settings → Environment Variables**, no ambiente *Production*:

| Nome | Valor |
| --- | --- |
| `SUPABASE_URL` | mesma URL que já está em `VITE_SUPABASE_URL` |
| `SUPABASE_SERVICE_KEY` | a chave `service_role` do passo 2 |
| `RESEND_API_KEY` | a chave do passo 1 |
| `BACKUP_EMAIL_DE` | `onboarding@resend.dev` (ou o remetente do seu domínio) |
| `BACKUP_EMAIL_PARA` | `williananjos123@gmail.com` |
| `CRON_SECRET` | qualquer senha longa inventada por você |

### 4. Publicar

Fazer um novo deploy. A Vercel lê o `vercel.json` e cria o agendamento
sozinha — dá para conferir em **Settings → Cron Jobs**.

## Testar sem esperar o mês virar

Na página de **Cron Jobs** da Vercel existe o botão **Run** para disparar na hora.

Pelo terminal também dá:

```bash
curl -H "Authorization: Bearer SUA_CRON_SECRET" https://SEU-SITE.vercel.app/api/backup-mensal
```

Resposta esperada:

```json
{ "ok": true, "enviadoPara": "williananjos123@gmail.com", "resumo": { "hinos": 120, "repertorios": 8, "anotacoes": 3, "configuracoes": 1 } }
```

## Observações

- O plano gratuito (Hobby) da Vercel permite agendamentos com granularidade
  diária. Uma vez por mês está dentro do limite.
- A restauração continua manual: **Configurações → Backup e Restauração →
  Importar Backup**, escolhendo o arquivo do e-mail.
- O backup cobre o que está no Supabase (hinos, repertórios, anotações e
  configurações). Menus desligados e contagem de acessos ficam no aparelho e
  não entram nesse arquivo.
