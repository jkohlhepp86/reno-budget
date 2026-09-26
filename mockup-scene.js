import * as THREE from 'three';

// Units: inches. World: x along sink wall (from corner), z into room (away from sink wall), y up.
const W = 1600, H = 1000;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;
scene.background = new THREE.Color(0xf4f1ea);

// ---------- textures ----------
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (repeat) t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  return t;
}
function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function veins(g, w, h, color, n, seed, alpha) {
  const r = rnd(seed);
  g.strokeStyle = color; g.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    g.lineWidth = 0.6 + r() * 1.6;
    g.beginPath();
    let x = r() * w, y = r() * h; g.moveTo(x, y);
    const ang = r() * Math.PI * 2;
    for (let k = 0; k < 14; k++) {
      x += Math.cos(ang + (r() - 0.5) * 1.4) * w * 0.06;
      y += Math.sin(ang + (r() - 0.5) * 1.4) * h * 0.06;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  g.globalAlpha = 1;
}
// Floor: 17-7/8" checker, marble look. One texture tile = 2x2 tiles.
const TILE = 17.875;
const floorTex = canvasTex(1024, 1024, (g, w, h) => {
  const s = w / 2;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const dark = (i + j) % 2 === 1;
    g.fillStyle = dark ? '#1d1f22' : '#efece6';
    g.fillRect(i * s, j * s, s, s);
  }
  g.save(); g.beginPath(); g.rect(0, 0, s, s); g.rect(s, s, s, s); g.clip();
  veins(g, w, h, '#b9b3a8', 26, 7, 0.55); g.restore();
  g.save(); g.beginPath(); g.rect(s, 0, s, s); g.rect(0, s, s, s); g.clip();
  veins(g, w, h, '#8d8a86', 26, 11, 0.5); g.restore();
  g.strokeStyle = '#9b958c'; g.lineWidth = 3;
  for (let k = 0; k <= 2; k++) { g.beginPath(); g.moveTo(k * s, 0); g.lineTo(k * s, h); g.stroke(); g.beginPath(); g.moveTo(0, k * s); g.lineTo(w, k * s); g.stroke(); }
});
const counterTex = canvasTex(1024, 1024, (g, w, h) => {
  g.fillStyle = '#f3efe7'; g.fillRect(0, 0, w, h);
  veins(g, w, h, '#b8b1a6', 18, 3, 0.45);
  veins(g, w, h, '#c9b08a', 6, 5, 0.3);
});
const subwayTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#d8d4cc'; g.fillRect(0, 0, w, h);
  const tw = w / 4, th = h / 8; const r = rnd(9);
  for (let row = 0; row < 8; row++) for (let col = -1; col < 5; col++) {
    const off = row % 2 ? tw / 2 : 0;
    const v = 244 + Math.floor(r() * 10);
    g.fillStyle = `rgb(${v},${v - 1},${v - 5})`;
    g.fillRect(col * tw + off + 3, row * th + 3, tw - 6, th - 6);
  }
});
const woodTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#b89968'; g.fillRect(0, 0, w, h);
  const r = rnd(4); g.globalAlpha = 0.25;
  for (let i = 0; i < 60; i++) { g.strokeStyle = r() > 0.5 ? '#8e6f43' : '#d1b688'; g.beginPath(); const y = r() * h; g.moveTo(0, y); g.bezierCurveTo(w / 3, y + 4, 2 * w / 3, y - 4, w, y); g.stroke(); }
});

// ---------- materials ----------
const M = {
  wall: new THREE.MeshStandardMaterial({ color: 0xdde1da, roughness: 0.95 }),
  ceil: new THREE.MeshStandardMaterial({ color: 0xfaf8f4, roughness: 1 }),
  cab: new THREE.MeshStandardMaterial({ color: 0xb3b2ad, roughness: 0.5 }),
  cabDark: new THREE.MeshStandardMaterial({ color: 0x9e9d98, roughness: 0.6 }),
  navy: new THREE.MeshStandardMaterial({ color: 0x1e2940, roughness: 0.5 }),
  navyDark: new THREE.MeshStandardMaterial({ color: 0x172033, roughness: 0.55 }),
  counter: new THREE.MeshStandardMaterial({ map: counterTex, roughness: 0.18, metalness: 0 }),
  floor: new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.35 }),
  subway: new THREE.MeshStandardMaterial({ map: subwayTex, roughness: 0.15 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc9a25a, roughness: 0.3, metalness: 1 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xc7c9cb, roughness: 0.28, metalness: 0.9 }),
  steelDark: new THREE.MeshStandardMaterial({ color: 0x8e9194, roughness: 0.3, metalness: 0.9 }),
  blackGlass: new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.08, metalness: 0.2 }),
  sinkSteel: new THREE.MeshStandardMaterial({ color: 0x9a9da0, roughness: 0.35, metalness: 0.9 }),
  trim: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }),
  sky: new THREE.MeshBasicMaterial({ color: 0xdfe9d6 }),
  leaves: new THREE.MeshStandardMaterial({ color: 0x6f8f5a, roughness: 1 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xdfeee0, roughness: 0.02, transparent: true, opacity: 0.16, metalness: 0, envMapIntensity: 0.25, side: THREE.DoubleSide }),
  bulb: new THREE.MeshBasicMaterial({ color: 0xfff1c9 }),
  wood: new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.7 }),
  rattan: new THREE.MeshStandardMaterial({ color: 0xc8a472, roughness: 0.9 }),
  shadowGap: new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 1 }),
};

