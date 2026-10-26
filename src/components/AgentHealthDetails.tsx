import React, { useEffect, useState } from 'react';
import { getAgentHealth, subscribeAgentHealth } from '../agent/telemetry/agentHealth';
import { getWebLlmState, subscribeWebLlmState } from '../agent/llm/webLlmEngine';
import { AutomationQuality } from './AutomationQuality';

export function AgentHealthDetails(): React.JSX.Element {
  const [health, setHealth] = useState(getAgentHealth);
  const [model, setModel] = useState(getWebLlmState);
  useEffect(() => subscribeAgentHealth(setHealth), []);
  useEffect(() => subscribeWebLlmState(setModel), []);
  const inference = health.lastInference;
  return <details className="relative text-xs shrink-0">
    <summary className="cursor-pointer text-zinc-600">AI activity{health.pendingRequests ? ` (${health.pendingRequests})` : ''}</summary>
    <div className="absolute right-0 top-7 z-50 w-80 bg-white border border-zinc-200 rounded-xl shadow-lg p-4 space-y-2" role="status" aria-live="polite">
      <p className="font-semibold">Model &amp; page understanding</p>
      <p>{model.supportsVision ? 'Local vision is supported by the active model.' : 'This model has no verified vision support; automation uses page controls and text.'}</p>
      {inference ? <>
        <p>{inference.model} · {inference.status}{inference.elapsedMs !== undefined ? ` · ${(inference.elapsedMs / 1000).toFixed(1)}s` : ''}</p>
        <p>{inference.screenshotSent ? 'Screenshot sent with this request.' : 'This request used text; no screenshot was sent.'}</p>
        {inference.error && <p className="text-rose-700">{inference.error}</p>}
      </> : <p>No model request in this session.</p>}
      {health.lastAnswer && <>
        <p className="font-semibold">Last question: {health.lastAnswer.question}</p>
        <p>Answer source: {health.lastAnswer.source}</p>
        {health.lastAnswer.evidence && <p className="text-zinc-500">{health.lastAnswer.evidence}</p>}
      </>}
      <AutomationQuality />
    </div>
  </details>;
}
