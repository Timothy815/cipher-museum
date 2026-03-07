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
        </Route>
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
