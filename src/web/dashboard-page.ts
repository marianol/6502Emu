/**
 * Self-contained HTML for the emulator web dashboard.
 * Served as-is by DashboardServer. Polls /api/status and renders the state.
 */
export const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>6502 Emulator Dashboard</title>
<style>
  :root {
    --bg: #0f1419; --panel: #1a2029; --panel2: #232b36;
    --fg: #cdd6e3; --muted: #7a869a; --accent: #4fc3f7;
    --on: #37d67a; --off: #3a4453; --out: #f9a825; --warn: #e74c3c;
    --mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--fg);
    font-family: system-ui, -apple-system, sans-serif; font-size: 14px;
  }
  header {
    padding: 12px 20px; background: var(--panel2);
    display: flex; align-items: center; gap: 16px; border-bottom: 1px solid #2d3745;
  }
  header h1 { font-size: 16px; margin: 0; font-weight: 600; }
  .state { padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
  .state.running { background: var(--on); color: #04240f; }
  .state.stopped { background: var(--off); color: var(--fg); }
  .state.paused  { background: var(--out); color: #2b1d00; }
  .state.error   { background: var(--warn); color: #fff; }
  .state.stepping{ background: var(--accent); color: #022; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px; padding: 20px; }
  .panel { background: var(--panel); border: 1px solid #2d3745; border-radius: 8px; padding: 16px; }
  .panel h2 { margin: 0 0 12px; font-size: 13px; text-transform: uppercase; letter-spacing: .5px; color: var(--accent); }
  table { width: 100%; border-collapse: collapse; font-family: var(--mono); font-size: 13px; }
  td, th { text-align: left; padding: 3px 8px; }
  th { color: var(--muted); font-weight: 500; font-size: 11px; text-transform: uppercase; }
  tr:nth-child(even) td { background: rgba(255,255,255,0.02); }
  .reg-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; font-family: var(--mono); }
  .reg { background: var(--panel2); border-radius: 6px; padding: 8px; text-align: center; }
  .reg .label { font-size: 10px; color: var(--muted); }
  .reg .val { font-size: 18px; font-weight: 600; }
  .flags { display: flex; gap: 4px; margin-top: 10px; font-family: var(--mono); }
  .flag { width: 28px; text-align: center; padding: 4px 0; border-radius: 4px; background: var(--off); font-weight: 600; }
  .flag.set { background: var(--on); color: #04240f; }
  .bits { display: flex; gap: 6px; }
  .pin { flex: 1; text-align: center; }
  .led { width: 26px; height: 26px; border-radius: 50%; margin: 0 auto 4px; border: 2px solid #2d3745; background: var(--off); transition: background .1s; }
  .led.on { background: var(--on); box-shadow: 0 0 8px var(--on); }
  .led.out-off { background: #4a3a10; }
  .led.out-on { background: var(--out); box-shadow: 0 0 8px var(--out); }
  .pin .bit { font-size: 10px; color: var(--muted); font-family: var(--mono); }
  .pin .dir { font-size: 9px; color: var(--muted); }
  .pin .dev { font-size: 9px; color: var(--fg); margin-top: 2px; height: 22px; overflow: hidden; }
  .kv { display: grid; grid-template-columns: auto 1fr; gap: 4px 12px; font-family: var(--mono); font-size: 13px; }
  .kv .k { color: var(--muted); }
  .statbits { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
  .sb { padding: 2px 6px; border-radius: 4px; background: var(--off); font-size: 11px; font-family: var(--mono); }
  .sb.set { background: var(--accent); color: #022; }
  .muted { color: var(--muted); }
  .mono { font-family: var(--mono); }
  footer { padding: 8px 20px; color: var(--muted); font-size: 11px; text-align: right; }
  .disconnected { color: var(--warn); }
  .port-label { font-size: 12px; color: var(--muted); margin: 10px 0 6px; font-family: var(--mono); }
  .mem-controls { display: flex; align-items: center; gap: 14px; margin-bottom: 12px; flex-wrap: wrap; font-size: 12px; }
  .mem-controls label { color: var(--muted); display: flex; align-items: center; gap: 6px; }
  .mem-controls input[type=text], .mem-controls input:not([type]) {
    background: var(--panel2); border: 1px solid #2d3745; color: var(--fg);
    border-radius: 4px; padding: 4px 8px; font-family: var(--mono); font-size: 13px;
  }
  .mem-controls select {
    background: var(--panel2); border: 1px solid #2d3745; color: var(--fg);
    border-radius: 4px; padding: 4px 6px; font-family: var(--mono);
  }
  .mem-controls button {
    background: var(--accent); color: #022; border: none; border-radius: 4px;
    padding: 5px 12px; font-weight: 600; cursor: pointer; font-size: 12px;
  }
  .mem-controls button:hover { filter: brightness(1.1); }
  .mem-controls .chk { cursor: pointer; }
  .memdump {
    margin: 0; font-family: var(--mono); font-size: 13px; line-height: 1.5;
    background: var(--bg); border: 1px solid #2d3745; border-radius: 6px;
    padding: 12px; overflow-x: auto; color: var(--fg);
  }
  .memdump .addr { color: var(--accent); }
  .memdump .ascii { color: var(--muted); }
  .memdump .pc { background: var(--out); color: #2b1d00; border-radius: 2px; }
</style>
</head>
<body>
<header>
  <h1 id="sysname">6502 Emulator</h1>
  <span id="state" class="state stopped">—</span>
  <span class="muted" id="cputype"></span>
  <span class="muted" id="clock"></span>
</header>

<div class="grid">
  <div class="panel">
    <h2>CPU Registers</h2>
    <div class="reg-grid">
      <div class="reg"><div class="label">A</div><div class="val mono" id="rA">--</div></div>
      <div class="reg"><div class="label">X</div><div class="val mono" id="rX">--</div></div>
      <div class="reg"><div class="label">Y</div><div class="val mono" id="rY">--</div></div>
      <div class="reg"><div class="label">SP</div><div class="val mono" id="rSP">--</div></div>
    </div>
    <div class="reg-grid" style="margin-top:10px; grid-template-columns: repeat(2,1fr);">
      <div class="reg"><div class="label">PC</div><div class="val mono" id="rPC">----</div></div>
      <div class="reg"><div class="label">P</div><div class="val mono" id="rP">--</div></div>
    </div>
    <div class="flags" id="flags"></div>
    <div class="kv" style="margin-top:12px;">
      <span class="k">IRQ pending</span><span id="irq">—</span>
      <span class="k">NMI pending</span><span id="nmi">—</span>
    </div>
  </div>

  <div class="panel">
    <h2>Execution</h2>
    <div class="kv">
      <span class="k">Total cycles</span><span id="cycles">—</span>
      <span class="k">Instructions</span><span id="instrs">—</span>
      <span class="k">Avg IPS</span><span id="ips">—</span>
      <span class="k">Actual clock</span><span id="actclock">—</span>
      <span class="k">Run time</span><span id="runtime">—</span>
    </div>
  </div>

  <div class="panel">
    <h2>Memory Map</h2>
    <table id="memmap"><thead><tr><th>Start</th><th>End</th><th>Size</th><th>Type</th></tr></thead><tbody></tbody></table>
  </div>

  <div class="panel" id="acia-panel" style="display:none;">
    <h2>ACIA (68B50)</h2>
    <div class="kv">
      <span class="k">Baud rate</span><span id="aciaBaud">—</span>
      <span class="k">Control</span><span id="aciaCtrl">—</span>
      <span class="k">Status</span><span id="aciaStatus">—</span>
    </div>
    <div class="statbits" id="aciaBits"></div>
  </div>

  <div class="panel" id="via-panel" style="display:none; grid-column: 1 / -1;">
    <h2>VIA (65C22) — Port State</h2>
    <div class="port-label">Port A &nbsp; <span id="viaAHex" class="mono"></span></div>
    <div class="bits" id="portA"></div>
    <div class="port-label">Port B &nbsp; <span id="viaBHex" class="mono"></span></div>
    <div class="bits" id="portB"></div>
    <div class="kv" style="margin-top:14px;">
      <span class="k">Timer 1</span><span id="t1">—</span>
      <span class="k">Timer 2</span><span id="t2">—</span>
      <span class="k">IFR</span><span id="ifr">—</span>
      <span class="k">IER</span><span id="ier">—</span>
      <span class="k">ACR / PCR</span><span id="acrpcr">—</span>
    </div>
  </div>

  <div class="panel" style="grid-column: 1 / -1;">
    <h2>Memory</h2>
    <div class="mem-controls">
      <label>Address <input id="memAddr" class="mono" value="0000" size="6" spellcheck="false"></label>
      <label>Bytes
        <select id="memLen" class="mono">
          <option value="128">128</option>
          <option value="256" selected>256</option>
          <option value="512">512</option>
          <option value="1024">1024</option>
        </select>
      </label>
      <button id="memGo">Go</button>
      <button id="memPC">Jump to PC</button>
      <label class="chk"><input type="checkbox" id="memLive"> live</label>
      <span id="memStatus" class="muted"></span>
    </div>
    <pre id="memDump" class="memdump">Enter an address and press Go.</pre>
  </div>
</div>

<footer><span id="conn">connecting…</span> · 6502 Emulator Dashboard</footer>

<script>
const hex = (v, w=2) => '$' + (v >>> 0).toString(16).toUpperCase().padStart(w, '0');

function renderPins(containerId, port) {
  const el = document.getElementById(containerId);
  el.innerHTML = '';
  for (const pin of port.pins) {
    const conn = (port.connections || []).find(c => c.pin === pin.bit);
    const dev = conn ? conn.device : '';
    let ledClass = 'led';
    if (pin.output) {
      ledClass += pin.value ? ' out-on' : ' out-off';
    } else {
      ledClass += pin.value ? ' on' : '';
    }
    const div = document.createElement('div');
    div.className = 'pin';
    div.innerHTML =
      '<div class="' + ledClass + '"></div>' +
      '<div class="bit">' + pin.bit + '</div>' +
      '<div class="dir">' + (pin.output ? 'OUT' : 'IN') + '</div>' +
      '<div class="dev">' + dev + '</div>';
    el.appendChild(div);
  }
}

// ── Memory hex view ──
let currentPC = 0;

function renderMemDump(start, bytes) {
  const lines = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const addr = (start + i) & 0xFFFF;
    let hexPart = '';
    let asciiPart = '';
    for (let j = 0; j < 16; j++) {
      if (i + j < bytes.length) {
        const b = bytes[i + j];
        const a = (start + i + j) & 0xFFFF;
        const bh = b.toString(16).toUpperCase().padStart(2, '0');
        hexPart += (a === currentPC) ? '<span class="pc">' + bh + '</span> ' : bh + ' ';
        asciiPart += (b >= 32 && b < 127) ? String.fromCharCode(b) : '.';
      } else {
        hexPart += '   ';
        asciiPart += ' ';
      }
      if (j === 7) hexPart += ' ';
    }
    lines.push(
      '<span class="addr">' + addr.toString(16).toUpperCase().padStart(4, '0') + '</span>: ' +
      hexPart + ' <span class="ascii">|' + asciiPart + '|</span>'
    );
  }
  return lines.join('\\n');
}

async function loadMemory() {
  const addrEl = document.getElementById('memAddr');
  const start = parseInt(addrEl.value.replace(/[^0-9a-fA-F]/g, ''), 16) || 0;
  const length = parseInt(document.getElementById('memLen').value, 10);
  const statusEl = document.getElementById('memStatus');
  try {
    const r = await fetch('/api/memory?start=0x' + start.toString(16) + '&length=' + length);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    document.getElementById('memDump').innerHTML = renderMemDump(d.start, d.bytes);
    statusEl.textContent = '';
  } catch (e) {
    statusEl.textContent = 'error: ' + e.message;
  }
}

document.getElementById('memGo').addEventListener('click', loadMemory);
document.getElementById('memAddr').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loadMemory();
});
document.getElementById('memPC').addEventListener('click', () => {
  // Align to a 16-byte boundary a little before PC for context
  const base = Math.max(0, (currentPC & 0xFFF0) - 0x10);
  document.getElementById('memAddr').value = base.toString(16).toUpperCase().padStart(4, '0');
  loadMemory();
});

async function poll() {
  try {
    const r = await fetch('/api/status');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const s = await r.json();
    currentPC = s.cpu.PC;
    document.getElementById('conn').textContent = 'connected';
    document.getElementById('conn').classList.remove('disconnected');

    document.getElementById('sysname').textContent = s.name;
    const stEl = document.getElementById('state');
    stEl.textContent = s.state;
    stEl.className = 'state ' + s.state;
    document.getElementById('cputype').textContent = s.cpu.type;
    document.getElementById('clock').textContent = (s.clockSpeed/1e6).toFixed(4) + ' MHz';

    // CPU
    document.getElementById('rA').textContent = hex(s.cpu.A);
    document.getElementById('rX').textContent = hex(s.cpu.X);
    document.getElementById('rY').textContent = hex(s.cpu.Y);
    document.getElementById('rSP').textContent = hex(s.cpu.SP);
    document.getElementById('rPC').textContent = hex(s.cpu.PC, 4);
    document.getElementById('rP').textContent = hex(s.cpu.P);
    document.getElementById('irq').textContent = s.cpu.irqPending ? 'YES' : 'no';
    document.getElementById('nmi').textContent = s.cpu.nmiPending ? 'YES' : 'no';

    const flagNames = ['N','V','B','D','I','Z','C'];
    const fEl = document.getElementById('flags');
    fEl.innerHTML = '';
    for (const f of flagNames) {
      const d = document.createElement('div');
      d.className = 'flag' + (s.cpu.flags[f] ? ' set' : '');
      d.textContent = f;
      fEl.appendChild(d);
    }

    // Stats
    document.getElementById('cycles').textContent = s.stats.totalCycles.toLocaleString();
    document.getElementById('instrs').textContent = s.stats.instructionsExecuted.toLocaleString();
    document.getElementById('ips').textContent = Math.round(s.stats.averageIPS).toLocaleString();
    document.getElementById('actclock').textContent = (s.stats.clockSpeed/1e6).toFixed(3) + ' MHz';
    document.getElementById('runtime').textContent = (s.stats.executionTimeMs/1000).toFixed(1) + ' s';

    // Memory map
    const tb = document.querySelector('#memmap tbody');
    tb.innerHTML = '';
    for (const m of s.memoryMap) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td>' + hex(m.start,4) + '</td><td>' + hex(m.end,4) +
        '</td><td>' + m.size + '</td><td>' + m.type + '</td>';
      tb.appendChild(tr);
    }

    // ACIA
    if (s.acia) {
      document.getElementById('acia-panel').style.display = '';
      document.getElementById('aciaBaud').textContent = s.acia.baudRate;
      document.getElementById('aciaCtrl').textContent = hex(s.acia.control);
      document.getElementById('aciaStatus').textContent = hex(s.acia.status);
      const bEl = document.getElementById('aciaBits');
      bEl.innerHTML = '';
      for (const [k,v] of Object.entries(s.acia.statusBits)) {
        const d = document.createElement('div');
        d.className = 'sb' + (v ? ' set' : '');
        d.textContent = k;
        bEl.appendChild(d);
      }
    }

    // VIA
    if (s.via) {
      document.getElementById('via-panel').style.display = '';
      document.getElementById('viaAHex').textContent =
        'data=' + hex(s.via.portA.data) + '  ddr=' + hex(s.via.portA.ddr);
      document.getElementById('viaBHex').textContent =
        'data=' + hex(s.via.portB.data) + '  ddr=' + hex(s.via.portB.ddr);
      renderPins('portA', s.via.portA);
      renderPins('portB', s.via.portB);
      document.getElementById('t1').textContent = s.via.timer1 + (s.via.timer1Running ? ' (running)' : '');
      document.getElementById('t2').textContent = s.via.timer2 + (s.via.timer2Running ? ' (running)' : '');
      document.getElementById('ifr').textContent = hex(s.via.ifr);
      document.getElementById('ier').textContent = hex(s.via.ier);
      document.getElementById('acrpcr').textContent = hex(s.via.acr) + ' / ' + hex(s.via.pcr);
    }

    // Live memory refresh
    if (document.getElementById('memLive').checked) {
      loadMemory();
    }
  } catch (e) {
    const c = document.getElementById('conn');
    c.textContent = 'disconnected (' + e.message + ')';
    c.classList.add('disconnected');
  }
}

poll();
setInterval(poll, 500);
</script>
</body>
</html>`;
