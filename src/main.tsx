import React, { lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import Layout from './Layout';
import Hub from './Hub';

// Lazy-loaded simulators — each becomes its own chunk
const EnigmaM4App         = lazy(() => import('./simulators/enigma-m4/App'));
const EnigmaWiringApp     = lazy(() => import('./simulators/enigma-wiring/App'));
const HebernWiringApp     = lazy(() => import('./simulators/hebern-wiring/App'));
const EnigmaIWiringApp    = lazy(() => import('./simulators/enigma-i-wiring/App'));
const TypexWiringApp      = lazy(() => import('./simulators/typex-wiring/App'));
const NemaWiringApp       = lazy(() => import('./simulators/nema-wiring/App'));
const Kl7WiringApp        = lazy(() => import('./simulators/kl7-wiring/App'));
const SigabaWiringApp     = lazy(() => import('./simulators/sigaba-wiring/App'));
const FialkaWiringApp     = lazy(() => import('./simulators/fialka-wiring/App'));
const LorenzApp           = lazy(() => import('./simulators/lorenz-sz42/App'));
const M209App             = lazy(() => import('./simulators/m209/App'));
const PurpleApp           = lazy(() => import('./simulators/purple/App'));
const SigabaApp           = lazy(() => import('./simulators/sigaba/App'));
const TypexApp            = lazy(() => import('./simulators/typex/App'));
const FialkaApp           = lazy(() => import('./simulators/fialka/App'));
const EnigmaIApp          = lazy(() => import('./simulators/enigma-i/App'));
const NemaApp             = lazy(() => import('./simulators/nema/App'));
const RedApp              = lazy(() => import('./simulators/red/App'));
const HebernApp           = lazy(() => import('./simulators/hebern/App'));
const CaesarApp           = lazy(() => import('./simulators/caesar/App'));
const VigenereApp         = lazy(() => import('./simulators/vigenere/App'));
const PlayfairApp         = lazy(() => import('./simulators/playfair/App'));
const AdfgvxApp           = lazy(() => import('./simulators/adfgvx/App'));
const JeffersonApp        = lazy(() => import('./simulators/jefferson/App'));
const HillApp             = lazy(() => import('./simulators/hill/App'));
const OtpApp              = lazy(() => import('./simulators/otp/App'));
const Cx52App             = lazy(() => import('./simulators/cx52/App'));
const Kl7App              = lazy(() => import('./simulators/kl7/App'));
const ChaocipherApp       = lazy(() => import('./simulators/chaocipher/App'));
const FrequencyAnalysisApp= lazy(() => import('./simulators/frequency-analysis/App'));
const VigenereBreakerApp  = lazy(() => import('./simulators/vigenere-breaker/App'));
const BombeApp            = lazy(() => import('./simulators/bombe/App'));
const ColossusApp         = lazy(() => import('./simulators/colossus/App'));
const VigenereWorkshopApp = lazy(() => import('./simulators/vigenere-workshop/App'));
const LfsrApp             = lazy(() => import('./simulators/lfsr/App'));
const DesApp              = lazy(() => import('./simulators/des/App'));
const AesApp              = lazy(() => import('./simulators/aes/App'));
const Salsa20App          = lazy(() => import('./simulators/salsa20/App'));
const Chacha20App         = lazy(() => import('./simulators/chacha20/App'));
const DiffieHellmanApp    = lazy(() => import('./simulators/diffie-hellman/App'));
const RsaApp              = lazy(() => import('./simulators/rsa/App'));
const ElGamalApp          = lazy(() => import('./simulators/elgamal/App'));
const EccApp              = lazy(() => import('./simulators/ecc/App'));
const TriviumApp          = lazy(() => import('./simulators/trivium/App'));
const PurpleWiringApp     = lazy(() => import('./simulators/purple-wiring/App'));
const RedWiringApp        = lazy(() => import('./simulators/red-wiring/App'));
const LorenzWiringApp     = lazy(() => import('./simulators/lorenz-wiring/App'));
const MorseApp            = lazy(() => import('./simulators/morse/App'));
const PolluxApp           = lazy(() => import('./simulators/pollux/App'));
const FortunaApp          = lazy(() => import('./simulators/fortuna/App'));
const RailFenceApp        = lazy(() => import('./simulators/rail-fence/App'));
const ColumnarApp         = lazy(() => import('./simulators/columnar/App'));
const PigpenApp           = lazy(() => import('./simulators/pigpen/App'));
const ScytaleApp          = lazy(() => import('./simulators/scytale/App'));
const Sha256App           = lazy(() => import('./simulators/sha256/App'));
const PolybiusApp         = lazy(() => import('./simulators/polybius/App'));
const SubstitutionSolverApp = lazy(() => import('./simulators/substitution-solver/App'));
const PringlesEnigmaApp   = lazy(() => import('./simulators/pringles-enigma/App'));
const AlbertiApp          = lazy(() => import('./simulators/alberti/App'));
const VicCipherApp        = lazy(() => import('./simulators/vic-cipher/App'));
const AffineApp           = lazy(() => import('./simulators/affine/App'));
const AutokeyApp          = lazy(() => import('./simulators/autokey/App'));
const BifidApp            = lazy(() => import('./simulators/bifid/App'));
const TrifidApp           = lazy(() => import('./simulators/trifid/App'));
const IocApp              = lazy(() => import('./simulators/ioc/App'));
const Rc4App              = lazy(() => import('./simulators/rc4/App'));
const HmacApp             = lazy(() => import('./simulators/hmac/App'));
const BlockModesApp       = lazy(() => import('./simulators/block-modes/App'));
const DigitalSignatureApp = lazy(() => import('./simulators/digital-signature/App'));
const PasswordHashingApp  = lazy(() => import('./simulators/password-hashing/App'));
const SpnApp              = lazy(() => import('./simulators/spn/App'));
const FeistelApp          = lazy(() => import('./simulators/feistel/App'));
const AesRoundApp         = lazy(() => import('./simulators/aes-round/App'));
const Sha256RoundApp      = lazy(() => import('./simulators/sha256-round/App'));


const root = document.getElementById('root')!;

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Hub />} />
            <Route path="/enigma-m4" element={<EnigmaM4App />} />
            <Route path="/enigma-wiring" element={<EnigmaWiringApp />} />
            <Route path="/hebern-wiring" element={<HebernWiringApp />} />
            <Route path="/enigma-i-wiring" element={<EnigmaIWiringApp />} />
            <Route path="/typex-wiring" element={<TypexWiringApp />} />
            <Route path="/nema-wiring" element={<NemaWiringApp />} />
            <Route path="/kl7-wiring" element={<Kl7WiringApp />} />
            <Route path="/sigaba-wiring" element={<SigabaWiringApp />} />
            <Route path="/fialka-wiring" element={<FialkaWiringApp />} />
            <Route path="/lorenz-sz42" element={<LorenzApp />} />
            <Route path="/m209" element={<M209App />} />
            <Route path="/purple" element={<PurpleApp />} />
            <Route path="/sigaba" element={<SigabaApp />} />
            <Route path="/typex" element={<TypexApp />} />
            <Route path="/fialka" element={<FialkaApp />} />
            <Route path="/enigma-i" element={<EnigmaIApp />} />
            <Route path="/nema" element={<NemaApp />} />
            <Route path="/red" element={<RedApp />} />
            <Route path="/hebern" element={<HebernApp />} />
            <Route path="/caesar" element={<CaesarApp />} />
            <Route path="/vigenere" element={<VigenereApp />} />
            <Route path="/playfair" element={<PlayfairApp />} />
            <Route path="/adfgvx" element={<AdfgvxApp />} />
            <Route path="/jefferson" element={<JeffersonApp />} />
            <Route path="/hill" element={<HillApp />} />
            <Route path="/otp" element={<OtpApp />} />
            <Route path="/cx52" element={<Cx52App />} />
            <Route path="/kl7" element={<Kl7App />} />
            <Route path="/chaocipher" element={<ChaocipherApp />} />
            <Route path="/frequency-analysis" element={<FrequencyAnalysisApp />} />
            <Route path="/vigenere-breaker" element={<VigenereBreakerApp />} />
            <Route path="/bombe" element={<BombeApp />} />
            <Route path="/colossus" element={<ColossusApp />} />
            <Route path="/vigenere-workshop" element={<VigenereWorkshopApp />} />
            <Route path="/lfsr" element={<LfsrApp />} />
            <Route path="/des" element={<DesApp />} />
            <Route path="/aes" element={<AesApp />} />
            <Route path="/salsa20" element={<Salsa20App />} />
            <Route path="/chacha20" element={<Chacha20App />} />
            <Route path="/diffie-hellman" element={<DiffieHellmanApp />} />
            <Route path="/rsa" element={<RsaApp />} />
            <Route path="/elgamal" element={<ElGamalApp />} />
            <Route path="/ecc" element={<EccApp />} />
            <Route path="/trivium" element={<TriviumApp />} />
            <Route path="/purple-wiring" element={<PurpleWiringApp />} />
            <Route path="/red-wiring" element={<RedWiringApp />} />
            <Route path="/lorenz-wiring" element={<LorenzWiringApp />} />
            <Route path="/morse" element={<MorseApp />} />
            <Route path="/pollux" element={<PolluxApp />} />
            <Route path="/fortuna" element={<FortunaApp />} />
            <Route path="/rail-fence" element={<RailFenceApp />} />
            <Route path="/columnar" element={<ColumnarApp />} />
            <Route path="/pigpen" element={<PigpenApp />} />
            <Route path="/scytale" element={<ScytaleApp />} />
            <Route path="/sha256" element={<Sha256App />} />
            <Route path="/polybius" element={<PolybiusApp />} />
            <Route path="/substitution-solver" element={<SubstitutionSolverApp />} />
            <Route path="/pringles-enigma" element={<PringlesEnigmaApp />} />
            <Route path="/alberti" element={<AlbertiApp />} />
            <Route path="/vic-cipher" element={<VicCipherApp />} />
            <Route path="/affine" element={<AffineApp />} />
            <Route path="/autokey" element={<AutokeyApp />} />
            <Route path="/bifid" element={<BifidApp />} />
            <Route path="/trifid" element={<TrifidApp />} />
            <Route path="/ioc" element={<IocApp />} />
            <Route path="/rc4" element={<Rc4App />} />
            <Route path="/hmac" element={<HmacApp />} />
            <Route path="/block-modes" element={<BlockModesApp />} />
            <Route path="/digital-signature" element={<DigitalSignatureApp />} />
            <Route path="/password-hashing" element={<PasswordHashingApp />} />
            <Route path="/spn" element={<SpnApp />} />
            <Route path="/feistel" element={<FeistelApp />} />
            <Route path="/aes-round" element={<AesRoundApp />} />
            <Route path="/sha256-round" element={<Sha256RoundApp />} />
        </Route>
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
