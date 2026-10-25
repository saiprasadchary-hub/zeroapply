import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from '../../src/App';
import { installPhoneBridge } from './phoneBridge';
import { AppErrorBoundary } from '../../src/components/AppErrorBoundary';

installPhoneBridge();
const root = document.getElementById('root');
if (!root) throw new Error('ZeroApply cannot find its app container.');
createRoot(root).render(<StrictMode><AppErrorBoundary><App /></AppErrorBoundary></StrictMode>);
