// Utilities for Exporting Reports to CSV / Excel and Print/PDF
import { StorageService } from '../services/storage';

export function exportToCsv(data: Record<string, any>[], filename: string) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(item => headers.map(h => item[h]));
  exportToCSV(filename, headers, rows);
}

export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent = [
    headers.join(';'),
    ...rows.map(row => 
      row.map(field => {
        const str = String(field ?? '');
        if (str.includes(';') || str.includes('\n') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(';')
    )
  ].join('\r\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function printStyledReport(
  contentHtml: string, 
  title: string = 'Relatório de Gestão',
  options?: {
    salonName?: string;
    slogan?: string;
    filialName?: string;
  }
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.print();
    return;
  }

  const config = StorageService.getConfig();
  const salonName = options?.salonName || config.salonNetworkName || 'Bom Corte Salões';
  const slogan = options?.slogan || config.slogan || 'Rede de Alta Performance & Gestão de Salões';
  const filialHeader = options?.filialName ? `<div style="font-size: 13px; color: #C8A45D; font-weight: 700; margin-top: 2px;">${options.filialName}</div>` : '';

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${title} — ${salonName}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #1a1a1a;
          margin: 25px;
          line-height: 1.5;
          background: #ffffff;
        }
        .header {
          border-bottom: 3px solid #C8A45D;
          padding-bottom: 14px;
          margin-bottom: 24px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .logo-title {
          font-size: 22px;
          font-weight: 900;
          color: #C8A45D;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .slogan {
          font-size: 13px;
          font-weight: 600;
          color: #4b5563;
          margin-top: 2px;
        }
        .meta {
          font-size: 11px;
          color: #6b7280;
          text-align: right;
          line-height: 1.4;
        }
        .meta-badge {
          display: inline-block;
          background: #FCF9F1;
          border: 1px solid #fed7aa;
          color: #c2410c;
          font-size: 10px;
          font-weight: bold;
          padding: 2px 8px;
          border-radius: 4px;
          margin-top: 4px;
        }
        .report-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 16px;
          margin-bottom: 24px;
          font-size: 12px;
        }
        .report-table th, .report-table td {
          padding: 9px 12px;
          border: 1px solid #e5e7eb;
        }
        .report-table th {
          background-color: #f9fafb;
          color: #374151;
          font-weight: 700;
          text-align: left;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .report-table tr:nth-child(even) {
          background-color: #fafafa;
        }
        .report-table td.money {
          font-family: monospace;
          font-weight: 600;
          text-align: right;
        }
        .report-table th.money {
          text-align: right;
        }
        .summary-box {
          background: #FCF9F1;
          border: 1px solid #F7F0E2;
          padding: 14px 18px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 12px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
          margin-top: 8px;
        }
        .metric-card {
          background: #ffffff;
          padding: 10px 14px;
          border-radius: 6px;
          border: 1px solid #fed7aa;
        }
        .metric-label {
          font-size: 11px;
          color: #9a3412;
          font-weight: 600;
          text-transform: uppercase;
        }
        .metric-value {
          font-size: 18px;
          font-weight: 800;
          color: #111827;
          font-family: monospace;
          margin-top: 2px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 15px;
          border-top: 1px solid #e5e7eb;
          font-size: 10px;
          color: #9ca3af;
          display: flex;
          justify-content: space-between;
        }
        @media print {
          body { margin: 10mm 15mm; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo-title">${salonName}</div>
          <div class="slogan">${slogan}</div>
          ${filialHeader}
        </div>
        <div class="meta">
          <div><strong>Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
          <div>Sistema de Gestão & Fechamento</div>
          <div class="meta-badge">AUTENTICADO DIGITALMENTE</div>
        </div>
      </div>
      ${contentHtml}
      <div class="footer">
        <div>${salonName} — ${slogan}</div>
        <div>Página 1 / 1</div>
      </div>
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export function printReport(title: string, headers: string[], rows: (string | number)[][], summaryHtml?: string) {
  const tableRows = rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
  const tableHtml = `
    <h2 style="margin-top:0; color:#111; font-size:18px;">${title}</h2>
    ${summaryHtml ? `<div class="summary-box">${summaryHtml}</div>` : ''}
    <table class="report-table">
      <thead>
        <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  `;
  printStyledReport(tableHtml, title);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const cleanStr = (dateString.length === 10 && dateString.includes('-')) 
      ? `${dateString}T00:00:00` 
      : dateString;
    const date = new Date(cleanStr);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return '-';
  try {
    const cleanStr = (dateString.length === 10 && dateString.includes('-')) 
      ? `${dateString}T00:00:00` 
      : dateString;
    const date = new Date(cleanStr);
    return `${date.toLocaleDateString('pt-BR')} ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return dateString;
  }
}

