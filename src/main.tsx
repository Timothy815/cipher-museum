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
        </Route>
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
