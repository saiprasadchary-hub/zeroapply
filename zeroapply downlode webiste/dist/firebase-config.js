import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import { getAnalytics, isSupported } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-analytics.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBqZf3oVV5hj6euLylxptpiFS_uemZOeaU',
  authDomain: 'zero-apply-app.firebaseapp.com',
  projectId: 'zero-apply-app',
  storageBucket: 'zero-apply-app.firebasestorage.app',
  messagingSenderId: '123093835939',
  appId: '1:123093835939:web:89b5f7a19cc7950a4b5f16',
  measurementId: 'G-SQRXE9KQE2',
};

export const app = getApps().find(candidate => candidate.options.appId === firebaseConfig.appId) ?? initializeApp(firebaseConfig, 'zeroapply-download-website');
// Analytics is optional in browsers without the required storage or with tracking blocked.
export const analyticsReady = isSupported()
  .then(supported => supported ? getAnalytics(app) : null)
  .catch(() => null);
