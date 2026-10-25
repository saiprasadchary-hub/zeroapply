import React, { useCallback, useEffect, useState } from 'react';
import { deleteSubmissionEvidence, listSubmissionEvidence, type SubmissionEvidenceBundle } from '../agent/tracker/submissionEvidenceStore';

export function SubmissionEvidencePanel(): React.JSX.Element {
  const [receipts, setReceipts] = useState<SubmissionEvidenceBundle[]>([]);
  const [error, setError] = useState('');
  const refresh = useCallback(async (): Promise<void> => {
    try { setReceipts(await listSubmissionEvidence()); setError(''); }
    catch (failure: unknown) { setError(failure instanceof Error ? failure.message : 'Could not load receipts.'); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const download = (receipt: SubmissionEvidenceBundle): void => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `application-receipt-${receipt.id}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <details className="border border-zinc-200 rounded-xl bg-white p-4">
    <summary className="text-sm font-bold cursor-pointer">Saved application proof ({receipts.length})</summary>
    <div className="space-y-3 mt-3">
      <button type="button" onClick={() => void refresh()} className="text-xs underline">Refresh receipts</button>
      {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
      {!receipts.length && !error && <p className="text-xs text-zinc-500">Confirmed applications appear here with their saved answers and screenshot.</p>}
      {receipts.map(receipt => <details key={receipt.id} className="border border-zinc-100 rounded-lg p-3">
        <summary className="text-xs font-semibold cursor-pointer">{receipt.jobTitle || 'Application'} · {receipt.companyName || 'Company'} · {new Date(receipt.capturedAt).toLocaleString()}</summary>
        <p className="text-xs my-2">{receipt.confirmationText}</p>
        <p className="text-xs text-zinc-500">Applicant: {receipt.applicant.name} · Job ID: {receipt.jobId}</p>
        {receipt.screenshot && <img className="w-full rounded my-2" alt="Captured application confirmation" src={`data:image/jpeg;base64,${receipt.screenshot.replace(/^data:image\/(?:png|jpeg);base64,/, '')}`} />}
        {receipt.screenshotError && <p className="text-xs text-amber-700">{receipt.screenshotError}</p>}
        <dl className="space-y-2 my-3">{receipt.answers.map((pair, index) => <div key={`${pair.question}-${index}`} className="text-xs"><dt className="font-semibold">{pair.question}</dt><dd>{pair.answer} <span className="text-zinc-500">({pair.source})</span></dd></div>)}</dl>
        <div className="flex gap-4 text-xs">
          <button type="button" onClick={() => download(receipt)} className="underline">Download proof &amp; answers</button>
          <button type="button" onClick={() => { void deleteSubmissionEvidence(receipt.id).then(refresh).catch((failure: unknown) => setError(failure instanceof Error ? failure.message : 'Could not delete receipt.')); }} className="underline text-rose-700">Delete saved proof</button>
        </div>
      </details>)}
    </div>
  </details>;
}