function box(w, h, d, mat, x, y, z, parent = scene, cast = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true;
  parent.add(m); return m;
}

// ---------- a cabinet "run": local u along run, v up, local +z = outward ----------
// Built in local coords: u -> +x, outward -> +z. Wall face at z=0.
function shakerFront(g, u0, v0, w, h, depth, mat, gap = 0.12) {
  // front face at z = depth. Frame + recessed panel.
  const fw = 2.25; // stile width
  const t = 0.75;
  const x = u0 + w / 2, y = v0 + h / 2;
  box(w - gap * 2, h - gap * 2, t, mat, x, y, depth + t / 2, g);
  if (w > 7 && h > 7) {
    // recessed panel suggestion: slightly darker thin inset
    box(w - 2 * fw - gap * 2, h - 2 * fw - gap * 2, 0.06, mat === M.navy ? M.navyDark : M.cabDark, x, y, depth + t + 0.03, g, false);
    box(w - 2 * fw - gap * 2 - 0.9, h - 2 * fw - gap * 2 - 0.9, 0.1, mat, x, y, depth + t + 0.05, g, false);
  }
}
function knob(g, x, y, z) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), M.brass); m.position.set(x, y, z + 0.6); m.castShadow = true; g.add(m); }
function pull(g, x, y, z, len = 5, vertical = false) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, len, 12), M.brass);
  if (!vertical) m.rotation.z = Math.PI / 2;
  m.position.set(x, y, z + 1.1); m.castShadow = true; g.add(m);
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.1, 8), M.brass); p.rotation.x = Math.PI / 2; p.position.set(vertical ? x : x + s * (len / 2 - 0.4), vertical ? y + s * (len / 2 - 0.4) : y, z + 0.55); g.add(p); }
}
// Base cabinet with configurable face layout. faces: array of rows from top: {h, cols:n, type:'drawer'|'door'}
function baseCab(g, u0, w, faces, mat = M.cab, depth = 24) {
  const toe = 4, boxH = 34.5 - toe;
  box(w, boxH, depth - 0.75, mat, u0 + w / 2, toe + boxH / 2, (depth - 0.75) / 2, g);
  box(w, toe, depth - 3.75, M.shadowGap, u0 + w / 2, toe / 2, (depth - 3.75) / 2, g, false);
  let top = 34.5;
  for (const row of faces) {
    const rh = row.h === 'rest' ? top - toe : row.h;
    const cw = w / row.cols;
    for (let c = 0; c < row.cols; c++) {
      const x0 = u0 + c * cw;
      shakerFront(g, x0, top - rh, cw, rh, depth - 0.75, mat);
      const cx = x0 + cw / 2;
      if (row.type === 'drawer') pull(g, cx, top - Math.min(rh / 2, 3), depth, Math.min(6, cw * 0.4));
      else if (row.type === 'door') {
        const hx = row.cols === 2 ? (c === 0 ? x0 + cw - 2 : x0 + 2) : x0 + cw - 2;
        knob(g, hx, top - 3.5, depth);
      } else if (row.type === 'pullout') pull(g, cx, top - 3, depth, 4, true);
    }
    top -= rh;
  }
}
function upperCab(g, u0, w, y0, h, mat = M.cab, depth = 12, stacked = true) {
  box(w, h, depth - 0.75, mat, u0 + w / 2, y0 + h / 2, (depth - 0.75) / 2, g);
  const cols = w > 26 ? 2 : 1;
  const rows = stacked && h > 30 ? [16, h - 16] : [h];
  let top = y0 + h;
  for (const rh of rows) {
    const cw = w / cols;
    for (let c = 0; c < cols; c++) {
      const x0 = u0 + c * cw;
      shakerFront(g, x0, top - rh, cw, rh, depth - 0.75, mat);
      const hx = cols === 2 ? (c === 0 ? x0 + cw - 2 : x0 + 2) : x0 + cw - 2;
      knob(g, hx, top - rh + 3, depth);
    }
    top -= rh;
  }
}
function crown(g, u0, w, depth) {
  box(w + 1, 2, depth + 1.2, M.cab, u0 + w / 2, 104.5, (depth + 1.2) / 2, g);
}

// ---------- room shell ----------
const CEIL = 105.5;
const floor = new THREE.Mesh(new THREE.PlaneGeometry(172, 186), M.floor);
floor.rotation.x = -Math.PI / 2; floor.position.set(71.6, 0, 93); floor.receiveShadow = true;
M.floor.map.repeat.set(172 / (2 * TILE), 186 / (2 * TILE));
scene.add(floor);
const ceil = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), M.ceil);
ceil.rotation.x = Math.PI / 2; ceil.position.set(80, CEIL, 100); scene.add(ceil);

