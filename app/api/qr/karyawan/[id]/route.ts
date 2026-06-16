import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { supabaseAdmin } from '@/lib/supabase';
import { createAttendanceQrToken } from '@/lib/attendance-qr';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function safeFileName(value: string) {
  return String(value || 'karyawan').replace(/[^a-zA-Z0-9._-]/g, '-');
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: 'ID karyawan tidak valid.' }, { status: 400 });

  const { data: karyawan, error } = await supabaseAdmin
    .from('karyawan')
    .select('id,nip,nama,status')
    .eq('id', id)
    .single();

  if (error || !karyawan) return NextResponse.json({ error: 'Karyawan tidak ditemukan.' }, { status: 404 });

  const token = createAttendanceQrToken(Number(karyawan.id));
  const origin = request.nextUrl.origin;
  const scanUrl = `${origin}/scan-absen?token=${encodeURIComponent(token)}`;
  const format = request.nextUrl.searchParams.get('format') || 'svg';
  const download = request.nextUrl.searchParams.get('download') === '1';
  const baseName = `qr-absen-${safeFileName(karyawan.nip || String(karyawan.id))}-${safeFileName(karyawan.nama || '')}`;

  if (format === 'png') {
    const png = await QRCode.toBuffer(scanUrl, {
      type: 'png',
      width: 900,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'M'
    });
    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${baseName}.png"`
      }
    });
  }

  const svg = await QRCode.toString(scanUrl, {
    type: 'svg',
    width: 720,
    margin: 2,
    color: { dark: '#0f172a', light: '#ffffff' },
    errorCorrectionLevel: 'M'
  });

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${baseName}.svg"`
    }
  });
}
