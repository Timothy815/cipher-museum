import React, { useEffect, useRef, useState, useCallback } from 'react';

// ─── Constants ────────────────────────────────────────────────────────
const CANVAS_SIZE = 224; // px — divisible by 4, 8, 16, 28, 56

// ─── HSL → RGB ────────────────────────────────────────────────────────
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if      (h < 60)  { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

// ─── FNV-1a 32-bit hash ───────────────────────────────────────────────
function fnv32a(data: number[]): number {
  let h = 0x811c9dc5;
  for (const b of data) {
    h ^= b;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function hashToRgb(hash: number): [number, number, number] {
  const hue = (hash & 0xFFFF) / 65535 * 360;
  const sat = 0.65 + ((hash >> 16) & 0x1F) / 31 * 0.35;
  const lit = 0.40 + ((hash >> 21) & 0x0F) / 15 * 0.30;
  return hslToRgb(hue, sat, lit);
}

// ─── Draw the penguin ─────────────────────────────────────────────────
function drawPenguin(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Sky background
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(0, 0, W, H);

  // Snow floor
  ctx.fillStyle = '#E8F4FD';
  ctx.beginPath();
  ctx.ellipse(W / 2, H * 0.95, W * 0.55, H * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(0, H * 0.88, W, H * 0.12);

  // ── Body (black oval) ──
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.ellipse(W * 0.5, H * 0.60, W * 0.28, H * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── White belly ──
  ctx.fillStyle = '#F5F5F0';
  ctx.beginPath();
  ctx.ellipse(W * 0.5, H * 0.64, W * 0.16, H * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Head (black circle) ──
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.arc(W * 0.5, H * 0.24, W * 0.20, 0, Math.PI * 2);
  ctx.fill();

  // ── White face patch ──
  ctx.fillStyle = '#F5F5F0';
  ctx.beginPath();
  ctx.ellipse(W * 0.5, H * 0.27, W * 0.13, H * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Beak (orange triangle) ──
  ctx.fillStyle = '#FF8C00';
  ctx.beginPath();
  ctx.moveTo(W * 0.50, H * 0.26);
  ctx.lineTo(W * 0.44, H * 0.32);
  ctx.lineTo(W * 0.56, H * 0.32);
  ctx.closePath();
  ctx.fill();

  // ── Eyes ──
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.arc(W * 0.43, H * 0.21, W * 0.025, 0, Math.PI * 2);
  ctx.arc(W * 0.57, H * 0.21, W * 0.025, 0, Math.PI * 2);
  ctx.fill();
  // Eye shine
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(W * 0.435, H * 0.205, W * 0.009, 0, Math.PI * 2);
  ctx.arc(W * 0.575, H * 0.205, W * 0.009, 0, Math.PI * 2);
  ctx.fill();

  // ── Flippers ──
  ctx.fillStyle = '#111111';
  // Left flipper
  ctx.beginPath();
  ctx.ellipse(W * 0.28, H * 0.60, W * 0.07, H * 0.18, -0.4, 0, Math.PI * 2);
  ctx.fill();
  // Right flipper
  ctx.beginPath();
  ctx.ellipse(W * 0.72, H * 0.60, W * 0.07, H * 0.18, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // ── Feet ──
  ctx.fillStyle = '#FF8C00';
  // Left foot
  ctx.beginPath();
  ctx.moveTo(W * 0.40, H * 0.89);
  ctx.lineTo(W * 0.26, H * 0.94);
  ctx.lineTo(W * 0.32, H * 0.94);
  ctx.lineTo(W * 0.30, H * 0.98);
  ctx.lineTo(W * 0.36, H * 0.95);
  ctx.lineTo(W * 0.41, H * 0.98);
  ctx.lineTo(W * 0.43, H * 0.93);
  ctx.closePath();
  ctx.fill();
  // Right foot
  ctx.beginPath();
  ctx.moveTo(W * 0.60, H * 0.89);
  ctx.lineTo(W * 0.74, H * 0.94);
  ctx.lineTo(W * 0.68, H * 0.94);
  ctx.lineTo(W * 0.70, H * 0.98);
  ctx.lineTo(W * 0.64, H * 0.95);
  ctx.lineTo(W * 0.59, H * 0.98);
  ctx.lineTo(W * 0.57, H * 0.93);
  ctx.closePath();
  ctx.fill();
}

// ─── Process image → ECB / CBC canvases ──────────────────────────────
function processImage(
  src: HTMLCanvasElement,
  ecbCanvas: HTMLCanvasElement,
  cbcCanvas: HTMLCanvasElement,
  blockSize: number,
  key: Uint8Array,
) {
  const W = src.width, H = src.height;
  const srcCtx = src.getContext('2d')!;
  const srcData = srcCtx.getImageData(0, 0, W, H);
  const px = srcData.data;

  const ecbCtx = ecbCanvas.getContext('2d')!;
  const cbcCtx = cbcCanvas.getContext('2d')!;

  const bw = blockSize, bh = blockSize;
  const cols = Math.floor(W / bw);
  const rows = Math.floor(H / bh);

  let prevEcbHash = fnv32a(Array.from(key));
  let prevCbcHash = fnv32a(Array.from(key));

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Extract block pixel data (R,G,B only)
      const blockBytes: number[] = [];
      for (let dy = 0; dy < bh; dy++) {
        for (let dx = 0; dx < bw; dx++) {
          const pidx = ((row * bh + dy) * W + (col * bw + dx)) * 4;
          blockBytes.push(px[pidx], px[pidx + 1], px[pidx + 2]);
        }
      }

      // ── ECB: hash(key XOR block) ──
      const ecbInput = blockBytes.map((b, i) => b ^ key[i % key.length]);
      const ecbHash  = fnv32a(ecbInput);
      const ecbRgb   = hashToRgb(ecbHash);

      // ── CBC: hash(key XOR (block XOR prev_cipher)) ──
      const cbcInput = blockBytes.map((b, i) => b ^ key[i % key.length] ^ ((prevCbcHash >> (8 * (i % 4))) & 0xFF));
      const cbcHash  = fnv32a(cbcInput);
      const cbcRgb   = hashToRgb(cbcHash);
      prevCbcHash    = cbcHash;
      prevEcbHash    = ecbHash; // unused but kept for symmetry

      // Fill block
      const x = col * bw, y = row * bh;
      ecbCtx.fillStyle = `rgb(${ecbRgb[0]},${ecbRgb[1]},${ecbRgb[2]})`;
      ecbCtx.fillRect(x, y, bw, bh);
      cbcCtx.fillStyle = `rgb(${cbcRgb[0]},${cbcRgb[1]},${cbcRgb[2]})`;
      cbcCtx.fillRect(x, y, bw, bh);
    }
  }
}

// ─── Main Component ───────────────────────────────────────────────────
const EcbPenguinApp: React.FC = () => {
  const [blockSize, setBlockSize] = useState(8);
  const [key, setKey]             = useState<Uint8Array>(() => {
    const k = new Uint8Array(16);
    crypto.getRandomValues(k);
    return k;
  });
  const [useUpload, setUseUpload] = useState(false);

  const srcRef = useRef<HTMLCanvasElement>(null);
  const ecbRef = useRef<HTMLCanvasElement>(null);
  const cbcRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const keyHex = Array.from(key).map(b => b.toString(16).padStart(2, '0')).join(' ');

  // Draw penguin (or nothing if upload mode) and run
  useEffect(() => {
    if (!srcRef.current) return;
    if (!useUpload) {
      drawPenguin(srcRef.current);
    }
  }, [useUpload]);

  // Re-process on blockSize / key change
  useEffect(() => {
    if (!srcRef.current || !ecbRef.current || !cbcRef.current) return;
    processImage(srcRef.current, ecbRef.current, cbcRef.current, blockSize, key);
  }, [blockSize, key]);

  const newKey = useCallback(() => {
    const k = new Uint8Array(16);
    crypto.getRandomValues(k);
    setKey(k);
  }, []);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !srcRef.current) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const ctx = srcRef.current!.getContext('2d')!;
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      // Scale to fill canvas
      const scale = Math.max(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height);
      const sw = img.width * scale, sh = img.height * scale;
      ctx.drawImage(img, (CANVAS_SIZE - sw) / 2, (CANVAS_SIZE - sh) / 2, sw, sh);
      URL.revokeObjectURL(url);
      processImage(srcRef.current!, ecbRef.current!, cbcRef.current!, blockSize, key);
    };
    img.src = url;
    setUseUpload(true);
    e.target.value = '';
  }, [blockSize, key]);

  const BLOCK_SIZES = [4, 8, 16, 28];

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-200"
         style={{ fontFamily: "'Share Tech Mono', monospace" }}>

      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-5 pb-3 border-b border-slate-800 bg-slate-900/60">
        <h1 className="text-xl font-bold tracking-wide text-white">ECB Penguin — Block Cipher Mode Demo</h1>
        <p className="text-xs text-slate-400 mt-1">
          Why ECB mode is broken: identical plaintext blocks always produce identical ciphertext blocks
        </p>
      </div>

      <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">

        {/* ── Three canvases ── */}
        <div className="flex flex-wrap justify-center gap-6 lg:gap-10">
          {[
            { label: 'ORIGINAL',  ref: srcRef, accent: 'text-slate-300', border: 'border-slate-600', badge: null },
            { label: 'ECB MODE',  ref: ecbRef, accent: 'text-red-400',   border: 'border-red-700/60',  badge: 'PATTERN LEAKS' },
            { label: 'CBC MODE',  ref: cbcRef, accent: 'text-cyan-400',  border: 'border-cyan-700/60', badge: 'SECURE ✓' },
          ].map(({ label, ref, accent, border, badge }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold tracking-widest ${accent}`}>{label}</span>
                {badge && (
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                    badge.includes('LEAKS')
                      ? 'bg-red-900/40 text-red-400 border-red-700/50'
                      : 'bg-cyan-900/40 text-cyan-400 border-cyan-700/50'
                  }`}>{badge}</span>
                )}
              </div>
              <canvas
                ref={ref}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className={`rounded-xl border-2 ${border}`}
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
          ))}
        </div>

        {/* ── Controls ── */}
        <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4 flex flex-wrap items-center gap-4">

          {/* Block size */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Block</span>
            <div className="flex gap-1">
              {BLOCK_SIZES.map(sz => (
                <button key={sz}
                  onClick={() => setBlockSize(sz)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    blockSize === sz
                      ? 'bg-amber-600 text-white border border-amber-500'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
                  }`}
                >
                  {sz}px
                </button>
              ))}
            </div>
          </div>

          {/* New key */}
          <button onClick={newKey}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-lg border border-slate-600 transition-colors"
          >
            NEW KEY
          </button>

          {/* Upload */}
          <label className="cursor-pointer px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-lg border border-slate-600 transition-colors">
            UPLOAD IMAGE
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </label>

          {useUpload && (
            <button onClick={() => { setUseUpload(false); if (srcRef.current) drawPenguin(srcRef.current); }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs rounded-lg border border-slate-700 transition-colors"
            >
              RESET PENGUIN
            </button>
          )}

          {/* Key display */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Key:</span>
            <code className="text-[10px] font-mono text-amber-400/80 tracking-wide">{keyHex}</code>
          </div>
        </div>

        {/* ── Educational callouts ── */}
        <div className="grid md:grid-cols-2 gap-4">

          <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-4">
            <div className="text-xs font-bold text-red-400 mb-2 uppercase tracking-wider">Why ECB leaks the penguin</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              ECB (Electronic Codebook) encrypts every {blockSize}×{blockSize}-pixel block <em>independently</em>.
              Two blocks with identical pixel values always produce identical ciphertext — so the colour of
              each encrypted tile is a deterministic function of its plaintext content.
              Large uniform regions (the white belly, the black body, the blue sky) all map to the same tile colour,
              making the penguin's silhouette clearly visible.
            </p>
          </div>

          <div className="bg-cyan-950/30 border border-cyan-800/40 rounded-xl p-4">
            <div className="text-xs font-bold text-cyan-400 mb-2 uppercase tracking-wider">Why CBC looks like noise</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              CBC (Cipher Block Chaining) XORs each plaintext block with the <em>previous ciphertext block</em>
              before encryption. Even if two blocks are pixel-for-pixel identical, they produce different
              ciphertext because the accumulated chain makes each block's context unique.
              The output is indistinguishable from random data — no structure bleeds through.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4">
            <div className="text-xs font-bold text-amber-400 mb-2 uppercase tracking-wider">Block size effect</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Smaller blocks ({`${BLOCK_SIZES[0]}px`}) reveal finer detail in ECB mode because more pixels are grouped
              into matching blocks. Larger blocks ({`${BLOCK_SIZES[BLOCK_SIZES.length-1]}px`}) produce chunkier tiles but the
              pattern is still visible wherever the image has uniform regions.
              Try changing the block size above to see the trade-off.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4">
            <div className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">Real-world impact</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              ECB mode was used in early versions of PKZIP and some naive database encryption systems.
              The Linux Tux penguin became the canonical demonstration in 2004 when Phil Rogaway published
              his block cipher modes survey. AES-ECB is still available in every crypto library — it's
              never wrong to <em>compute</em> it, only wrong to <em>use</em> it for anything beyond a single block.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EcbPenguinApp;
