# Cipher Museum — Future Planning

## Current State (March 2026)

### Collection Inventory (53 tools)

**Classical Ciphers (14)**
- Caesar, Vigenere, Playfair, ADFGVX, Jefferson Wheel, Hill, OTP, Chaocipher
- Morse Code, Pollux, Rail Fence, Columnar Transposition, Pigpen, Scytale

**Electromechanical Machines (13 + 11 wiring explorers)**
- Enigma I, Enigma M4, Lorenz SZ42, Typex, M-209, Purple, SIGABA, Fialka M-125, Hebern, NEMA, RED (Type 91), CX-52, KL-7
- Wiring explorers: Enigma M4, Enigma I, Typex, NEMA, KL-7, SIGABA, Fialka, Hebern, Purple, RED, Lorenz

**Cryptanalysis Tools (5)**
- Frequency Analysis, Vigenere Breaker, Bombe, Colossus, Vigenere Workshop

**Modern Symmetric Cryptography (8)**
- LFSR, DES, AES, Salsa20, ChaCha20, Trivium, Fortuna CSPRNG, SHA-256

**Public Key Cryptography (4)**
- Diffie-Hellman, RSA, ElGamal, Elliptic Curve (ECC)

---

## Competitive Landscape

### Top 3 Comparable Sites

| Site | Strengths | Weaknesses vs Cipher Museum |
|------|-----------|---------------------------|
| **CrypTool-Online** | ~30 tools, structured courses, academic backing, i18n | Form-based UI, no rotor machine simulators, limited internal state visualization |
| **dCode** | 200+ tools, massive classical cipher coverage, solver focus | No educational visualization, no hardware simulation, utility not pedagogy |
| **Virtual Colossus** | Deep single-machine fidelity (Enigma, Colossus) | Narrow scope (2-3 machines), no classical or modern crypto |

### Other Notable Sites
- **CyberChef (GCHQ)** — Data transformation pipeline, not educational
- **Cryptii** — Modular pipeline UI, classical ciphers only, no depth
- **Rumkin.com** — Text-based classical cipher tools, dated
- **101computing.net** — Enigma simulator, narrow scope

### Cipher Museum Differentiators
- Broadest era coverage in one app (700 BC → 2003)
- Deepest rotor machine collection (13 machines + 11 wiring explorers)
- Consistent, high-fidelity visual UI across all tools
- Two-tab encrypt-then-attack pattern (unique pedagogical approach)
- Internal state visualization (AES rounds, SHA-256 compression, Fortuna pools, Bombe search)
- Unified React/Tailwind codebase — not a grab-bag of separate projects

### Cipher Museum Weaknesses
- No guided curriculum / lesson plans / difficulty progression
- No collaborative mode (student-to-student encrypted messaging)
- No mobile optimization (grid visualizations tight on small screens)
- Single bundle ~1.1MB (no code splitting)
- No internationalization (English only)
- No assessment / quiz / challenge mode
- No accessibility audit (ARIA, keyboard navigation incomplete)

---

## Future Roadmap

### Priority 1 — Pedagogical Scaffolding
_Closes the biggest gap vs CrypTool_

- [ ] **Challenge Mode**: Guided puzzles per cipher (e.g., "Decrypt this Caesar ciphertext", "Find the Enigma rotor settings from this crib")
- [ ] **Difficulty tiers**: Beginner / Intermediate / Advanced per tool
- [ ] **Lesson sequences**: Curated paths (e.g., "Substitution → Transposition → Combined", "Enigma → Bombe → Colossus")
- [ ] **Inline hints & explanations**: Step-by-step walkthroughs embedded in each simulator

### Priority 2 — New Ciphers & Tools

**Classical gaps:**
- [ ] Atbash Cipher (Hebrew mirror substitution, biblical)
- [ ] Polybius Square (ancestor of ADFGVX)
- [ ] Beaufort Cipher (reciprocal Vigenere variant)
- [ ] Bacon's Cipher (steganographic bilateral cipher)
- [ ] Book / Ottendorf Cipher (reference-based encoding)
- [ ] Bifid / Trifid (Delastelle's fractionation ciphers)

**Modern gaps:**
- [ ] HMAC visualizer (keyed hashing)
- [ ] SHA-3 / Keccak (sponge construction — visually distinct from SHA-256)
- [ ] Argon2 / bcrypt (password hashing — why it's different from SHA)
- [ ] TLS handshake visualizer (ties DH + AES + SHA together)
- [ ] Merkle Tree / blockchain proof-of-work demo

**Cryptanalysis additions:**
- [ ] Interactive substitution cipher solver (drag-and-drop letter mapping)
- [ ] Differential cryptanalysis demo (simplified DES)
- [ ] Side-channel / timing attack visualization

### Priority 3 — Technical Improvements

- [ ] **Code splitting**: Lazy-load each simulator with React.lazy + Suspense
- [ ] **Mobile responsive**: Rework grid visualizations for small screens
- [ ] **Progressive Web App**: Offline support for classroom use without internet
- [ ] **URL state**: Encode cipher settings in URL for shareable links
- [ ] **Export/Import**: Save and share machine configurations as JSON

### Priority 4 — Collaboration & Engagement

- [ ] **Student messaging**: Alice/Bob encrypted channel (pick a cipher, exchange messages)
- [ ] **Timeline view**: Historical timeline placing all ciphers in context
- [ ] **Comparison mode**: Side-by-side cipher comparison (e.g., Enigma I vs Enigma M4)
- [ ] **Quiz mode**: Auto-generated questions per cipher with scoring
- [ ] **Classroom dashboard**: Teacher view showing student progress

### Priority 5 — Quality & Polish

- [ ] **Accessibility audit**: Full ARIA labels, keyboard navigation, screen reader support
- [ ] **i18n framework**: Extract all strings, start with Spanish/French/German
- [ ] **Performance profiling**: Identify and optimize slow renderers
- [ ] **Unit tests**: Core cipher logic (encrypt/decrypt round-trip tests)
- [ ] **Visual regression tests**: Screenshot comparison for UI changes
- [ ] **Documentation**: Developer guide for adding new simulators (template/pattern guide)

---

## Architecture Notes

### Adding a New Simulator (Checklist)
1. Create `src/simulators/{name}/App.tsx`
2. Add import and route to `src/main.tsx`
3. Add to appropriate array in `src/Layout.tsx` (SIMULATORS, MODERN_CRYPTO, etc.)
4. Add card to appropriate section in `src/Hub.tsx` (machines, modernCrypto, etc.)
5. Ensure color exists in `colorMap` in Hub.tsx
6. Run `npx tsc --noEmit` and `npx vite build`

### Existing Color Assignments
- amber/yellow: German machines, classical ciphers
- blue: Lorenz, KL-7
- emerald/green: British machines, Scytale
- purple: Purple cipher
- red: Chaocipher, RED
- teal: Pollux
- orange: Morse Code
- rose: Rail Fence
- sky: Columnar, Typex
- cyan: Modern symmetric crypto
- violet: Public key crypto
- crimson: Cryptanalysis tools
- indigo: Fortuna

### Sister Project
- [Modular Crypto Workbench](https://timothy815.github.io/Modular_crypto_worksbench/) — Companion tool for modular cryptographic experimentation
