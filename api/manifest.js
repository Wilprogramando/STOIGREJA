/**
 * MANIFESTO DO APP NA COR ESCOLHIDA
 *
 * É o arquivo que o celular lê para instalar o sistema como aplicativo. De lá
 * saem o nome, o ícone e - o que interessa aqui - a COR DA TELA DE ABERTURA
 * que o próprio celular desenha antes do app carregar.
 *
 * O public/manifest.webmanifest é fixo e vinha sempre no índigo de fábrica,
 * por isso essa tela aparecia de outra cor no celular. Aqui o mesmo manifesto
 * é montado na hora com a cor escolhida em Configurações > Aparência.
 *
 * ATENÇÃO: o celular copia essas informações NO MOMENTO DA INSTALAÇÃO. Trocar
 * a cor depois não repinta o atalho que já está na tela inicial - para isso é
 * preciso instalar de novo.
 *
 * Rota:
 *   GET /api/manifest?cor=%234f46e5&escura=%237c3aed  ->  manifesto em JSON
 */

const COR_PADRAO = '#4f46e5';
const ESCURA_PADRAO = '#7c3aed';

function corSegura(valor, padrao) {
  const cor = String(valor || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(cor) ? cor : padrao;
}

export default function handler(req, res) {
  const principal = corSegura(req.query?.cor, COR_PADRAO);
  const escura = corSegura(req.query?.escura, ESCURA_PADRAO);
  const icone = `/api/icone?cor=${encodeURIComponent(principal)}`;

  res.setHeader('content-type', 'application/manifest+json; charset=utf-8');
  res.setHeader('cache-control', 'public, max-age=86400');
  res.status(200).json({
    name: 'Conjunto Manancial - Repertório',
    short_name: 'Repertório',
    description: 'Gerenciador de hinos e repertórios de cultos',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    lang: 'pt-BR',
    // Cor da tela que o celular desenha sozinho antes do app abrir.
    background_color: principal,
    theme_color: principal,
    icons: [
      { src: icone, sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
      { src: icone, sizes: '192x192', type: 'image/svg+xml', purpose: 'maskable' },
    ],
    _comentario: `Degradê da abertura vai de ${principal} a ${escura} (ver index.html).`,
  });
}
