import { CALCULATORS, estimateStorage, formatBytes, formatNumber } from './calculations.mjs';

const state = {
  calculator: 'kafka', unitSystem: 'decimal', rate: 5000, rateUnit: 'minute', itemSize: 2, sizeUnit: 'KB', retention: 5, retentionUnit: 'days', replicationFactor: 3, safetyMargin: 25, overhead: 0,
};
const $ = (id) => document.getElementById(id);

function hydrateFromUrl() {
  const params = new URLSearchParams(location.search);
  for (const [key, value] of params) if (key in state) state[key] = Number.isNaN(Number(value)) || ['calculator','unitSystem','rateUnit','sizeUnit','retentionUnit'].includes(key) ? value : Number(value);
  if (params.get('notes')) $('scenario').value = params.get('notes');
}

function serializeUrl() {
  const params = new URLSearchParams();
  Object.entries(state).forEach(([key, value]) => params.set(key, value));
  if ($('scenario').value.trim()) params.set('notes', $('scenario').value.trim());
  return `${location.origin}${location.pathname}?${params.toString()}`;
}

function renderSelectors() {
  $('calculator').innerHTML = Object.entries(CALCULATORS).map(([id, calc]) => `<option value="${id}">${calc.name}</option>`).join('');
  $('calculator').value = state.calculator;
  $('unitSystem').value = state.unitSystem;
}

function numberInput(key, label, attrs = '') { return `<label>${label}<input type="number" id="${key}" value="${state[key]}" ${attrs}></label>`; }
function selectInput(key, label, options) { return `<label>${label}<select id="${key}">${options.map((o) => `<option value="${o}" ${state[key] === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`; }

function renderForm() {
  const calc = CALCULATORS[state.calculator];
  $('dynamicForm').innerHTML = `
    <div class="row three">${numberInput('rate', `${calc.rateLabel} rate`, 'min="0" step="any"')}${selectInput('rateUnit', 'Per', ['second','minute','hour','day'])}</div>
    <div class="row three">${numberInput('itemSize', calc.sizeLabel, 'min="0" step="any"')}${selectInput('sizeUnit', 'Size unit', ['bytes','KB','MB','GB'])}</div>
    <div class="row three">${numberInput('retention', calc.timeLabel, 'min="0" step="any"')}${selectInput('retentionUnit', 'Time unit', ['seconds','minutes','hours','days','months'])}</div>
    <div class="row three">${numberInput('replicationFactor', 'Replication factor', 'min="1" max="5" step="1"')}${numberInput('safetyMargin', 'Safety margin %', 'min="0" step="1"')}${numberInput('overhead', 'Overhead %', 'min="0" step="1"')}</div>`;
  $('dynamicForm').querySelectorAll('input,select').forEach((el) => el.addEventListener('input', () => { state[el.id] = el.type === 'number' ? Number(el.value) : el.value; renderResults(); }));
}

function buildText(result) {
  return `Engineering Calculator Assistant — approximate ${CALCULATORS[state.calculator].name}\nMessages/items per second: ${formatNumber(result.ratePerSecond)}\nMessages/items per day: ${formatNumber(result.itemsPerDay)}\nMessages/items retained: ${formatNumber(result.items)}\nRaw storage: about ${formatBytes(result.rawBytes, state.unitSystem)}\nStorage with replication: about ${formatBytes(result.replicatedBytes, state.unitSystem)}\nRecommended capacity: about ${formatBytes(result.recommendedBytes, state.unitSystem)}`;
}

function renderResults() {
  const r = estimateStorage(state);
  $('resultTitle').textContent = `${CALCULATORS[state.calculator].name}`;
  $('summaryCards').innerHTML = [
    ['Final recommended capacity', formatBytes(r.recommendedBytes, state.unitSystem)], ['Without replication', formatBytes(r.overheadBytes, state.unitSystem)], ['With replication', formatBytes(r.replicatedBytes, state.unitSystem)], ['Daily growth', formatBytes(r.dailyGrowthBytes, state.unitSystem)], ['Monthly growth', formatBytes(r.monthlyGrowthBytes, state.unitSystem)], ['Safety margin', `${formatNumber(r.safetyPercent)}%`],
  ].map(([k,v]) => `<div class="card"><span>${k}</span><strong>${v}</strong></div>`).join('');
  const unitLabel = state.unitSystem === 'decimal' ? 'KB = 1000 bytes' : 'KiB = 1024 bytes';
  $('steps').innerHTML = `<h3>How this was calculated</h3>
    <ul class="metrics"><li>Messages/items per second: <strong>${formatNumber(r.ratePerSecond)}</strong></li><li>Messages/items per day: <strong>${formatNumber(r.itemsPerDay)}</strong></li><li>Messages/items retained: <strong>${formatNumber(r.items)}</strong></li></ul>
    <pre>${formatNumber(state.rate)} × ${state.rateUnit}-to-seconds × ${formatNumber(r.retentionSeconds)} seconds = ${formatNumber(r.items)} items retained
${formatNumber(r.items)} × ${formatNumber(state.itemSize)} ${state.sizeUnit} = ${formatBytes(r.rawBytes, state.unitSystem)} raw storage
${formatBytes(r.rawBytes, state.unitSystem)} × ${(1 + r.overheadPercent / 100).toFixed(2)} overhead = ${formatBytes(r.overheadBytes, state.unitSystem)}
${formatBytes(r.overheadBytes, state.unitSystem)} × ${r.replicationFactor} replicas = ${formatBytes(r.replicatedBytes, state.unitSystem)}
${formatBytes(r.replicatedBytes, state.unitSystem)} × ${(1 + r.safetyPercent / 100).toFixed(2)} safety margin = ${formatBytes(r.recommendedBytes, state.unitSystem)}</pre>
    <h3>Formula</h3><p><code>total = rate × time × item size × replication × overhead</code></p>
    <h3>Unit conversions and assumptions</h3><ul><li>${unitLabel}; months are estimated as 30 days.</li><li>Replication factor is clamped from 1 to 5.</li><li>Recommended safety margin defaults to 25% and should be adjusted for workload spikes.</li><li>Compression, indexes, metadata, protocol framing, compaction, and deletes are not inferred from notes.</li></ul>`;
  window.currentResultText = buildText(r);
}

function bind() {
  $('calculator').addEventListener('change', (e) => { state.calculator = e.target.value; renderForm(); renderResults(); });
  $('unitSystem').addEventListener('change', (e) => { state.unitSystem = e.target.value; renderResults(); });
  $('copyResult').addEventListener('click', async () => navigator.clipboard.writeText(window.currentResultText));
  $('shareUrl').addEventListener('click', async () => navigator.clipboard.writeText(serializeUrl()));
}

hydrateFromUrl(); renderSelectors(); renderForm(); bind(); renderResults();
