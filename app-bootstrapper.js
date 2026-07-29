// 1. Core Lifecycle Listener
window.addEventListener('message', (event) => {
  // Reject messages not originating from our Host framework
  if (event.data?.origin !== 'EXTENSION_HOST') return;

  switch(event.data.action) {
    case 'WINDOW_FOCUS_GAINED':
      document.body.classList.add('window-active');
      break;
    case 'WINDOW_STATE_MINIMIZED':
      document.body.classList.remove('window-active');
      // Trigger app-specific pause events if they exist
      break;
    default:
      console.warn('Unknown host command:', event.data.action);
  }
});

// 2. Hardware API Fallback Stubs (Prevents legacy B2G fatal runtime crashes)
if (!window.navigator.mozApps) {
  window.navigator.mozApps = {
    getSelf: () => ({ onsuccess: function() {} }),
    checkInstalled: () => ({ onsuccess: function() {} })
  };
}
if (!window.navigator.mozSettings) {
  window.navigator.mozSettings = {
    createLock: () => ({ get: () => ({ onsuccess: function() {} }) })
  };
}
