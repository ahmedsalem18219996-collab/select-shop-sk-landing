/* Isolated React root for SELECT SHOP preview wordmark. No catalog/cart/checkout changes.
   React Bits TechText JSX is saved in components/TechText.jsx; browser adapter imports the same algorithm.
   React Bits license: MIT + Commons Clause (https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md).
*/
import React from 'react';
import { createRoot } from 'react-dom/client';
import TechText from './components/TechText.js';

const mount = document.getElementById('selectTechTextRoot');
if (mount) {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
  const mobile = window.matchMedia?.('(max-width: 620px)').matches || false;
  const label = mount.dataset.text || 'SELECT SHOP';
  const props = {
    text: label,
    fontFamily: 'Manrope, sans-serif',
    fontWeight: 600,
    fontSize: 150,
    reveal: 'letter',
    dashLength: 4,
    dashGap: 2,
    specks: reduced ? 0 : 15,
    color: '#f3efec',
    accentColor: '#daa48a',
    selection: !reduced,
    draggable: !reduced && !mobile,
    labels: !mobile,
    sweep: !reduced && !mobile,
    speed: 0.65
  };
  const root = createRoot(mount);
  root.render(React.createElement(TechText, props));
  mount.dataset.state = 'react-mounted';
  window.SELECT_SHOP_TECH_TEXT = { engine: 'React Bits TechText', text: label, previewOnly: true };
}
