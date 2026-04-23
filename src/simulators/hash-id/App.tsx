import React, { useState, useMemo } from 'react';

// ── Hash pattern database ─────────────────────────────────────────────

interface HashType {
  name: string;
  aliases?: string[];
  description: string;
  match: (s: string) => boolean;
  confidence: 'definite' | 'likely' | 'possible';
  hashcat?: number;
  john?: string;
  broken?: boolean;
  note?: string;
}

const HEX = (len: number) => (s: string) => s.length === len && /^[0-9a-fA-F]+$/i.test(s);
const B64 = (len: number) => (s: string) => s.length === len && /^[A-Za-z0-9+/=]+$/.test(s);

const HASH_TYPES: HashType[] = [
  // ── Prefix-identified (definite) ───────────────────────────────────
  {
    name: 'bcrypt', aliases: ['bcrypt / Blowfish'],
    description: 'Adaptive password hashing function. Cost factor (log₂ iterations) visible in the hash.',
    match: s => /^\$2[aby]\$\d{2}\$/.test(s),
    confidence: 'definite', hashcat: 3200, john: 'bcrypt',
    note: 'Cost factor: $2b$<cost>$... Higher cost = more secure',
  },
  {
    name: 'Argon2',
    description: 'Memory-hard password hashing — PHC winner 2015. Variants: argon2i (side-channel resistant), argon2d (GPU resistant), argon2id (recommended).',
    match: s => /^\$argon2(i|d|id)\$/.test(s),
    confidence: 'definite', john: 'argon2',
  },
  {
    name: 'scrypt',
    description: 'Memory-hard password hashing designed by Colin Percival. Used in Litecoin.',
    match: s => /^\$scrypt\$/.test(s),
    confidence: 'definite', hashcat: 8900,
  },
  {
    name: 'MD5crypt ($1$)',
    description: 'Unix MD5-based crypt(). Used in older Linux /etc/shadow entries.',
    match: s => /^\$1\$/.test(s),
    confidence: 'definite', hashcat: 500, john: 'md5crypt', broken: true,
  },
  {
    name: 'SHA-256 crypt ($5$)',
    description: 'Unix SHA-256-based crypt(). Common in modern Linux systems.',
    match: s => /^\$5\$/.test(s),
    confidence: 'definite', hashcat: 7400, john: 'sha256crypt',
  },
  {
    name: 'SHA-512 crypt ($6$)',
    description: 'Unix SHA-512-based crypt(). Default password hash on many Linux distributions.',
    match: s => /^\$6\$/.test(s),
    confidence: 'definite', hashcat: 1800, john: 'sha512crypt',
  },
  {
    name: 'Apache MD5 ($apr1$)',
    description: 'Apache web server htpasswd MD5 variant.',
    match: s => /^\$apr1\$/.test(s),
    confidence: 'definite', hashcat: 1600, john: 'md5crypt', broken: true,
  },
  {
    name: 'WordPress / phpBB3 ($P$)',
    description: 'Portable PHP hashing framework used by WordPress and phpBB.',
    match: s => /^\$P\$/.test(s),
    confidence: 'definite', hashcat: 400, john: 'phpass',
  },
  {
    name: 'MySQL 4.1+ (*)',
    description: 'MySQL password hash format. Double-SHA1 with * prefix.',
    match: s => /^\*[0-9A-F]{40}$/.test(s),
    confidence: 'definite', hashcat: 300, john: 'mysql-sha1',
  },
  {
    name: 'JWT (JSON Web Token)',
    description: 'Three base64url-encoded segments: header.payload.signature. Header starts with eyJ.',
    match: s => /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/.test(s),
    confidence: 'definite',
    note: 'Decode each segment with base64url to read claims',
  },
  {
    name: 'PBKDF2-SHA256 (Django)',
    description: 'Django default password hasher.',
    match: s => /^pbkdf2_sha256\$/.test(s),
    confidence: 'definite', hashcat: 10000,
  },
  {
    name: 'PBKDF2-SHA1 (Django legacy)',
    match: s => /^pbkdf2_sha1\$/.test(s),
    description: 'Legacy Django PBKDF2-SHA1 password format.',
    confidence: 'definite', hashcat: 12000, broken: true,
  },
  {
    name: 'SHA-256 PBKDF2 (Cisco)',
    match: s => /^\$8\$/.test(s),
    description: 'Cisco IOS Type 8 password hash.',
    confidence: 'definite', hashcat: 9200,
  },
  {
    name: 'scrypt (Cisco)',
    match: s => /^\$9\$/.test(s),
    description: 'Cisco IOS Type 9 password hash (scrypt-based).',
    confidence: 'definite', hashcat: 9300,
  },
  // ── Length + charset (hex) ──────────────────────────────────────────
  {
    name: 'CRC32',
    description: 'Cyclic redundancy check. Not a cryptographic hash — used for error detection only.',
    match: s => HEX(8)(s), confidence: 'possible',
    hashcat: 11500, broken: true,
    note: 'Also matches Adler32 (checksum), FNV32',
  },
  {
    name: 'MySQL 3.x (old)',
    description: 'Legacy MySQL password hashing. 16-character hex output.',
    match: s => HEX(16)(s), confidence: 'possible',
    hashcat: 3200, broken: true,
    note: 'Also matches LM half, DES-based, and many 64-bit hashes',
  },
  {
    name: 'MD5',
    aliases: ['MD5', 'NTLM', 'MD4', 'LM', 'MD2'],
    description: 'MD5 produces 128-bit (32 hex char) output. NTLM and MD4 also output 32 hex chars.',
    match: s => HEX(32)(s), confidence: 'likely',
    hashcat: 0, john: 'md5', broken: true,
    note: 'NTLM (mode 1000), MD4 (mode 900), LM (mode 3000) are also 32 hex chars',
  },
  {
    name: 'SHA-1',
    aliases: ['SHA-1', 'RIPEMD-160', 'HAS-160'],
    description: 'SHA-1 produces 160-bit (40 hex char) output. Deprecated for signatures — still used in Git.',
    match: s => HEX(40)(s), confidence: 'likely',
    hashcat: 100, john: 'sha1', broken: true,
    note: 'RIPEMD-160 and HAS-160 also produce 40 hex chars (mode 6000 / 5100)',
  },
  {
    name: 'SHA-224 / SHA3-224',
    description: 'Truncated SHA-256 or SHA-3 variant. Less common.',
    match: s => HEX(56)(s), confidence: 'likely',
    hashcat: 1300,
  },
  {
    name: 'SHA-256',
    aliases: ['SHA-256', 'SHA3-256', 'BLAKE2s-256'],
    description: 'SHA-256 produces 256-bit (64 hex char) output. Standard for most integrity and signing.',
    match: s => HEX(64)(s), confidence: 'likely',
    hashcat: 1400, john: 'sha256',
    note: 'SHA3-256 (mode 17300), BLAKE2s-256 (mode 600) also produce 64 hex chars',
  },
  {
    name: 'SHA-384 / SHA3-384',
    description: '384-bit truncated SHA-512.',
    match: s => HEX(96)(s), confidence: 'likely',
    hashcat: 10800,
  },
  {
    name: 'SHA-512',
    aliases: ['SHA-512', 'SHA3-512', 'BLAKE2b-512', 'Whirlpool'],
    description: 'SHA-512 produces 512-bit (128 hex char) output. Maximum standard SHA-2 output.',
    match: s => HEX(128)(s), confidence: 'likely',
    hashcat: 1700, john: 'sha512',
    note: 'BLAKE2b (mode 600), Whirlpool (mode 6100), SHA3-512 (mode 17600) same length',
  },
  // ── Length + base64 ────────────────────────────────────────────────
  {
    name: 'bcrypt (base64)',
    description: 'bcrypt output without the $2b$ prefix — sometimes stored stripped.',
    match: s => B64(60)(s) && /^[A-Za-z0-9./]{60}$/.test(s),
    confidence: 'possible',
  },
  {
    name: 'SHA-256 (base64)',
    description: '256-bit hash encoded as base64 (44 chars with padding).',
    match: s => s.length === 44 && /^[A-Za-z0-9+/=]+$/.test(s),
    confidence: 'possible', note: 'Decode with base64 to get 32 raw bytes',
  },
  {
    name: 'SHA-512 (base64)',
    description: '512-bit hash encoded as base64 (88 chars with padding).',
    match: s => s.length === 88 && /^[A-Za-z0-9+/=]+$/.test(s),
    confidence: 'possible',
  },
  // ── Special formats ────────────────────────────────────────────────
  {
    name: 'UUID / GUID',
    description: 'Universally Unique Identifier — not a cryptographic hash, but often seen in security contexts.',
    match: s => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s),
    confidence: 'definite',
    note: 'Version in bits 4-7 of third group: v4 = random',
  },
  {
    name: 'DES crypt (Unix)',
    description: 'Traditional Unix crypt(3) using DES. First two characters are the salt.',
    match: s => /^[A-Za-z0-9./]{13}$/.test(s),
    confidence: 'possible', hashcat: 1500, john: 'descrypt', broken: true,
  },
  {
    name: 'NTLM',
    description: 'Windows NT LAN Manager hash. Identical length to MD5 but different algorithm (MD4 of UTF-16LE).',
    match: s => HEX(32)(s) && s === s.toUpperCase(),
    confidence: 'possible', hashcat: 1000, john: 'nt', broken: true,
  },
];

