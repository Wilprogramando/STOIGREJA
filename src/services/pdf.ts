import html2pdf from 'html2pdf.js';
import { Hino, Repertorio, Configuracoes } from '../types';

export async function generateHinoPdf(
  hino: Hino,
  configuracoes: Configuracoes | null,
  logo?: string
) {
  const html = `
    <div style="font-family: 'Arial', sans-serif; color: #333; line-height: 1.4;">
      <div style="text-align: center; margin-bottom: 20px;">
        ${configuracoes?.nomeIgreja ? `<h1 style="font-size: 14px; color: #E65100; margin: 5px 0; font-weight: bold;">${configuracoes.nomeIgreja}</h1>` : ''}
      </div>
      
      <div style="border-bottom: 2px solid #E65100; margin-bottom: 15px;"></div>
      
      <h2 style="font-size: 18px; color: #E65100; margin: 0 0 10px 0; font-weight: bold;">
        ${hino.nome}
        ${logo ? `<img src="${logo}" style="max-height: 40px; margin-left: 10px; vertical-align: middle;">` : ''}
      </h2>
      
      <div style="margin-bottom: 15px; background-color: #f9f9f9; padding: 8px 10px; border-left: 3px solid #E65100; font-size: 11px;">
        <p style="margin: 3px 0;"><strong style="color: #E65100;">Tom:</strong> ${hino.tom}</p>
        <p style="margin: 3px 0;"><strong style="color: #E65100;">Cantor:</strong> ${hino.cantor}</p>
        ${hino.numeroHarpa ? `<p style="margin: 3px 0;"><strong style="color: #E65100;">Harpa nº:</strong> ${hino.numeroHarpa}</p>` : ''}
        ${hino.categoria ? `<p style="margin: 3px 0;"><strong style="color: #E65100;">Categoria:</strong> ${hino.categoria}</p>` : ''}
      </div>
      
      <div style="white-space: pre-wrap; font-size: 13px; line-height: 1.6; margin-bottom: 20px; background-color: white;">
${hino.letra}
      </div>
      
      ${hino.observacoes ? `
        <div style="background-color: #fff8e1; padding: 8px 10px; border-left: 3px solid #FBC02D; margin-bottom: 15px; font-size: 10px;">
          <p style="margin: 0 0 5px 0;"><strong style="color: #E65100;">Observações:</strong></p>
          <div style="white-space: pre-wrap; color: #555;">${hino.observacoes}</div>
        </div>
      ` : ''}
      
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
  const logoHtml = logo ? `<img src="${logo}" style="max-height: 40px; margin-bottom: 10px;">` : '';
  
  let html = `
    <div style="font-family: 'Arial', sans-serif; color: #333; line-height: 1.4;">
      <div style="text-align: center; margin-bottom: 15px;">
        ${logoHtml}
        ${configuracoes?.nomeIgreja ? `<h1 style="font-size: 14px; color: #E65100; margin: 5px 0; font-weight: bold;">${configuracoes.nomeIgreja}</h1>` : ''}
      </div>
      
      <div style="border-bottom: 2px solid #E65100; margin-bottom: 15px;"></div>
      
      <h2 style="font-size: 16px; color: #E65100; text-align: center; margin: 0 0 10px 0; font-weight: bold;">${repertorio.nome}</h2>
      
      <div style="text-align: center; margin-bottom: 15px; color: #666; font-size: 11px;">
        <p style="margin: 2px 0;"><strong style="color: #E65100;">Data:</strong> ${
          repertorio.data 
            ? repertorio.data.includes('-') 
              ? repertorio.data.split('-').reverse().join('/')
              : repertorio.data
            : 'Data não definida'
        }</p>
        ${repertorio.horario ? `<p style="margin: 2px 0;"><strong style="color: #E65100;">Horário:</strong> ${repertorio.horario}</p>` : ''}
      </div>
      
      ${repertorio.observacoes ? `
        <div style="background-color: #fff8e1; padding: 8px 10px; border-left: 3px solid #FBC02D; margin-bottom: 15px; font-size: 10px;">
          <p style="margin: 0 0 3px 0;"><strong style="color: #E65100;">Observações:</strong></p>
          <div style="white-space: pre-wrap; color: #555;">${repertorio.observacoes}</div>
        </div>
      ` : ''}
      
      <h3 style="font-size: 14px; color: #E65100; margin: 15px 0 10px 0; border-bottom: 2px solid #E65100; padding-bottom: 5px; font-weight: bold;">Sequência de Hinos</h3>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px;">
        <thead>
          <tr style="background-color: #f5f5f5; border-bottom: 2px solid #E65100;">
            <th style="padding: 5px; text-align: center; border: 1px solid #ddd; color: #E65100; font-weight: bold; width: 30px;">#</th>
            <th style="padding: 5px; text-align: left; border: 1px solid #ddd; color: #E65100; font-weight: bold;">Hino</th>
            <th style="padding: 5px; text-align: center; border: 1px solid #ddd; color: #E65100; font-weight: bold; width: 45px;">Tom</th>
            <th style="padding: 5px; text-align: left; border: 1px solid #ddd; color: #E65100; font-weight: bold;">Cantor</th>
          </tr>
        </thead>
        <tbody>
  `;

  repertorio.hinos.forEach((hinoRep) => {
    html += `
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 5px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: #E65100; background-color: #f9f9f9;">${hinoRep.ordem}</td>
            <td style="padding: 5px; border: 1px solid #ddd;">
              ${hinoRep.nome}
              ${hinoRep.numeroHarpa ? ` <span style="color: #999; font-size: 9px;">(Harpa ${hinoRep.numeroHarpa})</span>` : ''}
            </td>
            <td style="padding: 5px; border: 1px solid #ddd; text-align: center;">${hinoRep.tom}</td>
            <td style="padding: 5px; border: 1px solid #ddd;">${hinoRep.cantor}</td>
          </tr>
    `;
  });

  html += `
        </tbody>
      </table>
  `;

  if (incluirLetras) {
    html += `<div style="page-break-before: always; border-top: 2px solid #E65100; padding-top: 15px; margin-top: 15px;"><h3 style="font-size: 14px; color: #E65100; margin: 0 0 15px 0; border-bottom: 2px solid #E65100; padding-bottom: 5px; font-weight: bold;">Letras dos Hinos</h3>`;
    
    repertorio.hinos.forEach((hinoRep, index) => {
      if (hinoRep.letra) {
        // Adiciona quebra de página antes de cada hino com letra (exceto o primeiro)
        const pageBreak = index > 0 ? `<div style="page-break-before: always; margin-top: 10px;"></div>` : '';
        
        html += `
          ${pageBreak}
          <div style="margin-bottom: 20px;">
            <h4 style="color: #E65100; margin: 0 0 8px 0; font-size: 12px; font-weight: bold; background-color: #f9f9f9; padding: 5px;">
              ${hinoRep.ordem}. ${hinoRep.nome} ${hinoRep.numeroHarpa ? `(Harpa nº ${hinoRep.numeroHarpa})` : ''}
            </h4>
            <p style="font-size: 10px; margin: 5px 0; color: #666;"><strong style="color: #E65100;">Tom:</strong> ${hinoRep.tom} | <strong style="color: #E65100;">Cantor:</strong> ${hinoRep.cantor}</p>
            <div style="white-space: pre-wrap; font-size: 13px; line-height: 1.6; background-color: #f9f9f9; padding: 8px; border-left: 3px solid #E65100; color: #333;">
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
