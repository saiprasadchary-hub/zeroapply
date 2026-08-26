import React from 'react';

interface BulletLengthMeterProps {
  bullet: string;
  className?: string;
}

export const BulletLengthMeter: React.FC<BulletLengthMeterProps> = ({ bullet, className = '' }) => {
  const words = bullet.trim() ? bullet.trim().split(/\s+/).length : 0;
  const hasMetric = /\d+%\s*|\$\s*\d+|₹\s*\d+|\b\d+x\b|\b\d+\s*ms\b|\b\d{2,}\b/i.test(bullet);

  if (!bullet.trim()) return null;

  let lengthStatus: { label: string; color: string; bg: string } = {
    label: 'Optimal Length',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
  };

  if (words < 10) {
    lengthStatus = {
      label: 'Too Brief',
      color: 'text-amber-700',
      bg: 'bg-amber-50 border-amber-200',
    };
  } else if (words > 32) {
    lengthStatus = {
      label: 'Lengthy (Split)',
      color: 'text-blue-700',
      bg: 'bg-blue-50 border-blue-200',
    };
  }

  return (
    <div className={`inline-flex items-center gap-1.5 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${lengthStatus.bg} ${lengthStatus.color} ${className}`}>
      <span>{words} words</span>
      <span>•</span>
      <span>{lengthStatus.label}</span>
      {hasMetric ? (
        <span className="text-emerald-600 bg-emerald-100/80 px-1 rounded">⚡ Metric</span>
      ) : (
        <span className="text-amber-600 bg-amber-100/80 px-1 rounded">⚠️ Add KPI</span>
      )}
    </div>
  );
};
