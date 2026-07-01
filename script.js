const YEAR_DATA = {"groupOrder":["Termination","Resignation","Demotion","Suspension","Written reprimand","Non-disciplinary reinstruction","Charges dismissed"],"groupColors":{"Termination":"#d64d4d","Resignation":"#e56430","Demotion":"#e6a94d","Suspension":"#23685b","Written reprimand":"#5fa896","Non-disciplinary reinstruction":"#a9d2cf","Charges dismissed":"#dbe7e3"},"years":[{"year":2017,"total":152,"segments":[{"group":"Termination","count":2,"color":"#d64d4d"},{"group":"Resignation","count":1,"color":"#e56430"},{"group":"Demotion","count":1,"color":"#e6a94d"},{"group":"Suspension","count":65,"color":"#23685b"},{"group":"Written reprimand","count":35,"color":"#5fa896"},{"group":"Non-disciplinary reinstruction","count":47,"color":"#a9d2cf"},{"group":"Charges dismissed","count":59,"color":"#dbe7e3"}]},{"year":2018,"total":197,"segments":[{"group":"Termination","count":15,"color":"#d64d4d"},{"group":"Demotion","count":2,"color":"#e6a94d"},{"group":"Suspension","count":78,"color":"#23685b"},{"group":"Written reprimand","count":72,"color":"#5fa896"},{"group":"Non-disciplinary reinstruction","count":32,"color":"#a9d2cf"},{"group":"Charges dismissed","count":45,"color":"#dbe7e3"}]},{"year":2019,"total":146,"segments":[{"group":"Resignation","count":1,"color":"#e56430"},{"group":"Suspension","count":82,"color":"#23685b"},{"group":"Written reprimand","count":24,"color":"#5fa896"},{"group":"Non-disciplinary reinstruction","count":25,"color":"#a9d2cf"},{"group":"Charges dismissed","count":51,"color":"#dbe7e3"}]},{"year":2020,"total":212,"segments":[{"group":"Resignation","count":1,"color":"#e56430"},{"group":"Suspension","count":100,"color":"#23685b"},{"group":"Written reprimand","count":43,"color":"#5fa896"},{"group":"Non-disciplinary reinstruction","count":56,"color":"#a9d2cf"},{"group":"Charges dismissed","count":75,"color":"#dbe7e3"}]},{"year":2021,"total":217,"segments":[{"group":"Resignation","count":1,"color":"#e56430"},{"group":"Demotion","count":2,"color":"#e6a94d"},{"group":"Suspension","count":148,"color":"#23685b"},{"group":"Written reprimand","count":29,"color":"#5fa896"},{"group":"Non-disciplinary reinstruction","count":30,"color":"#a9d2cf"},{"group":"Charges dismissed","count":64,"color":"#dbe7e3"}]},{"year":2022,"total":155,"segments":[{"group":"Demotion","count":1,"color":"#e6a94d"},{"group":"Suspension","count":71,"color":"#23685b"},{"group":"Written reprimand","count":21,"color":"#5fa896"},{"group":"Non-disciplinary reinstruction","count":52,"color":"#a9d2cf"},{"group":"Charges dismissed","count":36,"color":"#dbe7e3"}]},{"year":2023,"total":250,"segments":[{"group":"Termination","count":3,"color":"#d64d4d"},{"group":"Resignation","count":8,"color":"#e56430"},{"group":"Demotion","count":1,"color":"#e6a94d"},{"group":"Suspension","count":77,"color":"#23685b"},{"group":"Written reprimand","count":41,"color":"#5fa896"},{"group":"Non-disciplinary reinstruction","count":115,"color":"#a9d2cf"},{"group":"Charges dismissed","count":39,"color":"#dbe7e3"}]},{"year":2024,"total":128,"segments":[{"group":"Demotion","count":1,"color":"#e6a94d"},{"group":"Suspension","count":58,"color":"#23685b"},{"group":"Written reprimand","count":26,"color":"#5fa896"},{"group":"Non-disciplinary reinstruction","count":54,"color":"#a9d2cf"},{"group":"Charges dismissed","count":11,"color":"#dbe7e3"}]},{"year":2025,"total":109,"segments":[{"group":"Suspension","count":58,"color":"#23685b"},{"group":"Written reprimand","count":14,"color":"#5fa896"},{"group":"Non-disciplinary reinstruction","count":43,"color":"#a9d2cf"},{"group":"Charges dismissed","count":14,"color":"#dbe7e3"}]}]};
 
const PARTIAL_YEARS = new Set([]);
const fmt = n => n.toLocaleString('en-US');

const STAGGER_ORDER = [...YEAR_DATA.groupOrder].reverse();
const SEG_DURATION = 1000;
const STAGGER_STEP = 6;
const TOTAL_DURATION = (STAGGER_ORDER.length - 1) * STAGGER_STEP + SEG_DURATION;

