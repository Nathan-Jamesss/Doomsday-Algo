// portal/public/shared/globe.js
// Vanilla canvas globe (no React/build step). Requires d3-geo on window.d3.
// Renders into an existing <canvas>, auto-rotates, drag to spin, click to
// fire a callback. Any failure (no d3, no canvas, GeoJSON 404) must never
// break the page -- callers should treat load() rejecting as "skip the
// globe", not as an error to surface to the participant.
function createGlobe(canvas, options) {
  options = options || {};
  const ctx = canvas.getContext('2d');
  if (!ctx || !window.d3) return null;

  const cssW = options.width || canvas.clientWidth || 320;
  const cssH = options.height || canvas.clientHeight || 320;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  ctx.scale(dpr, dpr);

  const radius = Math.min(cssW, cssH) / 2.3;
  const projection = window.d3.geoOrthographic()
    .scale(radius)
    .translate([cssW / 2, cssH / 2])
    .clipAngle(90);
  const path = window.d3.geoPath().projection(projection).context(ctx);
  const graticule = window.d3.geoGraticule();

  const MARKER = [78, 22];
  const MAX_DOTS = 2200;
  const FRAME_MS = 1000 / 30;
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let land = null, dots = [], rotation = [0, -12], autoRotate = !REDUCED;
  let rafId = null, lastFrame = 0, resumeTimer = null, onClick = null;

  function inRing(pt, ring) {
    const x = pt[0], y = pt[1];
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function inFeature(pt, feature) {
    const g = feature.geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : [];
    for (let p = 0; p < polys.length; p++) {
      const poly = polys[p];
      if (!inRing(pt, poly[0])) continue;
      let hole = false;
      for (let i = 1; i < poly.length; i++) if (inRing(pt, poly[i])) { hole = true; break; }
      if (!hole) return true;
    }
    return false;
  }

  function buildDots(step) {
    const out = [];
    for (const feature of land.features) {
      const bounds = window.d3.geoBounds(feature);
      const minLng = bounds[0][0], minLat = bounds[0][1], maxLng = bounds[1][0], maxLat = bounds[1][1];
      for (let lng = minLng; lng <= maxLng; lng += step) {
        for (let lat = minLat; lat <= maxLat; lat += step) {
          if (inFeature([lng, lat], feature)) {
            const p = lat * Math.PI / 180, l = lng * Math.PI / 180;
            out.push({ lng: lng, lat: lat, x: Math.cos(p) * Math.cos(l), y: Math.cos(p) * Math.sin(l), z: Math.sin(p) });
          }
        }
      }
    }
    return out;
  }

  function generateDots() {
    let step = 2.2;
    dots = buildDots(step);
    let guard = 0;
    while (dots.length > MAX_DOTS && guard++ < 4) { step *= 1.3; dots = buildDots(step); }
  }

  function viewVector() {
    const l = -rotation[0] * Math.PI / 180, p = -rotation[1] * Math.PI / 180;
    return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)];
  }

  function render(t) {
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.beginPath();
    ctx.arc(cssW / 2, cssH / 2, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#050805';
    ctx.fill();
    ctx.strokeStyle = '#39FF6A';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.7;
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (!land) return;

    ctx.beginPath();
    path(graticule());
    ctx.strokeStyle = '#2A3B22';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    for (const f of land.features) path(f);
    ctx.strokeStyle = '#8FB37A';
    ctx.lineWidth = 1;
    ctx.stroke();

    const v = viewVector(), vx = v[0], vy = v[1], vz = v[2];
    ctx.fillStyle = '#5FE070';
    for (let i = 0; i < dots.length; i++) {
      const d = dots[i];
      if (d.x * vx + d.y * vy + d.z * vz <= 0) continue;
      const p = projection([d.lng, d.lat]);
      if (!p) continue;
      ctx.beginPath();
      ctx.arc(p[0], p[1], 1.1, 0, 2 * Math.PI);
      ctx.fill();
    }

    const m = projection(MARKER);
    const mp = MARKER[1] * Math.PI / 180, ml = MARKER[0] * Math.PI / 180;
    const facing = Math.cos(mp) * Math.cos(ml) * vx + Math.cos(mp) * Math.sin(ml) * vy + Math.sin(mp) * vz;
    if (m && facing > 0) {
      const pulse = 1 + 0.7 * (0.5 + 0.5 * Math.sin(t / 800));
      ctx.beginPath();
      ctx.arc(m[0], m[1], 4 * pulse, 0, 2 * Math.PI);
      ctx.fillStyle = '#ED1D24';
      ctx.fill();
    }
  }

  function frame(t) {
    rafId = requestAnimationFrame(frame);
    if (t - lastFrame < FRAME_MS) return;
    lastFrame = t;
    if (autoRotate) { rotation[0] += 0.4; projection.rotate(rotation); }
    render(t);
  }

  function isOnGlobe(e) {
    const r = canvas.getBoundingClientRect();
    const dx = e.clientX - r.left - cssW / 2, dy = e.clientY - r.top - cssH / 2;
    return dx * dx + dy * dy <= radius * radius;
  }

  let moved = 0;
  function down(e) {
    if (!isOnGlobe(e)) return;
    moved = 0; autoRotate = false;
    clearTimeout(resumeTimer);
    const sx = e.clientX, sy = e.clientY, start = rotation.slice();
    canvas.style.cursor = 'grabbing';
    function move(ev) {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
      rotation[0] = start[0] + dx * 0.4;
      rotation[1] = Math.max(-80, Math.min(80, start[1] - dy * 0.4));
      projection.rotate(rotation);
    }
    function up(ev) {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      canvas.style.cursor = 'pointer';
      resumeTimer = setTimeout(function () { autoRotate = !REDUCED; }, 1500);
      if (moved < 6 && onClick && isOnGlobe(ev)) onClick();
    }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  canvas.addEventListener('mousedown', down);
  canvas.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    down({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
  }, { passive: true });
  canvas.style.cursor = 'pointer';

  return {
    load: function () {
      return fetch(options.dataUrl || 'data/land-110m.json').then(function (res) {
        if (!res.ok) throw new Error('archive map unavailable');
        return res.json();
      }).then(function (json) {
        land = json;
        generateDots();
        projection.rotate(rotation);
        rafId = requestAnimationFrame(frame);
        return dots.length;
      });
    },
    onSurfaceClick: function (fn) { onClick = fn; },
    destroy: function () {
      if (rafId) cancelAnimationFrame(rafId);
      clearTimeout(resumeTimer);
      canvas.removeEventListener('mousedown', down);
    },
  };
}
