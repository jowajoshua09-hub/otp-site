const state = { all: [], search: '', sender: '', country: '' };
const $ = (id) => document.getElementById(id);

/* Helper to build inline SVG from sprite */
function svgIcon(name, size = 16) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><use href="#icon-${name}"/></svg>`;
}

function showToast(msg, isError = false) {
  const t = $('toast');
  t.querySelector('.toast-text').textContent = msg;
  t.classList.toggle('error', isError);
  t.querySelector('use').setAttribute('href', isError ? '#icon-x' : '#icon-check');
  t.classList.add('show');
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.remove('show'), 2000);
}

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
  }[c]));
}

/* Map sender name → sprite icon name */
function getSenderIcon(sender = '') {
  const s = sender.toLowerCase();
  if (s.includes('whatsapp')) return 'whatsapp';
  if (s.includes('google')) return 'google';
  if (s.includes('telegram')) return 'telegram';
  if (s.includes('apple')) return 'apple';
  if (s.includes('facebook') || s.includes('instagram')) return 'facebook';
  if (s.includes('mexc')) return 'mexc';
  if (s.includes('huawei')) return 'huawei';
  if (s.includes('samsung')) return 'samsung';
  if (s.includes('paypal')) return 'paypal';
  if (s.includes('viber')) return 'viber';
  if (s.includes('mama money') || s.includes('bank')) return 'money';
  if (s.includes('twilio')) return 'twilio';
  return 'phone';
}

function populateFilters(items) {
  const senders = [...new Set(items.map(x => x.sender).filter(Boolean))].sort();
  const countries = [...new Set(items.map(x => x.country).filter(Boolean))].sort();

  const sSel = $('senderFilter'), cSel = $('countryFilter');
  const curS = sSel.value, curC = cSel.value;

  sSel.innerHTML = '<option value="">All Senders</option>' +
    senders.map(s => `<option value="${escapeHtml(s)}" ${s === curS ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('');

  cSel.innerHTML = '<option value="">All Countries</option>' +
    countries.map(c => `<option value="${escapeHtml(c)}" ${c === curC ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('');
}

function render() {
  const q = state.search.toLowerCase();
  const filtered = state.all.filter(x => {
    if (state.sender && x.sender !== state.sender) return false;
    if (state.country && x.country !== state.country) return false;
    if (q) {
      const hay = `${x.sender} ${x.country} ${x.number} ${x.message}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  $('stats').textContent = `Showing ${filtered.length} of ${state.all.length} messages`;

  const html = filtered.map(x => {
    const hasOtp = x.otp && !x.otp.startsWith('No OTP');
    const otpDisplay = hasOtp
      ? `<div class="otp-code">${escapeHtml(x.otp)}</div>${svgIcon('copy', 18).replace('<svg', '<svg class="copy-icon"')}`
      : `<div class="otp-none">${svgIcon('x', 14)} No code (link only)</div>`;

    return `
      <div class="otp-card">
        <div class="card-header">
          <div class="sender-info">
            <div class="sender-icon">${svgIcon(getSenderIcon(x.sender), 20)}</div>
            <div style="min-width:0">
              <div class="sender-name">${escapeHtml(x.sender || 'Unknown')}</div>
              <div class="country-tag">
                ${svgIcon('phone', 12)}
                ${escapeHtml(x.country)}
              </div>
            </div>
          </div>
          <div class="card-time">${escapeHtml(x.time)}</div>
        </div>
        <div class="card-body">
          <div class="number-row">
            <span class="number-label">${svgIcon('phone', 14)} Number</span>
            <span class="number-value" data-copy="${escapeHtml(x.number)}" title="Click to copy ${escapeHtml(x.number)}">
              ${escapeHtml(x.maskedNumber || x.number)}
              ${svgIcon('copy', 14)}
            </span>
          </div>
          <div class="otp-display ${hasOtp ? '' : 'no-code'}" ${hasOtp ? `data-copy="${escapeHtml(x.otp)}"` : ''}>
            ${otpDisplay}
          </div>
          <div class="message-preview">${escapeHtml(x.message)}</div>
        </div>
      </div>
    `;
  }).join('');

  $('grid').innerHTML = html || `<p style="color:var(--text-muted); text-align:center; grid-column:1/-1; padding:2rem;">No matches found.</p>`;

  document.querySelectorAll('[data-copy]').forEach(el => {
    el.addEventListener('click', () => {
      const val = el.dataset.copy;
      if (!val) return;
      navigator.clipboard.writeText(val)
        .then(() => showToast(`Copied: ${val}`))
        .catch(() => showToast('Copy failed', true));
    });
  });
}

async function load(showStatus = true) {
  if (showStatus) {
    $('status').textContent = 'Loading…';
    $('status').className = 'status-badge';
  }
  try {
    const r = await fetch('/api/otps', { cache: 'no-store' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    if (!j?.data?.otps) throw new Error('Unexpected response shape');
    state.all = j.data.otps;
    populateFilters(state.all);
    render();
    $('status').textContent = `Live · ${new Date().toLocaleTimeString()}`;
    $('status').className = 'status-badge ok';
  } catch (e) {
    $('status').textContent = `Error: ${e.message}`;
    $('status').className = 'status-badge err';
  }
}

$('search').addEventListener('input', e => { state.search = e.target.value; render(); });
$('senderFilter').addEventListener('change', e => { state.sender = e.target.value; render(); });
$('countryFilter').addEventListener('change', e => { state.country = e.target.value; render(); });
$('refresh').addEventListener('click', () => load());

load();
setInterval(() => load(false), 15000);