// Sink wall (z=0): tall gridded window over the sink, sill just above the counter
const WX0 = 67.75, WX1 = 108.25, WY0 = 39, WY1 = 99;
function wallSeg(x0, x1, y0, y1, z) { box(x1 - x0, y1 - y0, 4, M.wall, (x0 + x1) / 2, (y0 + y1) / 2, z - 2, scene, false); }
wallSeg(-14.25, WX0, 0, CEIL, 0); wallSeg(WX1, 157.5, 0, CEIL, 0);
wallSeg(WX0, WX1, 0, WY0, 0); wallSeg(WX0, WX1, WY1, CEIL, 0);
box(WX1 - WX0 + 30, WY1 - WY0 + 30, 1, M.sky, (WX0 + WX1) / 2, (WY0 + WY1) / 2, -40, scene, false);
for (let i = 0; i < 9; i++) { const sph = new THREE.Mesh(new THREE.SphereGeometry(9 + (i % 3) * 3, 12, 10), M.leaves); sph.position.set(WX0 + 2 + i * 5, WY0 + 26 + ((i * 7) % 24), -34 - (i % 2) * 3); scene.add(sph); }
// deep jambs (thick old wall) + muntin grid 3 x 6
box(1, WY1 - WY0, 6, M.trim, WX0 - 0.5, (WY0 + WY1) / 2, -3); box(1, WY1 - WY0, 6, M.trim, WX1 + 0.5, (WY0 + WY1) / 2, -3);
box(WX1 - WX0, 1, 6, M.trim, (WX0 + WX1) / 2, WY1 + 0.5, -3); box(WX1 - WX0 + 1, 1, 6.5, M.trim, (WX0 + WX1) / 2, WY0 - 0.5, -3);
for (let i = 1; i < 3; i++) box(0.9, WY1 - WY0, 0.9, M.brass, WX0 + i * (WX1 - WX0) / 3, (WY0 + WY1) / 2, -5);
for (let j = 1; j < 6; j++) box(WX1 - WX0, 0.9, 0.9, M.brass, (WX0 + WX1) / 2, WY0 + j * (WY1 - WY0) / 6, -5);

// ---- helpers for walls with cased openings (local u along wall, local +z = into room, wall face at z=0) ----
M.trimShadow = new THREE.MeshStandardMaterial({ color: 0xd9d9d4, roughness: 0.7 });
function wallWithOpenings(g, len, openings) {
  const ops = [...openings].sort((p, q) => p.u0 - q.u0); let u = 0;
  for (const o of ops) {
    if (o.u0 > u) box(o.u0 - u, CEIL, 4, M.wall, (u + o.u0) / 2, CEIL / 2, -2, g, false);
    if (o.y0 > 0) box(o.u1 - o.u0, o.y0, 4, M.wall, (o.u0 + o.u1) / 2, o.y0 / 2, -2, g, false);
    box(o.u1 - o.u0, CEIL - o.y1, 4, M.wall, (o.u0 + o.u1) / 2, (o.y1 + CEIL) / 2, -2, g, false);
    u = o.u1;
  }
  if (u < len) box(len - u, CEIL, 4, M.wall, (u + len) / 2, CEIL / 2, -2, g, false);
}
function casing(g, u0, u1, y0, y1) {
  const cw = 4.5, t = 0.9;
  for (const uc of [u0 - cw / 2, u1 + cw / 2]) {
    box(cw, y1 - y0, t, M.trim, uc, y0 + (y1 - y0) / 2, t / 2, g);
    for (const f of [-1.2, 0, 1.2]) box(0.35, y1 - y0 - (y0 > 0 ? 2 : 9), 0.2, M.trimShadow, uc + f, y0 + (y0 > 0 ? 1 : 8) + (y1 - y0 - (y0 > 0 ? 2 : 9)) / 2, t + 0.05, g, false);
    box(cw + 0.5, cw + 0.5, t + 0.4, M.trim, uc, y1 + cw / 2, (t + 0.4) / 2, g);
    const ro = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.5, 24), M.trim); ro.rotation.x = Math.PI / 2; ro.position.set(uc, y1 + cw / 2, t + 0.6); g.add(ro);
    const ri = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.18, 8, 24), M.trimShadow); ri.position.set(uc, y1 + cw / 2, t + 0.85); g.add(ri);
    if (y0 === 0) box(cw + 0.5, 8, t + 0.5, M.trim, uc, 4, (t + 0.5) / 2, g);
  }
  box(u1 - u0, cw, t, M.trim, (u0 + u1) / 2, y1 + cw / 2, t / 2, g);
  for (const f of [-1.2, 0, 1.2]) box(u1 - u0, 0.35, 0.2, M.trimShadow, (u0 + u1) / 2, y1 + cw / 2 + f, t + 0.05, g, false);
  if (y0 > 0) box(u1 - u0 + 3, 1.2, 2.5, M.trim, (u0 + u1) / 2, y0 - 0.6, 1.2, g);
}
function baseboard(g, u0, u1) { box(u1 - u0, 7, 0.7, M.trim, (u0 + u1) / 2, 3.5, 0.35, g, false); }
function crownRun(g, u0, u1) { box(u1 - u0, 4, 3, M.trim, (u0 + u1) / 2, CEIL - 2, 1.5, g, false); }
function wallGroup(x, z, rot) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; scene.add(g); return g; }
const ROOM_D = 186;               // sink wall (z=0) to the wall opposite it
const M2 = {
  hall: new THREE.MeshStandardMaterial({ color: 0x27333d, roughness: 0.9 }),
  woodFloor: new THREE.MeshStandardMaterial({ color: 0x4a2f22, roughness: 0.6 }),
  room: new THREE.MeshStandardMaterial({ color: 0x8e8f8c, roughness: 0.95 }),
  sun: new THREE.MeshBasicMaterial({ color: 0xf1ecd0 }),
  porch: new THREE.MeshBasicMaterial({ color: 0xe9eee4 }),
};

