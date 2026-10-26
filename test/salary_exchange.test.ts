import assert from 'node:assert/strict';
import { installSalaryRate, getSalaryRate } from '../src/agent/localLlm/salaryExchange';
import { resolveFieldScreeningFact } from '../src/agent/localLlm/fieldAnswer';
import type { PersonaData } from '../src/types';
const date = new Date().toISOString().slice(0, 10);
const persona = { employmentStatus: 'fresher', expectedSalaryLpa: 7, currentCtcLpa: 8 } as PersonaData;
// Install a controlled dated rate; bundled rates are validated at startup.

installSalaryRate({ base: 'INR', date, rates: { USD: 0.010533 } });
assert.equal(resolveFieldScreeningFact({ label: 'Expected annual CTC in USD', inputType: 'text' }, persona), '7373');
assert.equal(resolveFieldScreeningFact({ label: 'Expected monthly salary in USD', inputType: 'number' }, persona), '614');
assert.equal(resolveFieldScreeningFact({ label: 'Current CTC in USD', inputType: 'text' }, persona), '0');
assert.equal(resolveFieldScreeningFact({ label: 'Expected CTC in INR', inputType: 'text' }, persona), '700000');
assert.equal(resolveFieldScreeningFact({ label: 'Expected salary in $', inputType: 'text' }, persona), '');
assert.equal(resolveFieldScreeningFact({ label: 'Expected hourly salary in USD', inputType: 'text' }, persona), '');
assert.throws(() => installSalaryRate({ base: 'USD', date, rates: { USD: 90 } }));
assert.throws(() => installSalaryRate({ base: 'INR', date: '2020-01-01', rates: { USD: 0.01 } }));
assert.equal(getSalaryRate(Date.now() + 8 * 86400000), undefined);
console.log('Salary conversion passed: annual/monthly USD, current zero, INR unchanged, ambiguous currency and stale rates rejected.');
