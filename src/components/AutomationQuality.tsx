import React, { useEffect, useState } from 'react';
import { getQualityMetrics, subscribeQuality } from '../agent/telemetry/qualityMetrics';

export function AutomationQuality(): React.JSX.Element {
  const [metrics, setMetrics] = useState(getQualityMetrics);
  useEffect(() => subscribeQuality(() => setMetrics(getQualityMetrics())), []);
  return <section aria-label="Automation quality" className="border-t pt-2 space-y-1">
    <p className="font-semibold">Automation quality</p>
    <p>Verified field writes: {metrics.verifiedWrites}/{metrics.writeAttempts}</p>
    <p>Recovered fields: {metrics.recoveredFields} · Invalid formats blocked: {metrics.formatRejections}</p>
    <p>Forms needing review: {metrics.blockedForms}</p>
    <p>Confirmed applications: {metrics.confirmedApplications} · Uncertain submissions: {metrics.uncertainApplications}</p>
    <p>Failed model requests: {metrics.failedInferences}</p>
    <p className="text-zinc-500">Verified writes confirm values stayed in the form. Keep your profile accurate so those values are correct.</p>
  </section>;
}