// Range wall: cabinet plane x=0 from the corner to z=104; fridge recess / doorway plane x=-14.25 from z=104 to the far wall
box(4, CEIL, 104, M.wall, -2, CEIL / 2, 52, scene, false);
box(14.25, CEIL, 4, M.wall, -7.1, CEIL / 2, 102, scene, false);
{
  const g = wallGroup(-14.25, ROOM_D, Math.PI / 2);   // u = 186 - z
  const TV = { u0: 10, u1: 42, y0: 0, y1: 84 };      // doorway to the living room, right past the fridge panel
  wallWithOpenings(g, ROOM_D - 104, [TV]); casing(g, TV.u0, TV.u1, 0, 84); baseboard(g, 0, TV.u0 - 4.5); crownRun(g, 0, 46);
  // living room beyond (dark wood floor, gray walls, bright window)
  const f = new THREE.Mesh(new THREE.PlaneGeometry(90, 60), M2.woodFloor); f.rotation.x = -Math.PI / 2; f.position.set(-60, 0.05, 160); scene.add(f);
  box(2, CEIL, 60, M2.room, -105, CEIL / 2, 160, scene, false); box(90, CEIL, 2, M2.room, -60, CEIL / 2, 131, scene, false); box(90, CEIL, 2, M2.room, -60, CEIL / 2, 190, scene, false);
  box(1, 50, 26, M2.sun, -104, 60, 165, scene, false);
}
// Wall opposite the sink: closet door near the range-wall corner, then the wide cased opening to the hallway
{
  const g = wallGroup(157.5, ROOM_D, Math.PI);        // u = 157.5 - x
  const CL = { u0: 157.5 - 32, u1: 157.5 - 2, y0: 0, y1: 80 };     // closet x 2..32
  const HALL = { u0: 157.5 - 96, u1: 157.5 - 48, y0: 0, y1: 86 };  // hallway x 48..96
  wallWithOpenings(g, 157.5 + 16.25, [CL, HALL]); casing(g, CL.u0, CL.u1, 0, 80); casing(g, HALL.u0, HALL.u1, 0, 86);
  baseboard(g, 4, HALL.u0 - 4.5); baseboard(g, HALL.u1 + 4.5, CL.u0 - 4.5); crownRun(g, 0, 157.5 + 16.25);
  // closet door (4-panel), closed
  const dw = CL.u1 - CL.u0, dc = (CL.u0 + CL.u1) / 2;
  box(dw, 80, 1.6, M.trim, dc, 40, -0.9, g);
  for (const [py, ph] of [[46, 28], [10, 30]]) for (const px of [-dw / 4, dw / 4]) { box(dw / 2 - 5, ph, 0.3, M.trimShadow, dc + px, py + ph / 2, -0.05, g, false); box(dw / 2 - 6, ph - 1, 0.35, M.trim, dc + px, py + ph / 2, 0.05, g, false); }
  const kn = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), new THREE.MeshStandardMaterial({ color: 0x2b2522, metalness: 0.6, roughness: 0.4 })); kn.position.set(CL.u0 + 3, 36, 1); g.add(kn);
  // hallway beyond: dark navy walls, lit dining room at the end
  const hf = new THREE.Mesh(new THREE.PlaneGeometry(48, 70), M.floor); hf.rotation.x = -Math.PI / 2; hf.position.set(72, 0.05, ROOM_D + 35); scene.add(hf);
  box(2, CEIL, 70, M2.hall, 47, CEIL / 2, ROOM_D + 35, scene, false); box(2, CEIL, 70, M2.hall, 97, CEIL / 2, ROOM_D + 35, scene, false);
  box(48, 84, 1, new THREE.MeshBasicMaterial({ color: 0xe8e1b8 }), 72, 42, ROOM_D + 70, scene, false);
}
// Right wall (x=157.5): large double-hung window to the porch, then the doorway to the back entry
{
  const g = wallGroup(157.5, 0, -Math.PI / 2);        // u = z
  const WIN = { u0: 50, u1: 86, y0: 28, y1: 94 }, BK = { u0: 138, u1: 170, y0: 0, y1: 82 };
  wallWithOpenings(g, ROOM_D, [WIN, BK]); casing(g, WIN.u0, WIN.u1, WIN.y0, WIN.y1); casing(g, BK.u0, BK.u1, 0, 82);
  baseboard(g, 25.5, WIN.u0 - 4.5); baseboard(g, WIN.u0 - 4.5, BK.u0 - 4.5); baseboard(g, BK.u1 + 4.5, ROOM_D); crownRun(g, 0, ROOM_D);
  box(WIN.u1 - WIN.u0, 1.5, 2, M.trim, (WIN.u0 + WIN.u1) / 2, (WIN.y0 + WIN.y1) / 2, -2, g);   // meeting rail
  box(WIN.u1 - WIN.u0 + 20, WIN.y1 - WIN.y0 + 20, 1, M2.porch, (WIN.u0 + WIN.u1) / 2, (WIN.y0 + WIN.y1) / 2, -30, g, false);
  // back entry: tiled floor, white half-glass exterior door at the end
  const ef = new THREE.Mesh(new THREE.PlaneGeometry(60, 32), M.floor); ef.rotation.x = -Math.PI / 2; ef.position.set(187, 0.05, 154); scene.add(ef);
  box(1, 80, 32, M.trim, 216, 40, 154, scene, false); box(0.5, 30, 20, M2.porch, 215.4, 62, 154, scene, false);
  box(60, CEIL, 1, M2.room, 187, CEIL / 2, 137.5, scene, false); box(60, CEIL, 1, M2.room, 187, CEIL / 2, 170.5, scene, false);
}
// sink wall + range wall crown / baseboards where exposed
{ const g = wallGroup(0, 0, 0); crownRun(g, 67.75, 108.25); }
// Backsplash (subway) sink wall y 36..54 and around window, left wall z 0..104 y36..54 behind range to 71
function splash(w, h, x, y, z, rotY, u, v) {
  const t = subwayTex.clone(); t.needsUpdate = true; t.repeat.set(w / 12, h / 6); // 4 tiles per 12", 8 rows per 24"? tex = 4x8 tiles of 3x6 -> 12" x 24"
  t.repeat.set(w / 24, h / 24);
  const mat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.15 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); m.rotation.y = rotY; m.receiveShadow = true; scene.add(m);
}
splash(WX0, 18, WX0 / 2, 45, 0.3, 0); splash(153.5 - WX1, 18, (WX1 + 153.5) / 2, 45, 0.3, 0); splash(WX1 - WX0, WY0 - 36 - 3.5, (WX0 + WX1) / 2, 36 + (WY0 - 3.5 - 36) / 2, 0.3, 0);
splash(104, 18, 0.3, 45, 52, Math.PI / 2);
splash(30, 71.25 - 54, 0.3, 54 + (71.25 - 54) / 2, 139.5 - 78.5, Math.PI / 2);

