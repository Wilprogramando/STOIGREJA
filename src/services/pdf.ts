import html2pdf from 'html2pdf.js';
import { Hino, Repertorio, Configuracoes } from '../types';

export async function generateHinoPdf(
  hino: Hino,
  configuracoes: Configuracoes | null,
  logo?: string
) {
  // Letra em formato normal (1 coluna), quebra página naturalmente
  const styleLetra = 'font-family: "Arial", sans-serif; font-size: 13px; line-height: 1.8; color: #333; white-space: pre-wrap; text-align: left;';

  const html = `
    <div style="font-family: 'Arial', sans-serif; color: #333; background-color: white;">
      <!-- Cabeçalho -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; padding-right: 20px;">
        <div style="flex: 1;">
          <h1 style="font-size: 24px; font-weight: bold; color: #000; margin: 0 0 5px 0; line-height: 1.2;">
            ${hino.nome}
          </h1>
          <p style="font-size: 14px; color: #FF8C00; font-weight: bold; margin: 0 0 8px 0;">
            ${hino.cantor || 'Cantor'}
          </p>
          <p style="font-size: 12px; color: #666; margin: 0;">
            Composição de ${hino.categoria || 'Desconhecido'}
          </p>
        </div>
        <div style="text-align: right;">
          ${logo ? `<img src="${logo}" style="max-height: 60px; margin-top: 5px;">` : ''}
        </div>
      </div>

      <!-- Informações do Hino -->
      <div style="background-color: #f9f9f9; padding: 12px 15px; margin-bottom: 20px; border-left: 4px solid #FF8C00; font-size: 11px;">
        <p style="margin: 3px 0;"><strong>Tom:</strong> ${hino.tom}</p>
        <p style="margin: 3px 0;"><strong>Categoria:</strong> ${hino.categoria || 'Geral'}</p>
        ${hino.numeroHarpa ? `<p style="margin: 3px 0;"><strong>Harpa Cristã nº:</strong> ${hino.numeroHarpa}</p>` : ''}
      </div>

      <!-- Letra em 2 colunas ou 1 coluna -->
      <div style="${styleLetra}">
${hino.letra}
      </div>

      <!-- Observações -->
      ${hino.observacoes ? `
        <div style="background-color: #FFF8DC; padding: 12px 15px; margin-top: 20px; margin-bottom: 20px; border-left: 4px solid #FFB90F; font-size: 11px;">
          <p style="margin: 0 0 8px 0; font-weight: bold; color: #FF8C00;">Observações:</p>
          <div style="white-space: pre-wrap; color: #555; font-size: 11px;">${hino.observacoes}</div>
        </div>
      ` : ''}

      <!-- Rodapé -->
      <div style="border-top: 1px solid #ddd; margin-top: 25px; padding-top: 15px; text-align: center; font-size: 9px; color: #999;">
        ${configuracoes?.rodapePdf ? `<p style="margin: 0 0 5px 0;">${configuracoes.rodapePdf}</p>` : ''}
        <p style="margin: 0;">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
      </div>
    </div>
  `;

  const element = document.createElement('div');
  element.innerHTML = html;

  const opt = {
    margin: [15, 25, 15, 25],
    filename: `${hino.nome.replace(/\s+/g, '_')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4', compress: true }
  };

  return html2pdf()
    .set(opt)
    .from(element)
    .save();
}

export async function generateRepertorioPdf(
  repertorio: Repertorio,
  configuracoes: Configuracoes | null,
  incluirLetras: boolean = false,
  logo?: string
) {
  let html = `
    <div style="font-family: 'Arial', sans-serif; color: #333; background-color: white;">
      <!-- Cabeçalho -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; padding-right: 20px;">
        <div style="flex: 1;">
          ${configuracoes?.nomeIgreja ? `<h1 style="font-size: 16px; color: #000; margin: 0 0 5px 0; font-weight: bold;">${configuracoes.nomeIgreja}</h1>` : ''}
          <h2 style="font-size: 20px; color: #FF8C00; font-weight: bold; margin: 5px 0; line-height: 1.2;">
            ${repertorio.nome}
          </h2>
        </div>
        <div style="text-align: right;">
          ${logo ? `<img src="${logo}" style="max-height: 55px;">` : ''}
        </div>
      </div>

      <!-- Informações do Repertório -->
      <div style="background-color: #f9f9f9; padding: 12px 15px; margin-bottom: 20px; border-left: 4px solid #FF8C00; font-size: 11px;">
        <p style="margin: 3px 0;"><strong>Data:</strong> ${
          repertorio.data 
            ? repertorio.data.includes('-') 
              ? repertorio.data.split('-').reverse().join('/')
              : repertorio.data
            : 'Data não definida'
        }</p>
        ${repertorio.horario ? `<p style="margin: 3px 0;"><strong>Horário:</strong> ${repertorio.horario}</p>` : ''}
      </div>

      ${repertorio.observacoes ? `
        <div style="background-color: #FFF8DC; padding: 12px 15px; margin-bottom: 20px; border-left: 4px solid #FFB90F; font-size: 11px;">
          <p style="margin: 0 0 5px 0; font-weight: bold; color: #FF8C00;">Observações:</p>
          <div style="white-space: pre-wrap; color: #555; font-size: 10px;">${repertorio.observacoes}</div>
        </div>
      ` : ''}

      <!-- Tabela de Hinos -->
      <h3 style="font-size: 14px; color: #FF8C00; font-weight: bold; margin: 20px 0 15px 0; border-bottom: 2px solid #FF8C00; padding-bottom: 8px;">Sequência de Hinos</h3>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
        <thead>
          <tr style="background-color: #FFF8DC; border-bottom: 2px solid #FF8C00;">
            <th style="padding: 8px; text-align: center; border: 1px solid #ddd; color: #FF8C00; font-weight: bold; width: 40px;">#</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd; color: #FF8C00; font-weight: bold;">Hino</th>
            <th style="padding: 8px; text-align: center; border: 1px solid #ddd; color: #FF8C00; font-weight: bold; width: 50px;">Tom</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #ddd; color: #FF8C00; font-weight: bold;">Cantor</th>
          </tr>
        </thead>
        <tbody>
  `;

  repertorio.hinos.forEach((hinoRep) => {
    html += `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: #FF8C00;">${hinoRep.ordem}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${hinoRep.nome}
              ${hinoRep.numeroHarpa ? ` <span style="color: #999; font-size: 10px;">(Harpa ${hinoRep.numeroHarpa})</span>` : ''}
            </td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${hinoRep.tom}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${hinoRep.cantor}</td>
          </tr>
    `;
  });

  html += `
        </tbody>
      </table>
  `;

  if (incluirLetras) {
    html += `<div style="page-break-before: always;"><h3 style="font-size: 14px; color: #FF8C00; font-weight: bold; margin: 20px 0 15px 0; border-bottom: 2px solid #FF8C00; padding-bottom: 8px;">Letras dos Hinos</h3>`;
    
    repertorio.hinos.forEach((hinoRep, index) => {
      if (hinoRep.letra) {
        const pageBreak = index > 0 ? `<div style="page-break-before: always; margin-top: 20px;"></div>` : '';
        
        html += `
          ${pageBreak}
          <div style="margin-bottom: 25px;">
            <h4 style="font-size: 13px; color: #FF8C00; font-weight: bold; margin: 0 0 8px 0;">
              ${hinoRep.ordem}. ${hinoRep.nome}
              ${hinoRep.numeroHarpa ? `<span style="font-size: 11px; color: #666;"> (Harpa nº ${hinoRep.numeroHarpa})</span>` : ''}
            </h4>
            <p style="font-size: 11px; margin: 5px 0; color: #666;">
              <strong>Tom:</strong> ${hinoRep.tom} | <strong>Cantor:</strong> ${hinoRep.cantor}
            </p>
            <div style="white-space: pre-wrap; font-size: 12px; line-height: 1.7; color: #333; margin-top: 10px;">
${hinoRep.letra}
            </div>
          </div>
        `;
      }
    });
    
    html += `</div>`;
  }

  html += `
      <!-- Rodapé -->
      <div style="border-top: 1px solid #ddd; margin-top: 25px; padding-top: 15px; text-align: center; font-size: 9px; color: #999;">
        ${configuracoes?.rodapePdf ? `<p style="margin: 0 0 5px 0;">${configuracoes.rodapePdf}</p>` : ''}
        <p style="margin: 0;">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
      </div>
    </div>
  `;

  const element = document.createElement('div');
  element.innerHTML = html;

  const opt = {
    margin: [15, 25, 15, 25],
    filename: `${repertorio.nome.replace(/\s+/g, '_')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4', compress: true }
  };

  return html2pdf()
    .set(opt)
    .from(element)
    .save();
}

export function shareViaWhatsApp(message: string) {
  const text = encodeURIComponent(message);
  const url = `https://wa.me/?text=${text}`;
  window.open(url, '_blank');
}

export function openWhatsAppWithMessage(repertorio: Repertorio) {
  const message = `Segue o repertório do culto: *${repertorio.nome}*\nData: ${new Date(repertorio.data).toLocaleDateString('pt-BR')}\n\nHinos:\n${repertorio.hinos.map(h => `${h.ordem}. ${h.nome} (Tom: ${h.tom})`).join('\n')}`;
  shareViaWhatsApp(message);
}
