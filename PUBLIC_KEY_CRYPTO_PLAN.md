# Public Key Cryptography Section — Implementation Plan

## Overview

A new **Public Key Cryptography** section for the Cipher Museum, following the pattern of the Modern Cryptography section (cyan theme). These simulators will make abstract mathematical concepts concrete through interactive visualizations with real user data.

Suggested accent color: **violet/purple** (`text-violet-400`, `bg-violet-950/50`) to distinguish from symmetric crypto (cyan), cryptanalysis (red), and cipher machines (amber).

---

## 1. Diffie-Hellman Key Exchange

**Route**: `/diffie-hellman`
**Concept**: Two parties (Alice & Bob) agree on a shared secret over a public channel without ever transmitting it.

### Visualizations

#### A. Color Mixing Analogy (top panel)
- Alice picks a **secret color**, Bob picks a **secret color**
- Both start with a **shared public color** (e.g., yellow)
- Alice mixes her secret with public → sends result to Bob
- Bob mixes his secret with public → sends result to Alice
- Each mixes received color with their own secret → **same shared color**
- Use actual CSS color blending to show this visually
- Highlight: Eve sees the public color and both mixed colors but **cannot unmix**

#### B. Numeric Computation (bottom panel)
- User picks prime `p` and generator `g` (with presets for small and large primes)
- Alice picks secret `a`, Bob picks secret `b`
- Show step by step:
  - Alice computes `A = g^a mod p`, sends A publicly
  - Bob computes `B = g^b mod p`, sends B publicly
  - Alice computes `s = B^a mod p`
  - Bob computes `s = A^b mod p`
  - Both arrive at the same shared secret `s`
- Show modular exponentiation expanding step by step
- Highlight what Eve can see (p, g, A, B) vs what's secret (a, b, s)

#### C. Interactive Mode
- User can play as Alice or Bob
- "Eavesdropper view" panel showing only public values
- Try to solve the discrete log problem manually for small numbers

### Info Panel
- Whitfield Diffie & Martin Hellman (1976), Ralph Merkle
- GCHQ prior art (James Ellis, Clifford Cocks, Malcolm Williamson — classified until 1997)
- Use in TLS handshake, SSH, VPNs
- Why DH alone doesn't authenticate (need certificates/signatures)

---

## 2. RSA

**Route**: `/rsa`
**Concept**: Asymmetric encryption using the difficulty of factoring large semiprimes.

### Visualizations

#### A. Key Generation (step by step)
- User picks two primes `p` and `q` (or auto-generate)
- Show: `n = p × q`, `φ(n) = (p-1)(q-1)`
- Pick public exponent `e` (default 65537, or user chooses)
- Compute private exponent `d = e⁻¹ mod φ(n)` via extended Euclidean algorithm
- Show the extended GCD steps visually
- Display public key `(e, n)` and private key `(d, n)`

#### B. Encrypt / Decrypt
- User types a message → convert to number(s) `m`
- Encrypt: `c = m^e mod n` — show the modular exponentiation
- Decrypt: `m = c^d mod n` — show it recovers the original
- For messages longer than the block size, split into blocks
- Show why `m^(ed) ≡ m (mod n)` by Euler's theorem

#### C. Factoring Challenge
- Given `n`, try to factor it to break RSA
- For small keys (8-16 bit), let students try trial division
- Show how key size affects security (time to factor)

### Info Panel
- Rivest, Shamir, Adleman (1977); Clifford Cocks (1973, classified)
- RSA-129 challenge, RSA Factoring Challenge
- Use in PGP, TLS certificates, code signing
- Why we're moving to elliptic curves (key size comparison)

---

## 3. ElGamal Encryption

**Route**: `/elgamal`
**Concept**: Public key encryption based on Diffie-Hellman, with randomized ciphertext.

### Visualizations

#### A. Key Generation
- Pick prime `p`, generator `g`, secret key `x`
- Public key: `h = g^x mod p`
- Show the relationship to DH

#### B. Encrypt / Decrypt
- Encrypt message `m`:
  - Pick random `k`
  - `c1 = g^k mod p`
  - `c2 = m × h^k mod p`
  - Ciphertext is `(c1, c2)`
