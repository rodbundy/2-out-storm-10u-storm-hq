// STORM HQ PUSH CONFIG
// Public Firebase web config + public VAPID key only. NEVER put a service-account private key here.
globalThis.STORM_PUSH_CONFIG = {
  enabled: true,
  sdkVersion: '12.17.1',
  firebase: {
    apiKey: 'AIzaSyCel5T-okqbTOWbzrG3-eqHjrT3hC9XV2c',
    authDomain: 'out-storm-hq.firebaseapp.com',
    projectId: 'out-storm-hq',
    storageBucket: 'out-storm-hq.firebasestorage.app',
    messagingSenderId: '461935348525',
    appId: '1:461935348525:web:936885a34a2c943164e1a4'
  },
  vapidKey: 'BEv1StxuIERsFkFD5s7ue3Q8_8bsORZJh-iM1pbe7rytEsV72PvhJgBCLIDkVOWi8Q-lS4E1CdOs50Mxof2dH00',
  apiUrl: 'https://script.google.com/macros/s/AKfycbzD520mV0DjuluW6YxyIuNR4dGnKp85wYNEBmbywGQT-CAtoImbAX5gBYzoKjQ-v77uvg/exec',
  appName: '2 Out Storm 10U',
  notificationIcon: '/assets/img/icons/icon-192.png',
  notificationBadge: '/assets/img/icons/badge-96.png',
  defaultUrl: '/'
};
