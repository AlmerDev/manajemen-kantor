'use client';

import { useEffect, useRef } from 'react';

export default function DashboardCharts({ grafikGaji, grafikTugas }: { grafikGaji: any[]; grafikTugas: Record<string, number> }) {
  const gajiRef = useRef<HTMLCanvasElement>(null);
  const tugasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    const charts: any[] = [];

    async function renderCharts() {
      const { Chart } = await import('chart.js/auto');
      if (cancelled) return;

      if (gajiRef.current) {
        charts.push(new Chart(gajiRef.current, {
          type: 'line',
          data: {
            labels: grafikGaji.map((x) => x.bulan),
            datasets: [{ label: 'Total gaji', data: grafikGaji.map((x) => x.total), tension: 0.32, fill: true }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            plugins: { legend: { display: false } },
            elements: { point: { radius: 2, hoverRadius: 4 } }
          }
        }));
      }

      if (tugasRef.current) {
        const labels = Object.keys(grafikTugas);
        charts.push(new Chart(tugasRef.current, {
          type: 'doughnut',
          data: { labels, datasets: [{ data: labels.map((l) => grafikTugas[l]) }] },
          options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { position: 'bottom' } } }
        }));
      }
    }

    renderCharts();
    return () => {
      cancelled = true;
      charts.forEach((c) => c.destroy());
    };
  }, [grafikGaji, grafikTugas]);

  return (
    <div className="row g-4 mb-4">
      <div className="col-lg-8">
        <div className="card premium-card chart-card h-100">
          <div className="card-header panel-header"><div><span className="eyebrow">Financial trend</span><strong><i className="bi bi-graph-up-arrow me-2" />Grafik gaji 6 bulan terakhir</strong></div></div>
          <div className="card-body"><div className="chart-frame"><canvas ref={gajiRef} /></div></div>
        </div>
      </div>
      <div className="col-lg-4">
        <div className="card premium-card chart-card h-100">
          <div className="card-header panel-header"><div><span className="eyebrow">Task overview</span><strong><i className="bi bi-pie-chart me-2" />Status tugas</strong></div></div>
          <div className="card-body"><div className="chart-frame"><canvas ref={tugasRef} /></div></div>
        </div>
      </div>
    </div>
  );
}