const ease = t => {
  const c1 = 0.5, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

let animGen = 0;
 
// Category totals across all years (hearing-level), for legend ordering/labels
const catTotals = {};
YEAR_DATA.groupOrder.forEach(g => catTotals[g] = 0);
YEAR_DATA.years.forEach(y => y.segments.forEach(s => { catTotals[s.group] += s.count; }));
 
// State
let mode = 'count';     // 'count' | 'share'
let solo = new Set();   // category names highlighted, or empty
 
const svg = document.getElementById('chart');
const SVGNS = 'http://www.w3.org/2000/svg';
const tooltip = document.getElementById('tooltip');
const chartArea = document.querySelector('.chart-area');
 
// Layout constants (SVG user units)
const W = 880, H = 460;
const M = { top: 18, right: 14, bottom: 34, left: 40 };
const plotW = W - M.left - M.right;
const plotH = H - M.top - M.bottom;
 
function maxCount() {
  return Math.max(...YEAR_DATA.years.map(y => y.total));
}
function niceMax(v) {
  const step = v <= 60 ? 10 : v <= 150 ? 25 : 50;
  return Math.ceil(v / step) * step;
}
 
function el(tag, attrs, parent) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
 
function render() {
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = '';
  const years = YEAR_DATA.years;
  const n = years.length;
  const slot = plotW / n;
  const barW = Math.min(slot * 0.62, 52);
 
  const yTop = (mode === 'share') ? 100 : niceMax(maxCount());
 
  // Y gridlines + ticks
  const ticks = mode === 'share' ? [0,25,50,75,100] : (() => {
    const step = yTop <= 100 ? 25 : 50; const arr=[]; for(let v=0; v<=yTop; v+=step) arr.push(v); return arr;
  })();
  ticks.forEach(t => {
    const yy = M.top + plotH - (t / yTop) * plotH;
    el('line', { x1: M.left, y1: yy, x2: W - M.right, y2: yy, class: 'gridline' }, svg);
    el('text', { x: M.left - 7, y: yy + 4, 'text-anchor': 'end', class: 'ytick' }, svg)
      .textContent = mode === 'share' ? t + '%' : t;
  });
 
  years.forEach((yObj, i) => {
    const cx = M.left + slot * i + slot / 2;
    const x = cx - barW / 2;
 
    // order segments by groupOrder
    const segs = YEAR_DATA.groupOrder
      .map(g => yObj.segments.find(s => s.group === g))
      .filter(Boolean)
      .reverse();
 
    // mentions sum (a hearing can appear in >1 category)
    const ms = segs.reduce((a, s) => a + s.count, 0) || 1;
 
    // Each segment's plotted value:
    //  count mode  -> charge's share of the year's activity, scaled to the
    //                 real case count so the bar height === cases that year
    //  share mode  -> outcome's share of the year's activity, as a %
    const segValue = s => (mode === 'share')
      ? (s.count / ms * 100)
      : (s.count / ms * yObj.total);
 
    let acc = 0; // running plotted value from base
    segs.forEach(s => {
      const v = segValue(s);
      const segH = v / yTop * plotH;
      const yPos = M.top + plotH - (acc + v) / yTop * plotH;
      const dimmed = solo.size > 0 && !solo.has(s.group);
      const rect = el('rect', {
        x: x, y: yPos, width: barW, height: Math.max(segH, 0),
        fill: s.color, class: 'seg' + (dimmed ? ' dim' : ''),
        'data-year': yObj.year, 'data-group': s.group,
        'data-final-y': yPos, 'data-final-height': Math.max(segH, 0)
      }, svg);
      if (!dimmed) {
        rect.addEventListener('mousemove', (ev) => showTip(ev, yObj, s, ms));
        rect.addEventListener('mouseleave', hideTip);
      }
      acc += v;
    });
 
    // X label (year)
    const partial = PARTIAL_YEARS.has(yObj.year);
    const lbl = el('text', {
      x: cx, y: H - M.bottom + 18, 'text-anchor': 'middle',
      class: 'axis-text' + (partial ? ' partial' : '')
    }, svg);
    lbl.textContent = String(yObj.year);
    if (partial) {
      el('text', { x: cx, y: H - M.bottom + 30, 'text-anchor': 'middle',
        class: 'axis-text partial', 'font-size': '9px' }, svg).textContent = 'partial';
    }
 
    // total cases above bar (count mode only) — sits exactly at bar top
    if (mode === 'count') {
      const topY = M.top + plotH - (yObj.total / yTop) * plotH;
      const lbl = el('text', { x: cx, y: topY - 6, 'text-anchor': 'middle', class: 'col-total', opacity: 0 }, svg);
      lbl.textContent = yObj.total;
    }
  });
 
  renderLegend();
  renderNote();
}
 
function showTip(ev, yObj, s, ms) {
  const compPct = ms ? (s.count / ms * 100) : 0;       // share of year's charge activity
  const ofCases = yObj.total ? (s.count / yObj.total * 100) : 0; // appeared in % of cases
  tooltip.innerHTML =
    `<span class="tt-title">${s.group}</span>` +
    `<span class="tt-sub">${yObj.year}${PARTIAL_YEARS.has(yObj.year) ? ' \u00b7 partial year' : ''}</span>` +
    `<div class="tt-row"><span class="tt-swatch" style="background:${s.color}"></span>` +
    `<span class="tt-label">Outcome in</span>` +
    `<span class="tt-val">${fmt(s.count)} cases<span class="tt-pct">${ofCases.toFixed(0)}%</span></span></div>` +
    `<div class="tt-row"><span class="tt-swatch" style="background:transparent"></span>` +
    `<span class="tt-label">All cases, ${yObj.year}</span><span class="tt-val">${fmt(yObj.total)}</span></div>`;
  tooltip.classList.add('visible');
  const r = chartArea.getBoundingClientRect();
  let lx = ev.clientX - r.left + 14;
  let ly = ev.clientY - r.top + 12;
  if (lx + 200 > r.width) lx = ev.clientX - r.left - 200 - 6;
  tooltip.style.left = lx + 'px';
  tooltip.style.top = ly + 'px';
}
function hideTip() { tooltip.classList.remove('visible'); }
 
function renderNote() { /* methodology lives in the subheading */ }

function renderLegend() {
  const legend = document.getElementById('legend');
  legend.innerHTML = '';

  const allChip = document.createElement('div');
  allChip.className = 'legend-chip' + (solo.size === 0 ? ' solo' : '');
  allChip.innerHTML = `All charges`;
  allChip.addEventListener('click', () => { solo.clear(); render(); });
  legend.appendChild(allChip);

  YEAR_DATA.groupOrder.forEach(g => {
    const chip = document.createElement('div');
    chip.className = 'legend-chip';
    if (solo.size > 0 && !solo.has(g)) chip.classList.add('muted');
    if (solo.has(g)) chip.classList.add('solo');
    chip.innerHTML =
      `<span class="lg-dot" style="background:${YEAR_DATA.groupColors[g]}"></span>` +
      `${g}<span class="lg-count">${fmt(catTotals[g])}</span>`;
    chip.addEventListener('click', () => { solo.has(g) ? solo.delete(g) : solo.add(g); render(); });
    legend.appendChild(chip);
  });
}
 

 
document.querySelectorAll('.toggle-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    mode = btn.dataset.mode;
    render();
    animateBars();
  });
});

