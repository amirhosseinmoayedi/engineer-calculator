import test from 'node:test';
import assert from 'node:assert/strict';
import { convertRateToPerSecond, convertTimeToSeconds, convertSizeToBytes, estimateStorage, formatBytes } from '../src/calculations.mjs';

test('converts rate, time, and size units', () => {
  assert.equal(convertRateToPerSecond(5000, 'minute').toFixed(2), '83.33');
  assert.equal(convertTimeToSeconds(5, 'days'), 432000);
  assert.equal(convertSizeToBytes(2, 'KB', 'decimal'), 2000);
  assert.equal(convertSizeToBytes(2, 'KB', 'binary'), 2048);
});

test('estimates Kafka example with decimal units', () => {
  const result = estimateStorage({ rate: 5000, rateUnit: 'minute', itemSize: 2, sizeUnit: 'KB', retention: 5, retentionUnit: 'days', replicationFactor: 3, safetyMargin: 25, overhead: 0, unitSystem: 'decimal' });
  assert.equal(result.items, 36_000_000);
  assert.equal(result.rawBytes, 72_000_000_000);
  assert.equal(result.replicatedBytes, 216_000_000_000);
  assert.equal(result.recommendedBytes, 270_000_000_000);
  assert.equal(formatBytes(result.recommendedBytes, 'decimal'), '270 GB');
});
