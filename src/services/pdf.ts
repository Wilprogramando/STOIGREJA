import html2pdf from 'html2pdf.js';
import { Hino, Repertorio, Configuracoes } from '../types';

export async function generateHinoPdf(
  hino: Hino,
  configuracoes: Configuracoes | null,
  logo?: string
) {
  const html = `
    <div style="font-family: 'Arial', sans-serif; color: #333; line-height: 1.4;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
        <div style="flex: 1;">
          ${configuracoes?.nomeIgreja ? `<h1 style="font-size: 14px; color: #E65100; margin: 0; font-weight: bold;">${configuracoes.nomeIgreja}</h1>` : ''}
        </div>
        <div>
          ${logo ? `<img src="${logo}" style="max-height: 50px; margin-left: 15px;">` : ''}
        </div>
      </div>
      
      <div style="border-bottom: 2px solid #E65100; margin-bottom: 15px;"></div>
      
      <h2 style="font-size: 18px; color: #E65100; margin: 0 0 10px 0; font-weight: bold;">
        ${hino.nome}
      </h2>
      
      <div style="margin-bottom: 12px; background-color: #f9f9f9; padding: 6px 8px; border-left: 3px solid #E65100; font-size: 10px;">
        <p style="margin: 2px 0;"><strong style="color: #E65100;">Tom:</strong> ${hino.tom}</p>
        <p style="margin: 2px 0;"><strong style="color: #E65100;">Cantor:</strong> ${hino.cantor}</p>
        ${hino.numeroHarpa ? `<p style="margin: 2px 0;"><strong style="color: #E65100;">Harpa nº:</strong> ${hino.numeroHarpa}</p>` : ''}
        ${hino.categoria ? `<p style="margin: 2px 0;"><strong style="color: #E65100;">Categoria:</strong> ${hino.categoria}</p>` : ''}
      </div>
      
      <div style="column-count: 2; column-gap: 15px; column-rule: 1px solid #ddd; white-space: pre-wrap; font-size: 14px; line-height: 1.6; margin-bottom: 15px; background-color: white;">
${hino.letra}
      </div>
      
      ${hino.observacoes ? `
        <div style="background-color: #fff8e1; padding: 6px 8px; border-left: 3px solid #FBC02D; margin-bottom: 12px; font-size: 9px;">
          <p style="margin: 0 0 3px 0;"><strong style="color: #E65100;">Observações:</strong></p>
          <div style="white-space: pre-wrap; color: #555;">${hino.observacoes}</div>
        </div>
      ` : ''}
      
      <div style="border-top: 1px solid #ddd; margin-top: 15px; padding-top: 8px; text-align: center; font-size: 8px; color: #999;">
        ${configuracoes?.rodapePdf ? `<p style="margin: 0;">${configuracoes.rodapePdf}</p>` : ''}
        <p style="margin: 2px 0;">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
      </div>
    </div>
  `;

  const element = document.createElement('div');
  element.innerHTML = html;

  const opt = {
    margin: [4, 4, 4, 4],
    filename: `${hino.nome.replace(/\s+/g, '_')}.pdf`,
    image: { type: 'jpeg', quality: 0.95 },
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
    <div style="font-family: 'Arial', sans-serif; color: #333; line-height: 1.4;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
        <div style="flex: 1;">
          ${configuracoes?.nomeIgreja ? `<h1 style="font-size: 13px; color: #E65100; margin: 0; font-weight: bold;">${configuracoes.nomeIgreja}</h1>` : ''}
        </div>
        <div>
          ${logo ? `<img src="${logo}" style="max-height: 45px; margin-left: 15px;">` : ''}
        </div>
      </div>
      
      <div style="border-bottom: 2px solid #E65100; margin-bottom: 12px;"></div>
      
      <h2 style="font-size: 15px; color: #E65100; text-align: center; margin: 0 0 8px 0; font-weight: bold;">${repertorio.nome}</h2>
      
      <div style="text-align: center; margin-bottom: 12px; color: #666; font-size: 10px;">
        <p style="margin: 1px 0;"><strong style="color: #E65100;">Data:</strong> ${
          repertorio.data 
            ? repertorio.data.includes('-') 
              ? repertorio.data.split('-').reverse().join('/')
              : repertorio.data
            : 'Data não definida'
        }</p>
        ${repertorio.horario ? `<p style="margin: 1px 0;"><strong style="color: #E65100;">Horário:</strong> ${repertorio.horario}</p>` : ''}
      </div>
      
      ${repertorio.observacoes ? `
        <div style="background-color: #fff8e1; padding: 6px 8px; border-left: 3px solid #FBC02D; margin-bottom: 12px; font-size: 9px;">
          <p style="margin: 0 0 2px 0;"><strong style="color: #E65100;">Observações:</strong></p>
          <div style="white-space: pre-wrap; color: #555; font-size: 8px;">${repertorio.observacoes}</div>
        </div>
      ` : ''}
      
      <h3 style="font-size: 12px; color: #E65100; margin: 10px 0 8px 0; border-bottom: 2px solid #E65100; padding-bottom: 3px; font-weight: bold;">Sequência de Hinos</h3>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 9px;">
        <thead>
          <tr style="background-color: #f5f5f5; border-bottom: 2px solid #E65100;">
            <th style="padding: 3px; text-align: center; border: 1px solid #ddd; color: #E65100; font-weight: bold; width: 25px;">#</th>
            <th style="padding: 3px; text-align: left; border: 1px solid #ddd; color: #E65100; font-weight: bold;">Hino</th>
            <th style="padding: 3px; text-align: center; border: 1px solid #ddd; color: #E65100; font-weight: bold; width: 40px;">Tom</th>
            <th style="padding: 3px; text-align: left; border: 1px solid #ddd; color: #E65100; font-weight: bold;">Cantor</th>
          </tr>
        </thead>
        <tbody>
  `;

  repertorio.hinos.forEach((hinoRep) => {
    html += `
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 3px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: #E65100; background-color: #f9f9f9; font-size: 9px;">${hinoRep.ordem}</td>
            <td style="padding: 3px; border: 1px solid #ddd; font-size: 9px;">
              ${hinoRep.nome}
              ${hinoRep.numeroHarpa ? ` <span style="color: #999; font-size: 8px;">(Harpa ${hinoRep.numeroHarpa})</span>` : ''}
            </td>
            <td style="padding: 3px; border: 1px solid #ddd; text-align: center; font-size: 9px;">${hinoRep.tom}</td>
            <td style="padding: 3px; border: 1px solid #ddd; font-size: 9px;">${hinoRep.cantor}</td>
          </tr>
    `;
  });

  html += `
        </tbody>
      </table>
  `;

  if (incluirLetras) {
    html += `<div style="page-break-before: always; border-top: 2px solid #E65100; padding-top: 10px; margin-top: 10px;"><h3 style="font-size: 12px; color: #E65100; margin: 0 0 10px 0; border-bottom: 2px solid #E65100; padding-bottom: 3px; font-weight: bold;">Letras dos Hinos</h3>`;
    
    repertorio.hinos.forEach((hinoRep, index) => {
      if (hinoRep.letra) {
        // Adiciona quebra de página antes de cada hino com letra (exceto o primeiro)
        const pageBreak = index > 0 ? `<div style="page-break-before: always; margin-top: 5px;"></div>` : '';
        
        html += `
          ${pageBreak}
          <div style="margin-bottom: 15px;">
            <h4 style="color: #E65100; margin: 0 0 5px 0; font-size: 11px; font-weight: bold; background-color: #f9f9f9; padding: 3px;">
              ${hinoRep.ordem}. ${hinoRep.nome} ${hinoRep.numeroHarpa ? `(Harpa ${hinoRep.numeroHarpa})` : ''}
            </h4>
            <p style="font-size: 9px; margin: 3px 0; color: #666;"><strong style="color: #E65100;">Tom:</strong> ${hinoRep.tom} | <strong style="color: #E65100;">Cantor:</strong> ${hinoRep.cantor}</p>
            <div style="white-space: pre-wrap; font-size: 12px; line-height: 1.5; background-color: #f9f9f9; padding: 6px; border-left: 3px solid #E65100; color: #333;">
${hinoRep.letra}
            </div>
          </div>
        `;
      }
    });
    
    html += `</div>`;
  }

  html += `
      <div style="border-top: 1px solid #ddd; margin-top: 20px; padding-top: 10px; text-align: center; font-size: 9px; color: #999;">
        ${configuracoes?.rodapePdf ? `<p style="margin: 0;">${configuracoes.rodapePdf}</p>` : ''}
        <p style="margin: 3px 0;">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
      </div>
    </div>
  `;

  const element = document.createElement('div');
  element.innerHTML = html;

  const opt = {
    margin: [5, 5, 5, 5],
    filename: `${repertorio.nome.replace(/\s+/g, '_')}.pdf`,
    image: { type: 'jpeg', quality: 0.95 },
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