function hideBars() {
  const baseline = M.top + plotH;
  Array.from(svg.querySelectorAll('.seg')).forEach(rect => {
    rect.setAttribute('y', baseline);
    rect.setAttribute('height', 0);
  });
  Array.from(svg.querySelectorAll('.col-total')).forEach(l => l.setAttribute('opacity', '0'));
}

function animateBars() {
  const gen = ++animGen;
  const baseline = M.top + plotH;
  const start = performance.now();

  Array.from(svg.querySelectorAll('.seg')).forEach(rect => {
    const finalY = parseFloat(rect.dataset.finalY);
    const finalH = parseFloat(rect.dataset.finalHeight);
    const delay = STAGGER_ORDER.indexOf(rect.dataset.group) * STAGGER_STEP;
    rect.setAttribute('y', baseline);
    rect.setAttribute('height', 0);
    function frame(now) {
      if (gen !== animGen) return;
      const elapsed = now - start - delay;
      if (elapsed < 0) { requestAnimationFrame(frame); return; }
      const t = Math.min(elapsed / SEG_DURATION, 1);
      const e = ease(t);
      rect.setAttribute('height', Math.max(finalH * e, 0));
      rect.setAttribute('y', baseline + (finalY - baseline) * e);
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });

  const totals = Array.from(svg.querySelectorAll('.col-total'));
  totals.forEach(l => l.setAttribute('opacity', '0'));
  const labelStart = 0.75;
  function labelFrame(now) {
    if (gen !== animGen) return;
    const t = Math.min((now - start) / TOTAL_DURATION, 1);
    const op = Math.max(0, Math.min(1, (t - labelStart) / (1 - labelStart)));
    totals.forEach(l => l.setAttribute('opacity', op));
    if (t < 1) requestAnimationFrame(labelFrame);
  }
  requestAnimationFrame(labelFrame);
}

const xAxisSentinel = document.createElement('div');
xAxisSentinel.style.cssText = 'position:absolute;bottom:0;left:0;width:1px;height:1px;pointer-events:none;';
chartArea.appendChild(xAxisSentinel);

let chartAnimated = false;
const observer = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting && !chartAnimated) {
    chartAnimated = true;
    animateBars();
  }
}, { threshold: 0 });

render();
hideBars();
observer.observe(xAxisSentinel);