import 'server-only';
import { supabaseAdmin, publicFileUrl } from './supabase';

export type OfficeSettings = {
  id: number;
  office_name: string;
  panel_name: string | null;
  tagline: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  city: string | null;
  work_hours: string | null;
  footer_note: string | null;
  accent_color: string | null;
  logo: string | null;
  created_at?: string;
  updated_at?: string;
};

export const defaultOfficeSettings: OfficeSettings = {
  id: 1,
  office_name: process.env.NEXT_PUBLIC_APP_NAME || 'AlmerDev Technology',
  panel_name: 'Office OS',
  tagline: 'Panel kantor siap produksi.',
  email: 'admin@kantor.com',
  phone: '0812-3456-7890',
  address: 'Jakarta, Indonesia',
  website: '',
  city: 'Jakarta',
  work_hours: 'Senin - Jumat, 08.00 - 17.00',
  footer_note: 'Panel kantor siap produksi.',
  accent_color: '#2563eb',
  logo: null
};

export function officeLogoUrl(settings?: Partial<OfficeSettings> | null) {
  return settings?.logo ? publicFileUrl(settings.logo) : '';
}

export async function getOfficeSettings(): Promise<OfficeSettings> {
  try {
    const { data, error } = await supabaseAdmin.from('office_settings').select('*').eq('id', 1).maybeSingle();
    if (error || !data) return defaultOfficeSettings;
    return { ...defaultOfficeSettings, ...data } as OfficeSettings;
  } catch {
    return defaultOfficeSettings;
  }
}
