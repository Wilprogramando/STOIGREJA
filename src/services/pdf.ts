import html2pdf from 'html2pdf.js';
import { Hino, Repertorio, Configuracoes } from '../types';

export async function generateHinoPdf(
  hino: Hino,
  configuracoes: Configuracoes | null,
  logo?: string
) {
  const html = `
    <div style="font-family: 'Arial', sans-serif; padding: 30px; max-width: 900px; color: #333;">
      <div style="text-align: center; margin-bottom: 30px;">
        ${configuracoes?.nomeIgreja ? `<h1 style="font-size: 16px; color: #E65100; margin: 10px 0; font-weight: bold;">${configuracoes.nomeIgreja}</h1>` : ''}
      </div>
      
      <div style="border-bottom: 2px solid #E65100; margin-bottom: 25px;"></div>
      
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
        <h2 style="font-size: 20px; color: #E65100; margin: 0; font-weight: bold; flex: 1;">${hino.nome}</h2>
        ${logo ? `<img src="${logo}" style="max-height: 60px; margin-left: 20px; flex-shrink: 0;">` : ''}
      </div>
      
      <div style="margin-bottom: 20px; background-color: #f9f9f9; padding: 12px 15px; border-left: 3px solid #E65100; line-height: 1.6; page-break-inside: avoid;">
        <p style="font-size: 12px; margin: 6px 0;"><strong style="color: #E65100;">Tom:</strong> ${hino.tom}</p>
        <p style="font-size: 12px; margin: 6px 0;"><strong style="color: #E65100;">Cantor:</strong> ${hino.cantor}</p>
        ${hino.numeroHarpa ? `<p style="font-size: 12px; margin: 6px 0;"><strong style="color: #E65100;">Hino da Harpa Cristã nº:</strong> ${hino.numeroHarpa}</p>` : ''}
        ${hino.categoria ? `<p style="font-size: 12px; margin: 6px 0;"><strong style="color: #E65100;">Categoria:</strong> ${hino.categoria}</p>` : ''}
      </div>
      
      <div style="white-space: pre-wrap; line-height: 1.8; margin-bottom: 25px; font-size: 20px; background-color: white; padding: 15px; border-radius: 3px; page-break-inside: avoid; page-break-before: auto;">
${hino.letra}
      </div>
      
      ${hino.observacoes ? `
        <div style="background-color: #fff8e1; padding: 12px 15px; border-left: 3px solid #FBC02D; margin-bottom: 20px; border-radius: 3px;">
          <p style="font-size: 12px; margin: 0; color: #666;"><strong style="color: #E65100;">Observações:</strong></p>
          <div style="white-space: pre-wrap; font-size: 12px; margin-top: 8px; color: #555;">${hino.observacoes}</div>
        </div>
      ` : ''}
      
      <div style="border-top: 1px solid #ddd; margin-top: 30px; padding-top: 15px; text-align: center;">
        <p style="font-size: 10px; color: #999; margin: 5px 0; line-height: 1.5;">
          ${configuracoes?.rodapePdf ? configuracoes.rodapePdf + '<br>' : ''}
          Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
        </p>
      </div>
    </div>
  `;

  const element = document.createElement('div');
  element.innerHTML = html;

  const opt = {
    margin: [20, 15, 20, 15],
    filename: `${hino.nome.replace(/\s+/g, '_')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
  };

  return html2pdf().set(opt).from(element).save();
}

export async function generateRepertorioPdf(
  repertorio: Repertorio,
  configuracoes: Configuracoes | null,
  incluirLetras: boolean = false,
  logo?: string
) {
  const logoHtml = logo ? `<img src="${logo}" style="max-height: 50px; margin-bottom: 15px;">` : '';
  
  let html = `
    <div style="font-family: 'Arial', sans-serif; padding: 30px; max-width: 950px; color: #333;">
      <div style="text-align: center; margin-bottom: 25px;">
        ${logoHtml}
        ${configuracoes?.nomeIgreja ? `<h1 style="font-size: 16px; color: #E65100; margin: 10px 0; font-weight: bold;">${configuracoes.nomeIgreja}</h1>` : ''}
      </div>
      
      <div style="border-bottom: 2px solid #E65100; margin-bottom: 25px;"></div>
      
      <h2 style="font-size: 20px; color: #E65100; text-align: center; margin: 0 0 15px 0; font-weight: bold;">${repertorio.nome}</h2>
      
      <div style="text-align: center; margin-bottom: 20px; color: #666; font-size: 12px;">
        <p style="margin: 4px 0;"><strong style="color: #E65100;">Data:</strong> ${new Date(repertorio.data).toLocaleDateString('pt-BR')}</p>
        ${repertorio.horario ? `<p style="margin: 4px 0;"><strong style="color: #E65100;">Horário:</strong> ${repertorio.horario}</p>` : ''}
      </div>
      
      ${repertorio.observacoes ? `
        <div style="background-color: #fff8e1; padding: 12px 15px; margin-bottom: 20px; border-left: 3px solid #FBC02D; border-radius: 3px;">
          <p style="font-size: 12px; margin: 0; color: #666;"><strong style="color: #E65100;">Observações:</strong></p>
          <div style="white-space: pre-wrap; font-size: 12px; margin-top: 8px; color: #555;">${repertorio.observacoes}</div>
        </div>
      ` : ''}
      
      <h3 style="font-size: 20px; color: #E65100; margin-top: 25px; margin-bottom: 15px; border-bottom: 2px solid #E65100; padding-bottom: 8px; font-weight: bold;">Sequência de Hinos</h3>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px;">
        <thead>
          <tr style="background-color: #f5f5f5; border-bottom: 2px solid #E65100;">
            <th style="padding: 10px 8px; text-align: center; border: 1px solid #ddd; color: #E65100; font-weight: bold; width: 40px;">#</th>
            <th style="padding: 10px 8px; text-align: left; border: 1px solid #ddd; color: #E65100; font-weight: bold;">Hino</th>
            <th style="padding: 10px 8px; text-align: center; border: 1px solid #ddd; color: #E65100; font-weight: bold; width: 60px;">Tom</th>
            <th style="padding: 10px 8px; text-align: left; border: 1px solid #ddd; color: #E65100; font-weight: bold;">Cantor</th>
          </tr>
        </thead>
        <tbody>
  `;

  repertorio.hinos.forEach((hinoRep) => {
    html += `
          <tr style="border-bottom: 1px solid #ddd;">
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center; font-weight: bold; color: #E65100;">${hinoRep.ordem}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">
              ${hinoRep.nome}
              ${hinoRep.numeroHarpa ? ` <span style="color: #999; font-size: 11px;">(Harpa nº ${hinoRep.numeroHarpa})</span>` : ''}
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
    html += `<h3 style="font-size: 20px; color: #E65100; margin-top: 35px; margin-bottom: 15px; border-bottom: 2px solid #E65100; padding-bottom: 8px; page-break-before: always; font-weight: bold;">Letras dos Hinos</h3>`;
    
    repertorio.hinos.forEach((hinoRep) => {
      if (hinoRep.letra) {
        html += `
          <div style="margin-bottom: 30px; page-break-inside: avoid;">
            <h4 style="color: #E65100; margin: 0 0 10px 0; font-size: 12px; font-weight: bold;">
              ${hinoRep.ordem}. ${hinoRep.nome} ${hinoRep.numeroHarpa ? `(Harpa nº ${hinoRep.numeroHarpa})` : ''}
            </h4>
            <div style="background-color: #f9f9f9; padding: 12px 15px; border-left: 3px solid #E65100; border-radius: 3px;">
              <p style="font-size: 11px; margin: 0 0 8px 0; color: #666;"><strong style="color: #E65100;">Tom:</strong> ${hinoRep.tom} | <strong style="color: #E65100;">Cantor:</strong> ${hinoRep.cantor}</p>
              <div style="white-space: pre-wrap; line-height: 1.7; margin-top: 10px; font-size: 20px; color: #333; page-break-inside: avoid;">
${hinoRep.letra}
              </div>
            </div>
          </div>
        `;
      }
    });
  }

  html += `
      <div style="border-top: 1px solid #ddd; margin-top: 30px; padding-top: 15px; text-align: center;">
        <p style="font-size: 10px; color: #999; margin: 5px 0; line-height: 1.5;">
          ${configuracoes?.rodapePdf ? configuracoes.rodapePdf + '<br>' : ''}
          Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
        </p>
      </div>
    </div>
  `;

  const element = document.createElement('div');
  element.innerHTML = html;

  const opt = {
    margin: [20, 15, 20, 15],
    filename: `${repertorio.nome.replace(/\s+/g, '_')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
  };

  return html2pdf().set(opt).from(element).save();
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
