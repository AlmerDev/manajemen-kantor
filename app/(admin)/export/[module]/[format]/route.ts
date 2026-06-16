export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { requireUser } from '@/lib/session';
import { getModule } from '@/lib/modules';
import { getLookups, getRow, moduleRows, relationLabel } from '@/lib/data';
import { bulanNama, rupiah, tanggal, waktu } from '@/lib/format';

type PdfColor = [number, number, number];
type PdfPage = { width: number; height: number; commands: string[] };

type PdfCell = { label: string; value: string; type?: string };

const PDF = {
  navy: [0.04, 0.1, 0.22] as PdfColor,
  blue: [0.12, 0.32, 0.88] as PdfColor,
  text: [0.06, 0.09, 0.16] as PdfColor,
  muted: [0.39, 0.45, 0.55] as PdfColor,
  line: [0.84, 0.87, 0.91] as PdfColor,
  soft: [0.97, 0.98, 1] as PdfColor,
  softAlt: [0.99, 0.99, 0.99] as PdfColor,
  green: [0.05, 0.55, 0.32] as PdfColor,
  red: [0.82, 0.15, 0.15] as PdfColor,
  amber: [0.78, 0.43, 0.07] as PdfColor,
  white: [1, 1, 1] as PdfColor
};

function filename(name: string, ext: string) {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `${name}-${stamp}.${ext}`;
}

function cell(row: any, col: any, lookups: any) {
  const value = col.relation ? relationLabel(row[col.key], col.relation, lookups) : row[col.key];
  if (col.type === 'money') return rupiah(value);
  if (col.type === 'date') return tanggal(value);
  if (col.type === 'time') return waktu(value);
  if (col.type === 'boolean') return value ? 'Aktif' : 'Nonaktif';
  if (col.type === 'month') return `${bulanNama[Number(row.bulan)] || row.bulan} ${row.tahun}`;
  if (col.type === 'progress') return `${Number(value || 0)}%`;
  if (col.type === 'status') return niceText(value);
  return value ?? '';
}

