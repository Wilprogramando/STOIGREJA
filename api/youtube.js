/**
 * ACHA O VIDEO NO YOUTUBE
 *
 * Recebe o nome da musica e devolve o codigo do primeiro video da busca,
 * para o sistema abrir o video direto em vez da lista de resultados.
 *
 * Roda no servidor (Vercel) porque a pagina do YouTube nao libera CORS.
 *
 * Rota:
 *   GET /api/youtube?q=nome da musica cantor  ->  { id, url }
 */

const CABECALHOS = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
  'accept-language': 'pt-BR,pt;q=0.9',
};

export default async function handler(req, res) {
  res.setHeader('cache-control', 'public, max-age=3600');

  const termo = (req.query?.q || '').trim();
  if (termo.length < 2) {
    res.status(400).json({ erro: 'Informe o nome da musica.' });
    return;
  }

  try {
    const alvo = `https://www.youtube.com/results?search_query=${encodeURIComponent(
      termo
    )}&sp=EgIQAQ%253D%253D`; // filtro: so videos

    const resposta = await fetch(alvo, { headers: CABECALHOS });
    if (!resposta.ok) {
      res.status(502).json({ erro: 'O YouTube nao respondeu agora.' });
      return;
    }

    const html = await resposta.text();

    // O primeiro "videoId" da pagina e o primeiro resultado da busca.
    const achado = /"videoId":"([A-Za-z0-9_-]{11})"/.exec(html);
    if (!achado) {
      res.status(404).json({ erro: 'Nenhum video encontrado.' });
      return;
    }

    const id = achado[1];
    res.status(200).json({ id, url: `https://www.youtube.com/watch?v=${id}` });
  } catch (erro) {
    console.error('Erro ao procurar no YouTube:', erro);
    res.status(500).json({ erro: 'Erro ao procurar o video.' });
  }
}