// ---------- sink wall run ----------
const sinkRun = new THREE.Group(); scene.add(sinkRun);
baseCab(sinkRun, 0, 36, [{ h: 'rest', cols: 1, type: 'door' }]);                      // corner lazy susan
baseCab(sinkRun, 36, 33.75, [{ h: 5, cols: 1, type: 'drawer' }, { h: 'rest', cols: 2, type: 'door' }]);
baseCab(sinkRun, 69.75, 36, [{ h: 5, cols: 1, type: 'false' }, { h: 'rest', cols: 2, type: 'door' }]);
// dishwasher (stainless)
box(23.6, 30.2, 1.5, M.steel, 117.75, 4 + 15.1, 23.5, sinkRun); box(23.6, 3.2, 1.6, M.steelDark, 117.75, 32.6, 23.6, sinkRun);
pull(sinkRun, 117.75, 31, 24.2, 16);
box(24, 4, 20, M.shadowGap, 117.75, 2, 10, sinkRun, false);
baseCab(sinkRun, 129.75, 23.75, [{ h: 5, cols: 1, type: 'drawer' }, { h: 12.75, cols: 1, type: 'drawer' }, { h: 'rest', cols: 1, type: 'drawer' }]);
// uppers
upperCab(sinkRun, 0, 24, 54, 49.5); upperCab(sinkRun, 24, 43, 54, 49.5); upperCab(sinkRun, 108.5, 45, 54, 49.5);
crown(sinkRun, 0, 67, 12); crown(sinkRun, 108.5, 45, 12);
box(41.5, 2, 13.2, M.cab, 87.75, 104.5, 6.6, sinkRun); // valance/crown over window

// counter sink wall (with undermount sink cutout)
const SX = 87.75, SW = 30, SD = 17, SZ = 13;
function slab(x0, x1, z0, z1) { const w = x1 - x0, d = z1 - z0; const m = box(w, 1.5, d, M.counter.clone(), x0 + w / 2, 35.25, z0 + d / 2); m.material.map = counterTex.clone(); m.material.map.needsUpdate = true; m.material.map.repeat.set(w / 90, d / 90); }
slab(0, SX - SW / 2, 0, 25.5); slab(SX + SW / 2, 153.5, 0, 25.5);
slab(SX - SW / 2, SX + SW / 2, 0, SZ - SD / 2); slab(SX - SW / 2, SX + SW / 2, SZ + SD / 2, 25.5);
// sink bowl
box(SW, 0.3, SD, M.sinkSteel, SX, 27, SZ); box(SW, 9, 0.3, M.sinkSteel, SX, 31, SZ - SD / 2); box(SW, 9, 0.3, M.sinkSteel, SX, 31, SZ + SD / 2);
box(0.3, 9, SD, M.sinkSteel, SX - SW / 2, 31, SZ); box(0.3, 9, SD, M.sinkSteel, SX + SW / 2, 31, SZ);
// faucet (brass gooseneck)
{
  const f = new THREE.Group(); scene.add(f);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 1.2, 20), M.brass); base.position.set(SX, 36.6, 2.8); f.add(base);
  const riser = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 12, 16), M.brass); riser.position.set(SX, 43, 2.8); f.add(riser);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.55, 12, 24, Math.PI), M.brass); arc.rotation.y = Math.PI / 2; arc.position.set(SX, 49, 7.3); f.add(arc);
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 4, 12), M.brass); spout.position.set(SX, 47, 11.8); f.add(spout);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 4, 10), M.brass); handle.rotation.z = Math.PI / 3; handle.position.set(SX + 2.5, 42, 2.8); f.add(handle);
  f.traverse(o => { o.castShadow = true; });
}

