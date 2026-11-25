/* Web push helper shared by the shop and the admin panel.
   MSPush.subscribe() asks permission, registers /sw.js and returns this device's subscription (JSON) or throws a readable error. */
(function () {
  'use strict';
  const b64 = (s) => { const p = '='.repeat((4 - (s.length % 4)) % 4), r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from([...r].map((c) => c.charCodeAt(0))); };
  const MSPush = {
    supported: () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
    denied: () => 'Notification' in window && Notification.permission === 'denied',
    async subscribe() {
      if (!MSPush.supported()) throw new Error('This browser cannot receive notifications. On iPhone, add the site to your Home Screen first, or use email instead.');
      if (Notification.permission === 'denied') throw new Error('Notifications are blocked for this site. Allow them in the browser settings, or use email instead.');
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') throw new Error('Notifications were not allowed.');
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const { key } = await (await fetch('/api/push/key')).json();
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) });
      }
      return sub.toJSON();
    },
    async current() {
      if (!MSPush.supported() || Notification.permission !== 'granted') return null;
      try { const reg = await navigator.serviceWorker.getRegistration('/'); const s = reg && await reg.pushManager.getSubscription(); return s ? s.toJSON() : null; } catch (e) { return null; }
    },
  };
  window.MSPush = MSPush;
})();
