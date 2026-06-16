export const dynamic = 'force-dynamic';
import QrAttendanceScanner from '@/components/QrAttendanceScanner';
import { getOfficeSettings, officeLogoUrl } from '@/lib/office';

export default async function ScanAbsenPage() {
  const settings = await getOfficeSettings();
  return <QrAttendanceScanner settings={settings} logoUrl={officeLogoUrl(settings)} />;
}