// ── JWT decoder ───────────────────────────────────────────────────────

function decodeJWT(s: string): { header: object; payload: object } | null {
  try {
    const parts = s.split('.');
    if (parts.length !== 3) return null;
    const dec = (p: string) => JSON.parse(atob(p.replace(/-/g,'+').replace(/_/,'/')));
    return { header: dec(parts[0]), payload: dec(parts[1]) };
  } catch { return null; }
}

// ── bcrypt parser ──────────────────────────────────────────────────────

function parseBcrypt(s: string) {
  const m = s.match(/^\$2([aby])\$(\d{2})\$/);
  if (!m) return null;
  return { variant: m[1], cost: parseInt(m[2]), iterations: 2 ** parseInt(m[2]) };
}

// ── Main ──────────────────────────────────────────────────────────────

const EXAMPLES = [
  ['MD5', '5f4dcc3b5aa765d61d8327deb882cf99'],
  ['SHA-1', 'aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d'],
  ['SHA-256', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'],
  ['bcrypt', '$2b$12$EXRkfkdmXn/gkzEeSlL4Ve/kc4VzjC7KYqMJ0JVG7J7YZmmGBhZMy'],
  ['JWT', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'],
  ['Argon2id', '$argon2id$v=19$m=65536,t=2,p=1$c29tZXNhbHQ$RdescudvJCsgt3ub+b+dWRWJTmaaJObG'],
  ['WordPress', '$P$BIqNuEjQ.ZG7m1C/EqHXt1TUWN3GbM.'],
];

const HashIdApp: React.FC = () => {
  const [input, setInput] = useState('');

  const trimmed = input.trim();

  const matches = useMemo(() => {
    if (!trimmed) return [];
    return HASH_TYPES
      .filter(h => h.match(trimmed))
      .sort((a, b) => {
        const order = { definite: 0, likely: 1, possible: 2 };
        return order[a.confidence] - order[b.confidence];
      });
  }, [trimmed]);

  const jwtData  = useMemo(() => trimmed.startsWith('eyJ') ? decodeJWT(trimmed) : null, [trimmed]);
  const bcryptInfo = useMemo(() => parseBcrypt(trimmed), [trimmed]);

  const confColor: Record<string, string> = {
    definite: 'text-green-400 border-green-700/50 bg-green-950/20',
    likely:   'text-cyan-400 border-cyan-700/50 bg-cyan-950/20',
    possible: 'text-amber-400 border-amber-700/50 bg-amber-950/20',
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950 text-slate-200"
         style={{ fontFamily: "'Share Tech Mono', monospace" }}>

      <div className="flex-shrink-0 px-6 pt-5 pb-3 border-b border-slate-800 bg-slate-900/60">
        <h1 className="text-xl font-bold text-white">Hash Identifier</h1>
        <p className="text-xs text-slate-400 mt-1">
          Identify hash types, password schemes, and structured tokens by format and length
        </p>
      </div>

      <div className="flex-1 overflow-auto flex flex-col lg:flex-row gap-4 p-4">
        <div className="flex-1 flex flex-col gap-3 min-w-0">

          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            rows={3}
            className="bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-200 resize-none outline-none focus:border-amber-700"
            placeholder="Paste any hash, password hash, JWT, UUID, or encoded value…"
            spellCheck={false}
          />

          {trimmed && (
            <div className="flex flex-wrap gap-3 text-[10px] font-mono text-slate-500">
              <span>{trimmed.length} chars</span>
              <span>{/^[0-9a-fA-F]+$/i.test(trimmed) ? `${trimmed.length*4} bits (hex)` : ''}</span>
              <span className={/^[A-Za-z0-9+/=]+$/.test(trimmed) ? 'text-slate-400' : 'text-slate-700'}>
                {/^[A-Za-z0-9+/=]+$/.test(trimmed) ? 'base64-compatible' : ''}
              </span>
            </div>
          )}

          {/* Matches */}
          {matches.length > 0 ? (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {matches.length} match{matches.length !== 1 ? 'es' : ''}
              </span>
              {matches.map((h, i) => (
                <div key={i} className={`rounded-xl border p-4 ${confColor[h.confidence]}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="font-bold text-sm">{h.name}</span>
                      {h.broken && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded bg-red-900/50 text-red-300 border border-red-700/40">BROKEN</span>}
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border capitalize ${confColor[h.confidence]}`}>
                      {h.confidence}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{h.description}</p>
                  <div className="flex flex-wrap gap-3 text-[10px]">
                    {h.hashcat !== undefined && (
                      <span className="text-slate-500">hashcat: <code className="text-slate-300">-m {h.hashcat}</code></span>
                    )}
                    {h.john && (
                      <span className="text-slate-500">john: <code className="text-slate-300">--format={h.john}</code></span>
                    )}
                  </div>
                  {h.note && <p className="text-[10px] text-slate-500 mt-1.5 italic">{h.note}</p>}
                </div>
              ))}
            </div>
          ) : trimmed ? (
            <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4">
              <p className="text-sm text-slate-400">No known hash format matched.</p>
              <p className="text-xs text-slate-500 mt-1">
                Length: {trimmed.length} chars — this may be a custom hash, encoded binary, or truncated value.
              </p>
            </div>
          ) : null}

          {/* JWT breakdown */}
          {jwtData && (
            <div className="rounded-xl border border-violet-700/40 bg-violet-950/20 p-4">
              <div className="text-xs font-bold text-violet-400 mb-3 uppercase tracking-wider">JWT Decoded</div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] text-slate-500 mb-1">HEADER</div>
                  <pre className="text-[11px] text-slate-300 bg-slate-900/60 rounded-lg p-2 overflow-x-auto">
                    {JSON.stringify(jwtData.header, null, 2)}
                  </pre>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 mb-1">PAYLOAD</div>
                  <pre className="text-[11px] text-slate-300 bg-slate-900/60 rounded-lg p-2 overflow-x-auto">
                    {JSON.stringify(jwtData.payload, null, 2)}
                  </pre>
                </div>
              </div>
              <p className="text-[10px] text-amber-400/80 mt-2">⚠ Signature NOT verified — decode only</p>
            </div>
          )}

          {/* bcrypt breakdown */}
          {bcryptInfo && (
            <div className="rounded-xl border border-blue-700/40 bg-blue-950/20 p-4">
              <div className="text-xs font-bold text-blue-400 mb-2 uppercase tracking-wider">bcrypt Parameters</div>
              <div className="flex gap-6 text-xs">
                <div><span className="text-slate-500">Variant</span><br/><code className="text-blue-300">${'2'}${bcryptInfo.variant}$</code></div>
                <div><span className="text-slate-500">Cost Factor</span><br/><code className="text-blue-300">{bcryptInfo.cost}</code></div>
                <div><span className="text-slate-500">Iterations</span><br/><code className="text-blue-300">{bcryptInfo.iterations.toLocaleString()}</code></div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-3">
          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Examples</div>
            <div className="space-y-1.5">
              {EXAMPLES.map(([label, val]) => (
                <button key={label}
                  onClick={() => setInput(val)}
                  className="w-full text-left px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] transition-colors border border-slate-700 hover:border-slate-600"
                >
                  <span className="text-amber-400 font-bold mr-2">{label}</span>
                  <span className="text-slate-500 font-mono">{val.slice(0,20)}…</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-xl border border-slate-700 p-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Quick Reference</div>
            <div className="space-y-1 text-[10px] font-mono">
              {[
                ['32 hex','MD5 / NTLM / MD4'],
                ['40 hex','SHA-1'],
                ['64 hex','SHA-256'],
                ['128 hex','SHA-512'],
                ['$2b$…','bcrypt'],
                ['$6$…','SHA-512crypt'],
                ['$argon2…','Argon2'],
                ['eyJ…','JWT'],
                ['$P$…','WordPress'],
              ].map(([k,v])=>(
                <div key={k} className="flex gap-2">
                  <span className="text-cyan-400 w-20 flex-shrink-0">{k}</span>
                  <span className="text-slate-400">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HashIdApp;
