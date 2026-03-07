import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import Layout from './Layout';
import Hub from './Hub';
import EnigmaM4App from './simulators/enigma-m4/App';
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

const root = document.getElementById('root')!;

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Hub />} />
          <Route path="/enigma-m4" element={<EnigmaM4App />} />
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
        </Route>
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
