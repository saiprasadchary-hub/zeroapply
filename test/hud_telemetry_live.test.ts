import assert from 'node:assert/strict';
import { liveTelemetry, type LiveActionRecord } from '../src/agent/telemetry/liveTelemetry';

console.log('--- Testing Live Telemetry Event Flow ---');

const emitted: LiveActionRecord[] = [];
const unsubscribe = liveTelemetry.subscribe((action) => {
  emitted.push(action);
});

// 1. Test "Going to"
liveTelemetry.emit({
  type: 'scroll',
  title: 'Going to: Job 2/10: "Full Stack Engineer" at "Stripe"',
  target: 'Full Stack Engineer at Stripe',
  status: 'running',
});

// 2. Test "Clicking"
liveTelemetry.emit({
  type: 'click',
  title: 'Clicking: "Easy Apply"',
  target: 'Easy Apply',
  status: 'running',
});

// 3. Test "Thinking"
liveTelemetry.emit({
  type: 'think',
  title: 'Question (how many years experience in html) thinking answers: "2"',
  target: 'how many years experience in html',
  value: '2',
  source: 'ollama',
  model: 'qwen2.5:1.5b',
  status: 'completed',
});

// 4. Test "Filling"
liveTelemetry.emit({
  type: 'type',
  title: 'Question (how many years experience in html) filling this: "2"',
  target: 'how many years experience in html',
  value: '2',
  status: 'completed',
});

// 5. Test "Checking"
liveTelemetry.emit({
  type: 'check',
  title: 'Checking: Verifying application submitted',
  status: 'running',
});

unsubscribe();

assert.equal(emitted.length, 5);
assert.equal(emitted[0].type, 'scroll');
assert.equal(emitted[1].type, 'click');
assert.equal(emitted[2].type, 'think');
assert.equal(emitted[2].value, '2');
assert.equal(emitted[3].type, 'type');
assert.equal(emitted[3].value, '2');
assert.equal(emitted[4].type, 'check');

const stats = liveTelemetry.getStats();
assert.equal(stats.fieldsFilled, 1, 'Fields filled counter should have incremented to 1');
assert.equal(stats.questionsSolved, 1, 'Questions solved counter should have incremented to 1');

console.log('✅ Real-time telemetry pipeline emitted all 5 action stages with correct values!');
console.log('Stats:', stats);