// ---------- left (range) wall run: origin at z=139.5, u toward -z, outward = +x ----------
const leftRun = new THREE.Group(); leftRun.rotation.y = Math.PI / 2; leftRun.position.set(0, 0, 139.5); scene.add(leftRun);
// fridge side panel (38.25 deep from recess wall at local z=-14.25) at u 0..1.5
box(1.5, 103.5, 38.25, M.cab, 0.75, 51.75, -14.25 + 38.25 / 2, leftRun);
// fridge upper (24 deep) u 1.5..35.5, y 71..103.5 (sits on recess), plus box behind to recess wall
box(34, 32.5, 14.25, M.cab, 18.5, 87.25, -7.1, leftRun, false);
upperCab(leftRun, 1.5, 34, 71, 32.5, M.cab, 24, false);
// tall panel between fridge and base run
box(1.5, 103.5, 38.25, M.cab, 36.25, 51.75, -14.25 + 38.25 / 2, leftRun);
// fridge: 32.75w x 69.875h, case back 2" off recess wall, doors front at depth 22.75
{
  const fx = 1.5 + 34 / 2, back = -14.25 + 2, caseD = 30.625, front = back + 35;
  box(32.75, 68.6, caseD, M.steelDark, fx, 0.6 + 34.3, back + caseD / 2, leftRun);
  const doorT = front - (back + caseD);
  // french doors (top ~40") and freezer drawer
  box(16.3, 40, doorT, M.steel, fx - 8.2, 29.5 + 20, back + caseD + doorT / 2, leftRun);
  box(16.3, 40, doorT, M.steel, fx + 8.2, 29.5 + 20, back + caseD + doorT / 2, leftRun);
  box(32.6, 28, doorT, M.steel, fx, 1 + 14, back + caseD + doorT / 2, leftRun);
  for (const s of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 26, 12), M.steelDark); h.position.set(fx - s * 1.3, 52, front + 1.8); leftRun.add(h);
  }
  const dh = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 24, 12), M.steelDark); dh.rotation.z = Math.PI / 2; dh.position.set(fx, 26, front + 1.8); leftRun.add(dh);
}
// filler + base 24 (4 drawers + 7" tray pullout) u 37..61 ; range 61..91 ; utensil PO 10 u 91..101 ; corner 101..139.5
box(2.5, 30.5, 23.25, M.cab, 38.25, 4 + 15.25, 11.6, leftRun);
{
  const g = leftRun;
  baseCab(g, 39.5, 17, [{ h: 5, cols: 1, type: 'drawer' }, { h: 5, cols: 1, type: 'drawer' }, { h: 6.5, cols: 1, type: 'drawer' }, { h: 'rest', cols: 1, type: 'drawer' }]);
  baseCab(g, 56.5, 7, [{ h: 'rest', cols: 1, type: 'pullout' }]);
  baseCab(g, 93.5, 10, [{ h: 'rest', cols: 1, type: 'pullout' }]);
  baseCab(g, 103.5, 12, [{ h: 'rest', cols: 1, type: 'door' }]);
}
// range 30" slide-in, u 63.5..93.5
{
  const g = leftRun, rx = 78.5;
  box(29.9, 35.3, 25, M.steel, rx, 0.5 + 17.65, 12.5, g);
  box(29.9, 14, 0.3, M.blackGlass, rx, 25, 25.1, g); box(29.9, 14.5, 0.3, M.blackGlass, rx, 9.5, 25.1, g);
  pull(g, rx, 32.4, 25.3, 24); pull(g, rx, 17.5, 25.3, 24);
  box(31, 0.4, 25.5, M.blackGlass, rx, 36.2, 12.75, g);
  for (const [cx, cz, r] of [[-7, 6, 5], [7, 6, 4.5], [-7, 18, 4.5], [7, 18, 5]]) { const c = new THREE.Mesh(new THREE.RingGeometry(r - 0.25, r, 40), new THREE.MeshBasicMaterial({ color: 0x3a3a3e })); c.rotation.x = -Math.PI / 2; c.position.set(rx + cx, 36.42, cz); g.add(c); }
}
// counters on left run: from corner (u 139.5) to u 93.5 and u 63.5..37 ; depth 25.5 ; local z 0..25.5
function slabL(u0, u1) { const w = u1 - u0; const m = box(w, 1.5, 25.5, M.counter.clone(), u0 + w / 2, 35.25, 12.75, leftRun); m.material.map = counterTex.clone(); m.material.map.needsUpdate = true; m.material.map.repeat.set(w / 90, 25.5 / 90); }
slabL(93.5, 139.5 - 25.5); slabL(37, 63.5);
// uppers left run: 24 above base u 39.5..63.5 ; microwave + cabinet above u 63.5..93.5 ; 22 u 93.5..115.5 ; corner 24 u 115.5..139.5
upperCab(leftRun, 39.5, 24, 54, 49.5); upperCab(leftRun, 93.5, 22, 54, 49.5); upperCab(leftRun, 115.5, 12, 54, 49.5);
upperCab(leftRun, 63.5, 30, 71.25, 32.25, M.cab, 12, false);
crown(leftRun, 37, 90.5, 12); box(35, 2, 25.2, M.cab, 18.5, 104.5, 12.6 - 14.25 + 12, leftRun);
{
  // OTR microwave 29.875 x 17.25 x 15.56, bottom at 54
  const g = leftRun, mx = 78.5;
  box(29.8, 17.25, 15.5, M.steel, mx, 54 + 8.625, 7.75, g);
  box(21, 12, 0.3, M.blackGlass, mx - 3.5, 54 + 9.5, 15.6, g);
  box(5.5, 12, 0.3, M.blackGlass, mx + 11.5, 54 + 9.5, 15.6, g);
  pull(g, mx + 7.3, 63.5, 15.7, 11, true);
}
// small décor
function crock(x, z, g = scene) { const c = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.4, 7, 20), M.trim); c.position.set(x, 39.5, z); c.castShadow = true; g.add(c); for (let i = 0; i < 4; i++) { const u = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 12, 8), M.wood); u.position.set(x + (i - 1.5) * 0.8, 46, z); u.rotation.z = (i - 1.5) * 0.08; g.add(u); } }
crock(14, 110); // near range on left counter (world x=14,z=110 is ~left run base 24 region)
box(14, 20, 0.8, M.wood, 50, 46, 3, scene); box(11, 16, 0.8, M.wood, 58, 44, 3.6, scene);

