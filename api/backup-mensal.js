/**
 * BACKUP MENSAL POR E-MAIL
 *
 * Roda no servidor (Vercel Cron), no dia 1 de cada mês: lê as tabelas do
 * Supabase, monta um JSON igual ao do botão "Exportar Backup" e manda esse
 * arquivo anexado por e-mail.
 *
 * Variáveis de ambiente necessárias no painel da Vercel:
 *   SUPABASE_URL          - mesma URL usada pelo app
 *   SUPABASE_SERVICE_KEY  - chave "service_role" do Supabase (NUNCA no front-end)
 *   RESEND_API_KEY        - chave da conta em resend.com
 *   BACKUP_EMAIL_DE       - remetente verificado no Resend
 *   BACKUP_EMAIL_PARA     - destino do backup
 *   CRON_SECRET           - senha que a Vercel envia junto da chamada agendada
 */

import { createClient } from '@supabase/supabase-js';

const TABELAS = [
  ['hinos', 'hinos_cadastro'],
  ['repertorios', 'repertorios_cultos'],
  ['anotacoes', 'anotacoes_hinos'],
  ['configuracoes', 'configuracoes_sistema'],
];

export default async function handler(req, res) {
  // Só a própria Vercel (ou quem tiver o segredo) pode disparar o backup.
  const segredo = process.env.CRON_SECRET;
  if (segredo && req.headers.authorization !== `Bearer ${segredo}`) {
    return res.status(401).json({ erro: 'Não autorizado' });
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY } = process.env;
  const para = process.env.BACKUP_EMAIL_PARA;
  const de = process.env.BACKUP_EMAIL_DE;

  const faltando = Object.entries({
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
    RESEND_API_KEY,
    BACKUP_EMAIL_PARA: para,
    BACKUP_EMAIL_DE: de,
  })
    .filter(([, valor]) => !valor)
    .map(([nome]) => nome);

  if (faltando.length) {
    return res.status(500).json({ erro: `Faltam variáveis: ${faltando.join(', ')}` });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const dados = {};
    const resumo = {};

    for (const [chave, tabela] of TABELAS) {
      const { data, error } = await supabase.from(tabela).select('*');
      if (error) throw new Error(`Tabela ${tabela}: ${error.message}`);

      dados[chave] = data || [];
      resumo[chave] = dados[chave].length;
    }

    const agora = new Date();
    const carimbo = agora.toISOString().split('T')[0];

    const backup = {
      version: '1.0',
      exportedAt: agora.toISOString(),
      origem: 'backup automático mensal',
      data: dados,
    };

    const anexo = Buffer.from(JSON.stringify(backup, null, 2)).toString('base64');

    const linhas = Object.entries(resumo)
      .map(([nome, total]) => `<li><strong>${total}</strong> ${nome}</li>`)
      .join('');

    const envio = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: de,
        to: [para],
        subject: `Backup do Repertório da Igreja - ${carimbo}`,
        html: `
          <p>Segue o backup automático do sistema.</p>
          <ul>${linhas}</ul>
          <p style="color:#666;font-size:13px">
            Para restaurar: Configurações &rarr; Backup e Restauração &rarr; Importar Backup,
            escolhendo o arquivo anexado.
          </p>
        `,
        attachments: [{ filename: `repertorio-backup-${carimbo}.json`, content: anexo }],
      }),
    });

    if (!envio.ok) {
      const detalhe = await envio.text();
      throw new Error(`Resend respondeu ${envio.status}: ${detalhe}`);
    }

    return res.status(200).json({ ok: true, enviadoPara: para, resumo });
  } catch (erro) {
    console.error('Falha no backup mensal:', erro);
    return res.status(500).json({ erro: String(erro.message || erro) });
  }
}
