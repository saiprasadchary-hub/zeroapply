import assert from 'node:assert/strict';
import { isExpectedPortalUrl, MAX_APPLICATIONS_PER_RUN } from '../src/agent/autoApply/autoApplyEngine';
import { SalaryOptimizerAgent } from '../src/agent/compensation/salaryOptimizerAgent';
import fs from 'node:fs';

assert.equal(isExpectedPortalUrl('https://www.linkedin.com/jobs/1', 'linkedin.com'), true);
assert.equal(isExpectedPortalUrl('https://fake-linkedin.com/jobs/1', 'linkedin.com'), false);
assert.equal(isExpectedPortalUrl('javascript:alert(1)', 'linkedin.com'), false);
assert.equal(MAX_APPLICATIONS_PER_RUN, 50);

const hourly = SalaryOptimizerAgent.extractSalaryRange('Compensation: $55.00 - $75.00 per hour');
assert.deepEqual(hourly && { min: hourly.min, max: hourly.max, period: hourly.period }, {
  min: 55,
  max: 75,
  period: 'hourly',
});
assert.equal(SalaryOptimizerAgent.calculateOptimalCompensation('Expected annual salary', 12).numericValue, 1_320_000);
assert.equal(
  SalaryOptimizerAgent.calculateOptimalCompensation('Expected hourly rate', 12, '$55.00 - $75.00 per hour').numericValue,
  70,
);

const viteConfig = fs.readFileSync('vite.config.ts', 'utf8');
assert.match(viteConfig, /ignored: \['\*\*\/dist\/\*\*', '\*\*\/release\*\/\*\*'\]/);

const mainEntry = fs.readFileSync('src/main.tsx', 'utf8');
const errorBoundary = fs.readFileSync('src/components/AppErrorBoundary.tsx', 'utf8');
const globalRecovery = fs.readFileSync('src/services/globalErrorRecovery.ts', 'utf8');
assert.match(mainEntry, /AppErrorBoundary/);
assert.match(mainEntry, /GlobalErrorMonitor/);
assert.match(errorBoundary, /componentDidCatch/);
assert.match(errorBoundary, /Retry interface/);
assert.match(globalRecovery, /unhandledrejection/);
assert.match(globalRecovery, /DUPLICATE_WINDOW_MS/);

console.log('Production regression tests passed (15/15).');
