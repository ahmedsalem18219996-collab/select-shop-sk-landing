/* Exact configuration from request, without JSX build.
   JSX equivalent: <TechText text="React Bits" fontWeight={600} fontSize={150} reveal="letter" dashLength={4} dashGap={2} specks={15} />
*/
import React from 'react';
import {createRoot} from 'react-dom/client';
import TechText from './components/TechText.js';
const root=document.getElementById('demoReactBits');
if(root){
 createRoot(root).render(React.createElement(TechText,{
   text:"React Bits",fontWeight:600,fontSize:150,reveal:"letter",dashLength:4,dashGap:2,specks:15
 }));
}