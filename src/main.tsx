import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import Layout from './Layout';
import Hub from './Hub';
import EnigmaM4App from './simulators/enigma-m4/App';
import EnigmaWiringApp from './simulators/enigma-wiring/App';
import HebernWiringApp from './simulators/hebern-wiring/App';
import EnigmaIWiringApp from './simulators/enigma-i-wiring/App';
import TypexWiringApp from './simulators/typex-wiring/App';
import NemaWiringApp from './simulators/nema-wiring/App';
import Kl7WiringApp from './simulators/kl7-wiring/App';
import SigabaWiringApp from './simulators/sigaba-wiring/App';
import FialkaWiringApp from './simulators/fialka-wiring/App';
import LorenzApp from './simulators/lorenz-sz42/App';
import M209App from './simulators/m209/App';
import PurpleApp from './simulators/purple/App';
import SigabaApp from './simulators/sigaba/App';
import TypexApp from './simulators/typex/App';
import FialkaApp from './simulators/fialka/App';
import EnigmaIApp from './simulators/enigma-i/App';
import NemaApp from './simulators/nema/App';
import RedApp from './simulators/red/App';
import HebernApp from './simulators/hebern/App';
import CaesarApp from './simulators/caesar/App';
import VigenereApp from './simulators/vigenere/App';
import PlayfairApp from './simulators/playfair/App';
import AdfgvxApp from './simulators/adfgvx/App';
import JeffersonApp from './simulators/jefferson/App';
import HillApp from './simulators/hill/App';
import OtpApp from './simulators/otp/App';
import Cx52App from './simulators/cx52/App';
import Kl7App from './simulators/kl7/App';
import ChaocipherApp from './simulators/chaocipher/App';
import FrequencyAnalysisApp from './simulators/frequency-analysis/App';
import VigenereBreakerApp from './simulators/vigenere-breaker/App';
import BombeApp from './simulators/bombe/App';
import ColossusApp from './simulators/colossus/App';
import VigenereWorkshopApp from './simulators/vigenere-workshop/App';
import LfsrApp from './simulators/lfsr/App';
import DesApp from './simulators/des/App';
import AesApp from './simulators/aes/App';
import Salsa20App from './simulators/salsa20/App';
import Chacha20App from './simulators/chacha20/App';
import DiffieHellmanApp from './simulators/diffie-hellman/App';
import RsaApp from './simulators/rsa/App';
import ElGamalApp from './simulators/elgamal/App';
import EccApp from './simulators/ecc/App';
import TriviumApp from './simulators/trivium/App';
import PurpleWiringApp from './simulators/purple-wiring/App';
import RedWiringApp from './simulators/red-wiring/App';
import LorenzWiringApp from './simulators/lorenz-wiring/App';
import MorseApp from './simulators/morse/App';
import PolluxApp from './simulators/pollux/App';
import FortunaApp from './simulators/fortuna/App';
import RailFenceApp from './simulators/rail-fence/App';
import ColumnarApp from './simulators/columnar/App';
import PigpenApp from './simulators/pigpen/App';
import ScytaleApp from './simulators/scytale/App';
import Sha256App from './simulators/sha256/App';
import PolybiusApp from './simulators/polybius/App';
import SubstitutionSolverApp from './simulators/substitution-solver/App';
import PringlesEnigmaApp from './simulators/pringles-enigma/App';
import AlbertiApp from './simulators/alberti/App';
import VicCipherApp from './simulators/vic-cipher/App';
import AffineApp from './simulators/affine/App';

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
          {/* Cryptanalysis Tools */}
          <Route path="/frequency-analysis" element={<FrequencyAnalysisApp />} />
          <Route path="/vigenere-breaker" element={<VigenereBreakerApp />} />
          <Route path="/bombe" element={<BombeApp />} />
          <Route path="/colossus" element={<ColossusApp />} />
          <Route path="/vigenere-workshop" element={<VigenereWorkshopApp />} />
          {/* Modern Cryptography */}
          <Route path="/lfsr" element={<LfsrApp />} />
          <Route path="/des" element={<DesApp />} />
          <Route path="/aes" element={<AesApp />} />
          <Route path="/salsa20" element={<Salsa20App />} />
          <Route path="/chacha20" element={<Chacha20App />} />
          {/* Public Key Cryptography */}
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
        </Route>
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
