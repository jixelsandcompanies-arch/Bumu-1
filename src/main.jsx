import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppRegistry } from 'react-native';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App.jsx';
import './styles.css';

AppRegistry.registerComponent('BumuPaygoFinance', () => App);
registerSW({ immediate: true });

createRoot(document.getElementById('root')).render(<App />);