// ---------- island: cabinets x 74..98 (drawers face -x), z 68..140 ; top x 73..110.5, z 67..141 ----------
{
  const isl = new THREE.Group(); isl.rotation.y = -Math.PI / 2; isl.position.set(74, 0, 68); scene.add(isl);
  // in isl local: u along +z world? rotation -90: local x -> world z? local (1,0,0) -> (0,0,1)?? check: rotY=-90 => x' = -z? use explicit test below
  // local u -> world +z, outward(+z local) -> world -x  (for rotation.y = -PI/2: (1,0,0)->(0,0,1); (0,0,1)->(-1,0,0))
  baseCab(isl, 0, 16, [{ h: 5, cols: 1, type: 'drawer' }, { h: 'rest', cols: 1, type: 'drawer' }], M.navy);
  baseCab(isl, 16, 28, [{ h: 5, cols: 1, type: 'drawer' }, { h: 9.75, cols: 1, type: 'drawer' }, { h: 'rest', cols: 1, type: 'drawer' }], M.navy);
  baseCab(isl, 44, 28, [{ h: 5, cols: 1, type: 'drawer' }, { h: 9.75, cols: 1, type: 'drawer' }, { h: 'rest', cols: 1, type: 'drawer' }], M.navy);
  // mirror: local z outward is -x world, cabinets extend local z 0..24 => world x 74 - (0..24)?? adjust group so box occupies x 74..98
}
// (island group correction applied after build)
const isl = scene.children[scene.children.length - 1];
isl.position.set(98, 0, 68); // outward (-x) face at x = 98-24 = 74
// back (seating side) panels at x=98
for (let i = 0; i < 3; i++) { shakerFrontWorldBack(98, 4, 68 + i * 24, 24, 30.5); }
function shakerFrontWorldBack(x, y0, z0, w, h) {
  box(0.75, h, w - 0.3, M.navy, x + 0.375, y0 + h / 2, z0 + w / 2);
  box(0.06, h - 5, w - 5, M.navyDark, x + 0.78, y0 + h / 2, z0 + w / 2, scene, false);
  box(0.1, h - 5.9, w - 5.9, M.navy, x + 0.8, y0 + h / 2, z0 + w / 2, scene, false);
}
box(1, 4, 72, M.navy, 98.5, 2, 104); // back toe (baseboard per drawing)
// island end panels
for (const z of [67.6, 140.4]) box(24.5, 34.5, 0.75, M.navy, 86, 17.25, z);
// island top
{ const m = box(37.5, 1.5, 74, M.counter.clone(), 73 + 18.75, 35.25, 104); m.material.map = counterTex.clone(); m.material.map.needsUpdate = true; m.material.map.repeat.set(37.5 / 90, 74 / 90); }
// island decor: tray + vase
{ const tray = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 1.2, 32), M.rattan); tray.position.set(88, 36.6, 104); tray.castShadow = true; scene.add(tray);
  const vase = new THREE.Mesh(new THREE.SphereGeometry(4, 20, 16), M.trim); vase.scale.y = 1.2; vase.position.set(88, 41.5, 104); vase.castShadow = true; scene.add(vase);
  for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 10), new THREE.MeshStandardMaterial({ color: i % 3 === 0 ? 0x9fb4d6 : 0xf6f3ea, roughness: 0.9 })); b.position.set(88 + Math.cos(i) * 3.5, 47 + (i % 3) * 1.5, 104 + Math.sin(i) * 3.5); b.castShadow = true; scene.add(b); } }
