/**
 * ÍCONE DO APP NA COR ESCOLHIDA
 *
 * Devolve o mesmo desenho de sempre - o quadrado arredondado com a nota
 * musical branca - pintado com a cor que vier no endereço.
 *
 * Existe como rota de servidor, e não só como arquivo em public/, porque o
 * celular precisa BAIXAR o ícone na hora de instalar o app: um endereço de
 * verdade funciona para isso, um desenho embutido no manifesto não.
 *
 * Rota:
 *   GET /api/icone?cor=%234f46e5  ->  SVG do ícone naquela cor
 */

const COR_PADRAO = '#4f46e5';

/** Só aceita cor em hexadecimal, para ninguém injetar nada no desenho. */
function corSegura(valor) {
  const cor = String(valor || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(cor) ? cor : COR_PADRAO;
}

export default function handler(req, res) {
  const cor = corSegura(req.query?.cor);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="96" fill="${cor}"/>
  <path d="M330 120v168a56 56 0 1 1-32-50V186l-96 24v134a56 56 0 1 1-32-50V180a24 24 0 0 1 18-23l120-30a24 24 0 0 1 22 5 24 24 0 0 1 0 18z" fill="#fff"/>
</svg>`;

  res.setHeader('content-type', 'image/svg+xml; charset=utf-8');
  // Cada cor é um endereço diferente, então pode ficar guardado bastante tempo.
  res.setHeader('cache-control', 'public, max-age=31536000, immutable');
  res.status(200).send(svg);
}
