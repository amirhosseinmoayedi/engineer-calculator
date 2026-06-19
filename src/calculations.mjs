export const UNIT_SYSTEMS = {
  decimal: { base: 1000, labels: ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB'] },
  binary: { base: 1024, labels: ['bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'] },
};

export const CALCULATORS = {
  kafka: { name: 'Kafka topic storage', rateLabel: 'Messages', sizeLabel: 'Average message size', timeLabel: 'Retention' },
  database: { name: 'Database growth', rateLabel: 'Rows/events', sizeLabel: 'Average row size', timeLabel: 'Growth period' },
  api: { name: 'API traffic', rateLabel: 'Requests', sizeLabel: 'Average payload size', timeLabel: 'Traffic period' },
  network: { name: 'Network bandwidth', rateLabel: 'Packets/transfers', sizeLabel: 'Average transfer size', timeLabel: 'Transfer period' },
  object: { name: 'Object storage', rateLabel: 'Objects', sizeLabel: 'Average object size', timeLabel: 'Retention' },
  redis: { name: 'Redis memory', rateLabel: 'Keys', sizeLabel: 'Average key+value size', timeLabel: 'Retention' },
  logs: { name: 'Log storage', rateLabel: 'Log lines/events', sizeLabel: 'Average log event size', timeLabel: 'Retention' },
  general: { name: 'General rate × time × size calculation', rateLabel: 'Items', sizeLabel: 'Average item size', timeLabel: 'Duration' },
};

export const rateMultipliers = { second: 1, minute: 1 / 60, hour: 1 / 3600, day: 1 / 86400 };
export const timeMultipliers = { seconds: 1, minutes: 60, hours: 3600, days: 86400, months: 30 * 86400 };
export const sizePowers = { bytes: 0, KB: 1, MB: 2, GB: 3 };

export function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function convertRateToPerSecond(rate, unit) {
  return toNumber(rate) * (rateMultipliers[unit] ?? 1);
}

export function convertTimeToSeconds(time, unit) {
  return toNumber(time) * (timeMultipliers[unit] ?? 1);
}

export function convertSizeToBytes(size, unit, system = 'decimal') {
  const base = UNIT_SYSTEMS[system]?.base ?? 1000;
  return toNumber(size) * base ** (sizePowers[unit] ?? 0);
}

export function formatNumber(value, maximumFractionDigits = 2) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value);
}

export function formatBytes(bytes, system = 'decimal') {
  const { base, labels } = UNIT_SYSTEMS[system] ?? UNIT_SYSTEMS.decimal;
  const abs = Math.abs(bytes);
  let index = 0;
  while (abs >= base ** (index + 1) && index < labels.length - 1) index += 1;
  const value = bytes / base ** index;
  return `${formatNumber(value, value >= 100 ? 0 : 2)} ${labels[index]}`;
}

export function estimateStorage(input) {
  const unitSystem = input.unitSystem ?? 'decimal';
  const rate = toNumber(input.rate);
  const retention = toNumber(input.retention);
  const itemSize = toNumber(input.itemSize);
  const replicationFactor = Math.min(5, Math.max(1, toNumber(input.replicationFactor, 1)));
  const safetyPercent = Math.max(0, toNumber(input.safetyMargin, 25));
  const overheadPercent = Math.max(0, toNumber(input.overhead, 0));
  const ratePerSecond = convertRateToPerSecond(rate, input.rateUnit);
  const retentionSeconds = convertTimeToSeconds(retention, input.retentionUnit);
  const itemSizeBytes = convertSizeToBytes(itemSize, input.sizeUnit, unitSystem);
  const items = ratePerSecond * retentionSeconds;
  const itemsPerDay = ratePerSecond * 86400;
  const rawBytes = items * itemSizeBytes;
  const overheadBytes = rawBytes * (1 + overheadPercent / 100);
  const replicatedBytes = overheadBytes * replicationFactor;
  const recommendedBytes = replicatedBytes * (1 + safetyPercent / 100);
  const dailyGrowthBytes = itemsPerDay * itemSizeBytes * (1 + overheadPercent / 100) * replicationFactor;
  const monthlyGrowthBytes = dailyGrowthBytes * 30;

  return {
    ratePerSecond,
    itemsPerDay,
    retentionSeconds,
    items,
    itemSizeBytes,
    rawBytes,
    overheadBytes,
    replicatedBytes,
    recommendedBytes,
    dailyGrowthBytes,
    monthlyGrowthBytes,
    replicationFactor,
    safetyPercent,
    overheadPercent,
    unitSystem,
  };
}