// stools (3) on seating side
function stool(z) {
  const g = new THREE.Group(); g.position.set(117, 0, z); scene.add(g);
  box(16, 2, 16, M.rattan, 0, 25, 0, g);
  for (const [a, b] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 24, 8), M.wood); l.position.set(a, 12, b); l.castShadow = true; g.add(l); }
  box(1.2, 14, 16, M.rattan, 7.5, 33, 0, g);
  box(14, 0.8, 0.8, M.wood, 0, 8, -7.2, g); box(14, 0.8, 0.8, M.wood, 0, 8, 7.2, g);
}
stool(80); stool(104); stool(128);

// ---------- pendants ----------
function pendant(x, z, diam, bottomY) {
  const g = new THREE.Group(); scene.add(g);
  const r = diam / 2, h = diam * 0.72;
  const pts = []; for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(new THREE.Vector2(Math.max(1.8, r * Math.pow(1 - t * t, 0.6)), h * t)); }
  const shade = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), M.glass); shade.position.set(x, bottomY, z); g.add(shade);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, 0.25, 8, 48), M.brass); rim.rotation.x = Math.PI / 2; rim.position.set(x, bottomY, z); g.add(rim);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, 3, 20), M.brass); cap.position.set(x, bottomY + h + 1, z); g.add(cap);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, CEIL - (bottomY + h + 2.5), 10), M.brass); rod.position.set(x, (CEIL + bottomY + h + 2.5) / 2, z); g.add(rod);
  const canopy = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 1, 24), M.brass); canopy.position.set(x, CEIL - 0.5, z); g.add(canopy);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 12), M.bulb); bulb.position.set(x, bottomY + h * 0.55, z); g.add(bulb);
  const L = new THREE.PointLight(0xffd9a0, 1600, 0, 2); L.position.set(x, bottomY + h * 0.5, z); L.castShadow = true; L.shadow.mapSize.set(1024, 1024); L.shadow.bias = -0.002; scene.add(L);
}
pendant(86, 85.5, 17, 68); pendant(86, 122.5, 17, 68);
pendant(SX, 22, 14, 70);

// recessed cans
for (const [x, z] of [[40, 40], [120, 40], [40, 120], [130, 110], [60, 170], [130, 170]]) { const c = new THREE.Mesh(new THREE.CircleGeometry(2.5, 20), M.bulb); c.rotation.x = Math.PI / 2; c.position.set(x, CEIL - 0.05, z); scene.add(c); }

// ---------- lighting ----------
scene.add(new THREE.HemisphereLight(0xfffaf0, 0x9a948a, 0.9));
const sun = new THREE.DirectionalLight(0xfff4e0, 1.6); sun.position.set(90, 160, -120); sun.target.position.set(80, 0, 60); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -150, right: 150, top: 150, bottom: -150, near: 10, far: 500 }); sun.shadow.bias = -0.0008;
scene.add(sun); scene.add(sun.target);
const fill = new THREE.DirectionalLight(0xffffff, 0.55); fill.position.set(250, 120, 250); scene.add(fill);
for (const [x, z] of [[40, 40], [120, 40], [40, 120], [130, 110]]) { const s = new THREE.SpotLight(0xfff0d8, 2500, 0, Math.PI / 3, 0.6, 2); s.position.set(x, CEIL - 1, z); s.target.position.set(x, 0, z); scene.add(s); scene.add(s.target); }

// ---------- cameras ----------
const views = {
  entry: { pos: [46, 63, 182], look: [118, 44, 24], fov: 64 },
  range: { pos: [140, 63, 150], look: [0, 50, 66], fov: 64 },
  doors: { pos: [118, 62, 48], look: [30, 48, 186], fov: 64 },
  main: { pos: [128, 64, 176], look: [50, 46, 30], fov: 64 },
};
window.renderView = (name) => {
  const v = views[name];
  const cam = new THREE.PerspectiveCamera(v.fov, W / H, 1, 2000);
  cam.position.set(...v.pos); if (v.up) cam.up.set(...v.up); cam.lookAt(...v.look);
  if (name === 'plan') { ceil.visible = false; scene.traverse(o => { if (o.userData.hideInPlan) o.visible = false; }); } else ceil.visible = true;
  renderer.render(scene, cam);
  return renderer.domElement.toDataURL('image/jpeg', 0.9);
};
window.explore = async (container) => {
  const { OrbitControls } = await import('three/addons/controls/OrbitControls.js');
  const size = () => { const w = container.clientWidth, h = Math.round(Math.min(w * 0.62, window.innerHeight * 0.75)); renderer.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  const cam = new THREE.PerspectiveCamera(62, 1.6, 1, 2000); cam.position.set(128, 64, 176);
  container.appendChild(renderer.domElement); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const c = new OrbitControls(cam, renderer.domElement); c.target.set(62, 42, 70); c.maxPolarAngle = Math.PI * 0.55; c.minDistance = 30; c.maxDistance = 190; c.update();
  const draw = () => renderer.render(scene, cam);
  c.addEventListener('change', draw); window.addEventListener('resize', () => { size(); draw(); }); size(); draw();
};
window.ready = true;