- Decrypt:
  - `s = c1^x mod p`
  - `m = c2 × s⁻¹ mod p`
- Highlight: encrypting the same message twice gives **different ciphertext** (due to random k)
- Let user encrypt same message multiple times to see this

#### C. Relationship to DH
- Side-by-side showing how ElGamal encryption is "DH + masking"

### Info Panel
- Taher ElGamal (1985)
- Used in original GPG/PGP, DSA signatures
- Probabilistic encryption (same plaintext → different ciphertext each time)
- Homomorphic property: `E(m1) × E(m2) = E(m1 × m2)`

---

## 4. Elliptic Curve Cryptography (ECC)

**Route**: `/ecc`
**Concept**: Public key crypto using the algebraic structure of elliptic curves over finite fields.

### Visualizations

#### A. The Curve (real numbers, for intuition)
- Plot `y² = x³ + ax + b` on a real-number graph
- User adjusts `a` and `b` with sliders
- Click two points → show the geometric "add" operation:
  - Draw line through P and Q
  - Find third intersection R
  - Reflect over x-axis to get P + Q
- Show point doubling (tangent line when P = Q)
- Animate repeated addition: P, 2P, 3P, 4P...

#### B. ECDH Key Exchange
- Pick a curve and base point G (presets: secp256k1, Curve25519)
- Alice picks secret `a`, computes `aG` (scalar multiplication)
- Bob picks secret `b`, computes `bG`
- Shared secret: `a(bG) = b(aG) = abG`
- Show the scalar multiplication as repeated point additions
- Compare key sizes: 256-bit ECC ≈ 3072-bit RSA

#### C. Finite Field View
- Switch from real numbers to `GF(p)` — show the point scatter plot
- Same addition rules but modular arithmetic
- Show how the points form a cyclic group

### Info Panel
- Neal Koblitz and Victor Miller (1985, independently)
- Bitcoin (secp256k1), TLS 1.3 (X25519), Signal Protocol (Curve25519)
- Why ECC: same security with much smaller keys
- Curve25519 by Daniel Bernstein — designed for performance and safety

---

## Hub & Navigation Integration

### Hub.tsx
- New section: **"PUBLIC KEY CRYPTOGRAPHY"**
- Accent color: violet
- Cards: Diffie-Hellman, RSA, ElGamal, ECC
- `group-hover:text-violet-300`, `LAUNCH VISUALIZER →`

### Layout.tsx
- New `PUBLIC_KEY` array in dropdown
- Violet-tinted section header and breadcrumb

### main.tsx
- 4 new route imports and `<Route>` entries

---

## Implementation Priority & Session Planning

### Phase 1 — Start Now (highest impact, most feasible)
1. **Diffie-Hellman** — Most visual, color mixing is a unique differentiator, math is simpler than RSA. ~400-500 lines.
2. **RSA** — Most famous public key algorithm, students need to see key generation and encrypt/decrypt. ~500-600 lines.

### Phase 2 — Next Session
3. **ElGamal** — Builds directly on DH concepts, shows probabilistic encryption. ~400 lines.
4. **ECC** — Most complex (needs canvas/SVG for curve plotting), but biggest wow factor. ~600-700 lines.

### BigInt Considerations
- RSA, DH, and ElGamal need arbitrary-precision arithmetic for realistic key sizes
- JavaScript's native `BigInt` works perfectly for this — no library needed
- For the educational small-number mode, regular numbers suffice
- Modular exponentiation: implement square-and-multiply with `BigInt`

### Shared Utilities
Consider a shared `src/simulators/public-key/math.ts` with:
- `modPow(base, exp, mod)` — modular exponentiation (BigInt)
- `modInverse(a, mod)` — extended Euclidean algorithm
- `isPrime(n)` / `nextPrime(n)` — Miller-Rabin primality test
- `gcd(a, b)` — for key validation

---

## Technical Notes

- All crypto must be implemented in pure TypeScript (no external libraries)
- BigInt literals: `123n` syntax, `BigInt(userInput)` for conversions
- Canvas or SVG for ECC curve plotting (first use of canvas in the project)
- Color mixing for DH: use HSL color space for intuitive blending
- Same dark theme, panel styles, Info toggle pattern as all other simulators
