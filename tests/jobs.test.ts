import assert from 'node:assert/strict'
import test from 'node:test'
import { newJob, sanitizeBookKey, stageOfStatus } from '../src/jobs.ts'

test('book keys are bounded and filesystem-safe', () => {
  assert.equal(sanitizeBookKey('  A/B: C?  '), 'A-B-C')
  assert.equal(sanitizeBookKey('///'), 'book')
  assert.equal(sanitizeBookKey('x'.repeat(100)).length, 64)
})

test('new jobs start at the fetch stage with closed gates', () => {
  const job = newJob('job-1', { kind: 'local', path: '/tmp/book.epub' })
  assert.equal(job.stage, 1)
  assert.equal(job.status, 'pending')
  assert.deepEqual(job.gate1, { status: 'closed', questions: [] })
  assert.equal(stageOfStatus('parsed'), 2)
  assert.equal(stageOfStatus('awaiting_gate2'), 4)
  assert.equal(stageOfStatus('installed'), 5)
})