function niceText(input: any) {
  return String(input ?? '')
    .replace(/_/g, ' ')
    .replace(/\r/g, ' ')
    .replace(/\n/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanText(input: any) {
  return niceText(input)
    .replace(/[–—]/g, '-')
    .replace(/[^\x20-\x7E]/g, '')
    .trim();
}

function pdfEscape(text: string) {
  return cleanText(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function color(c: PdfColor) {
  return c.map((n) => Number(n).toFixed(3).replace(/0+$/, '').replace(/\.$/, '')).join(' ');
}

function fillRect(cmds: string[], x: number, y: number, w: number, h: number, c: PdfColor) {
  cmds.push(`${color(c)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
}

function strokeRect(cmds: string[], x: number, y: number, w: number, h: number, c: PdfColor, lineWidth = 0.7) {
  cmds.push(`${lineWidth} w ${color(c)} RG ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re S`);
}

function line(cmds: string[], x1: number, y1: number, x2: number, y2: number, c: PdfColor, lineWidth = 0.7) {
  cmds.push(`${lineWidth} w ${color(c)} RG ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
}

function drawText(cmds: string[], text: string, x: number, y: number, opts: { size?: number; bold?: boolean; color?: PdfColor } = {}) {
  const size = opts.size || 9;
  const font = opts.bold ? 'F2' : 'F1';
  const textColor = opts.color || PDF.text;
  cmds.push(`BT ${color(textColor)} rg /${font} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${pdfEscape(text)}) Tj ET`);
}

function wrapText(text: string, width: number, size = 9, maxLines = 3) {
  const maxChars = Math.max(8, Math.floor(width / (size * 0.52)));
  const words = cleanText(text).split(' ').filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = `${current} ${word}`.trim();
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else if (word.length > maxChars) {
      if (current) lines.push(current);
      current = `${word.slice(0, maxChars - 1)}…`.replace(/…/g, '...');
    } else {
      current = next;
    }
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[lines.length - 1] = `${lines[lines.length - 1].slice(0, Math.max(0, maxChars - 3))}...`;
  }
  return lines.length ? lines : ['-'];
}

function drawWrappedText(cmds: string[], text: string, x: number, y: number, width: number, opts: { size?: number; bold?: boolean; color?: PdfColor; maxLines?: number } = {}) {
  const size = opts.size || 9;
  const lineHeight = size + 3;
  const lines = wrapText(text, width, size, opts.maxLines ?? 2);
  lines.forEach((part, idx) => drawText(cmds, part, x, y - idx * lineHeight, opts));
  return lines.length * lineHeight;
}

function makePdfFromPages(pages: PdfPage[]) {
  const objects: string[] = [];
  function add(obj: string) {
    objects.push(obj);
    return objects.length;
  }

  const catalogId = add('');
  const pagesId = add('');
  const fontRegularId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontBoldId = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const pageIds: number[] = [];

  pages.forEach((page) => {
    const stream = page.commands.join('\n');
    const contentId = add(`<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`);
    const pageId = add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${page.width} ${page.height}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  });

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let pdf = '%PDF-1.4\n%PDF-FIX\n';
  const offsets = [0];
  objects.forEach((obj, idx) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${idx + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

function pdfResponse(buf: Buffer, name: string) {
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${name}"`,
      'Cache-Control': 'no-store'
    }
  });
}

function columnWidths(columns: any[], totalWidth: number) {
  const weights = columns.map((col, index) => {
    if (col.type === 'money') return 1.3;
    if (['date', 'time', 'month', 'status', 'progress', 'boolean'].includes(col.type)) return 0.85;
    if (col.key === 'email') return 1.35;
    if (col.relation) return 1.2;
    if (index === 0) return 1.05;
    return 1;
  });
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map((w) => Math.max(66, (w / sum) * totalWidth));
}

function addReportHeader(cmds: string[], title: string, subtitle: string, totalText: string, width: number, height: number, margin: number) {
  fillRect(cmds, margin, height - 78, width - margin * 2, 46, PDF.navy);
  drawText(cmds, title.toUpperCase(), margin + 18, height - 54, { size: 15, bold: true, color: PDF.white });
  drawText(cmds, subtitle, margin + 18, height - 69, { size: 8.5, color: [0.82, 0.88, 0.96] });
  drawText(cmds, totalText, width - margin - 170, height - 55, { size: 10, bold: true, color: PDF.white });
}

function addFooter(cmds: string[], page: number, pageCountLabel: string, width: number, margin: number) {
  line(cmds, margin, 32, width - margin, 32, PDF.line);
  drawText(cmds, 'AlmerDev Technology - Office OS', margin, 19, { size: 8, color: PDF.muted });
  drawText(cmds, `Halaman ${page}${pageCountLabel}`, width - margin - 70, 19, { size: 8, color: PDF.muted });
}

function makeTablePdf(title: string, columns: any[], rows: any[], lookups: any) {
  const width = 842;
  const height = 595;
  const margin = 34;
  const tableWidth = width - margin * 2;
  const widths = columnWidths(columns, tableWidth);
  const pages: PdfPage[] = [];
  let pageNumber = 0;
  let page: PdfPage;
  let y: number;

  function newPage() {
    pageNumber += 1;
    page = { width, height, commands: [] };
    pages.push(page);
    fillRect(page.commands, 0, 0, width, height, [0.985, 0.988, 0.994]);
    addReportHeader(page.commands, `Data ${title}`, `Dicetak ${new Date().toLocaleString('id-ID')}`, `${rows.length} data`, width, height, margin);
    y = height - 102;
    fillRect(page.commands, margin, y - 28, tableWidth, 28, [0.92, 0.95, 1]);
    strokeRect(page.commands, margin, y - 28, tableWidth, 28, PDF.line);
    let x = margin;
    columns.forEach((col, idx) => {
      drawWrappedText(page.commands, String(col.label).toUpperCase(), x + 8, y - 17, widths[idx] - 14, { size: 7.5, bold: true, color: PDF.navy, maxLines: 1 });
      if (idx > 0) line(page.commands, x, y - 28, x, y, PDF.line, 0.5);
      x += widths[idx];
    });
    y -= 28;
  }

  newPage();

  if (!rows.length) {
    fillRect(page!.commands, margin, y - 72, tableWidth, 72, PDF.white);
    strokeRect(page!.commands, margin, y - 72, tableWidth, 72, PDF.line);
    drawText(page!.commands, 'Belum ada data untuk filter ini.', margin + 18, y - 36, { size: 12, bold: true, color: PDF.muted });
    y -= 78;
  } else {
    rows.forEach((row, rowIndex) => {
      const values = columns.map((col) => String(cell(row, col, lookups) || '-'));
      const cellLines = values.map((value, idx) => wrapText(value, widths[idx] - 14, 8.3, 2));
      const maxLines = Math.max(...cellLines.map((l) => l.length));
      const rowHeight = Math.max(34, 18 + maxLines * 12);

      if (y - rowHeight < 44) newPage();

      fillRect(page!.commands, margin, y - rowHeight, tableWidth, rowHeight, rowIndex % 2 === 0 ? PDF.white : PDF.softAlt);
      strokeRect(page!.commands, margin, y - rowHeight, tableWidth, rowHeight, PDF.line, 0.45);
      let x = margin;
      values.forEach((value, idx) => {
        const col = columns[idx];
        const isMoney = col.type === 'money';
        const isStatus = ['status', 'boolean'].includes(col.type);
        const textColor = isStatus
          ? ['aktif', 'hadir', 'approved', 'completed', 'paid', 'lunas'].includes(String(row[col.key])) ? PDF.green : ['rejected', 'cancelled', 'urgent', 'alpha', 'nonaktif'].includes(String(row[col.key])) ? PDF.red : PDF.amber
          : PDF.text;
        const drawX = x + 8;
        const drawY = y - 18;
        drawWrappedText(page!.commands, value, drawX, drawY, widths[idx] - 14, { size: 8.3, bold: idx === 0 || isMoney || isStatus, color: textColor, maxLines: 2 });
        if (idx > 0) line(page!.commands, x, y - rowHeight, x, y, [0.92, 0.93, 0.95], 0.35);
        x += widths[idx];
      });
      y -= rowHeight;
    });
  }

  pages.forEach((p, idx) => addFooter(p.commands, idx + 1, ` / ${pages.length}`, width, margin));
  return makePdfFromPages(pages);
}

function makeSlipPdf(row: any, lookups: any) {
  const width = 595;
  const height = 842;
  const margin = 42;
  const page: PdfPage = { width, height, commands: [] };
  const cmds = page.commands;
  fillRect(cmds, 0, 0, width, height, [0.985, 0.988, 0.994]);
  fillRect(cmds, margin, height - 128, width - margin * 2, 82, PDF.navy);
  drawText(cmds, 'SLIP GAJI KARYAWAN', margin + 20, height - 78, { size: 18, bold: true, color: PDF.white });
  drawText(cmds, `Periode ${bulanNama[Number(row.bulan)] || row.bulan} ${row.tahun} - Dicetak ${new Date().toLocaleString('id-ID')}`, margin + 20, height - 99, { size: 9, color: [0.82, 0.88, 0.96] });

  const karyawan = relationLabel(row.karyawan_id, { table: 'karyawan', key: 'id', label: 'nama' }, lookups);
  const k = (lookups.karyawan || []).find((x: any) => String(x.id) === String(row.karyawan_id));
  const jabatan = relationLabel(k?.jabatan_id, { table: 'jabatan', key: 'id', label: 'nama_jabatan' }, lookups);

  const infoY = height - 166;
  fillRect(cmds, margin, infoY - 64, width - margin * 2, 64, PDF.white);
  strokeRect(cmds, margin, infoY - 64, width - margin * 2, 64, PDF.line);
  drawText(cmds, 'Nama', margin + 18, infoY - 22, { size: 8, bold: true, color: PDF.muted });
  drawText(cmds, karyawan, margin + 18, infoY - 42, { size: 12, bold: true });
  drawText(cmds, 'Jabatan', margin + 220, infoY - 22, { size: 8, bold: true, color: PDF.muted });
  drawText(cmds, jabatan, margin + 220, infoY - 42, { size: 12, bold: true });
  drawText(cmds, 'Status', margin + 405, infoY - 22, { size: 8, bold: true, color: PDF.muted });
  drawText(cmds, niceText(row.status), margin + 405, infoY - 42, { size: 12, bold: true, color: row.status === 'paid' ? PDF.green : PDF.amber });

  const income = ['gaji_pokok', 'uang_makan', 'transport', 'uang_lain_harian', 'insentif', 'bonus', 'tunjangan', 'thr', 'tunjangan_lain'];
  const cut = ['bpjs_kesehatan', 'bpjs_ketenagakerjaan', 'potongan_kasbon', 'potongan_lain'];
  const panelW = (width - margin * 2 - 16) / 2;
  const panelY = infoY - 98;
  const panelH = 268;

  function salaryPanel(title: string, fields: string[], x: number, accent: PdfColor) {
    fillRect(cmds, x, panelY - panelH, panelW, panelH, PDF.white);
    strokeRect(cmds, x, panelY - panelH, panelW, panelH, PDF.line);
    fillRect(cmds, x, panelY - 34, panelW, 34, [0.94, 0.97, 1]);
    drawText(cmds, title.toUpperCase(), x + 14, panelY - 22, { size: 10, bold: true, color: accent });
    let y = panelY - 56;
    fields.forEach((f) => {
      drawText(cmds, f.replaceAll('_', ' '), x + 14, y, { size: 9, color: PDF.muted });
      drawText(cmds, rupiah(row[f]), x + panelW - 104, y, { size: 9, bold: true, color: PDF.text });
      line(cmds, x + 14, y - 10, x + panelW - 14, y - 10, [0.93, 0.94, 0.96], 0.35);
      y -= 24;
    });
  }

  salaryPanel('Pendapatan', income, margin, PDF.green);
  salaryPanel('Potongan', cut, margin + panelW + 16, PDF.red);

  const totalY = panelY - panelH - 36;
  fillRect(cmds, margin, totalY - 58, width - margin * 2, 58, PDF.navy);
  drawText(cmds, 'TOTAL GAJI BERSIH', margin + 18, totalY - 23, { size: 10, bold: true, color: [0.82, 0.88, 0.96] });
  drawText(cmds, rupiah(row.gaji_bersih), width - margin - 176, totalY - 25, { size: 18, bold: true, color: PDF.white });

  drawWrappedText(cmds, `Catatan: ${row.catatan || 'Slip ini dibuat otomatis oleh sistem manajemen kantor.'}`, margin, totalY - 92, width - margin * 2, { size: 9, color: PDF.muted, maxLines: 3 });
  addFooter(cmds, 1, ' / 1', width, margin);
  return makePdfFromPages([page]);
}

async function slipPdf(id: string) {
  const [row, lookups] = await Promise.all([getRow('gaji', id), getLookups()]);
  if (!row) return new Response('Slip gaji tidak ditemukan', { status: 404 });
  return pdfResponse(makeSlipPdf(row, lookups), `slip-gaji-${id}.pdf`);
}

export async function GET(request: NextRequest, context: { params: { module: string; format: string } }) {
  try {
    await requireUser();
    const { module, format } = context.params;
    const config = getModule(module);
    if (!config) return new Response('Module tidak ditemukan', { status: 404 });

    if (config.slug === 'gaji' && request.nextUrl.searchParams.get('id') && format === 'pdf') {
      return slipPdf(request.nextUrl.searchParams.get('id')!);
    }

    const query = Object.fromEntries(request.nextUrl.searchParams.entries());
    const { rows, lookups } = await moduleRows(config, query);
    const data = rows.map((row: any) => Object.fromEntries(config.columns.map((c) => [c.label, cell(row, c, lookups)])));

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ Info: 'Belum ada data' }]);
      XLSX.utils.book_append_sheet(wb, ws, config.title.slice(0, 30));
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      return new Response(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename(config.slug, 'xlsx')}"`,
          'Cache-Control': 'no-store'
        }
      });
    }

    if (format === 'pdf') {
      return pdfResponse(makeTablePdf(config.title, config.columns, rows, lookups), filename(config.slug, 'pdf'));
    }

    return new Response('Format tidak dikenal', { status: 400 });
  } catch (error: any) {
    console.error('EXPORT_ERROR:', error);
    return new Response(`Gagal membuat file export: ${error?.message || 'Unknown error'}`, { status: 500 });
  }
}
