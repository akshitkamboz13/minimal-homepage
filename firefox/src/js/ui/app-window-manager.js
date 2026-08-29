/**
 * Core Infrastructure for Web-App Window Management
 * Host-Side Window Manager Controller & Host-to-Guest Lifecycle API
 */

let highestZIndex = 9005;

// Bring window wrapper to front (focus management)
export function bringToFront(windowWrapper) {
  highestZIndex++;
  if (highestZIndex > 9490) highestZIndex = 9005;
  windowWrapper.style.zIndex = highestZIndex;

  // Update active visual focus across all grid windows
  document.querySelectorAll('.grid-window').forEach(win => {
    win.classList.remove('window-active');
  });
  windowWrapper.classList.add('window-active');
}

// 2. Host-Side Window Container Implementation
export function spawnAppInstance(appId, appPath) {
  // 1. Create the Draggable Wrapper (Host Layer)
  const windowWrapper = document.createElement('div');
  windowWrapper.className = 'grid-window';
  windowWrapper.dataset.appId = appId;
  
  // Enforce rigid phone-sized viewports so mobile layouts don't break
  windowWrapper.style.width = '360px';
  windowWrapper.style.height = '640px';
  windowWrapper.style.position = 'absolute';

  // 2. Create the Window Title/Drag Bar
  const dragBar = document.createElement('div');
  dragBar.className = 'window-drag-header';
  dragBar.innerText = `App: ${appId}`;
  windowWrapper.appendChild(dragBar);

  // 3. Create the Sandboxed Viewport (Guest Layer)
  const appViewport = document.createElement('iframe');
  appViewport.className = 'app-viewport';
  
  // Security Sandbox: Allow execution but block top-level navigation breakouts
  appViewport.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox');
  
  const targetUrl = (typeof chrome !== 'undefined' && chrome.runtime?.getURL)
    ? chrome.runtime.getURL(appPath)
    : appPath;
  appViewport.src = targetUrl;

  windowWrapper.appendChild(appViewport);
  document.body.appendChild(windowWrapper);

  // 4. Initialize your existing dragging/z-index logic on windowWrapper here
  initializeDragLogic(windowWrapper, dragBar);

  // Auto-focus spawned instance
  AppWindowManager.focusWindow(appId);

  return windowWrapper;
}

export function initializeDragLogic(windowWrapper, dragBar) {
  // Focus management on interaction
  windowWrapper.addEventListener('mousedown', () => {
    bringToFront(windowWrapper);
    const appId = windowWrapper.dataset.appId;
    if (appId) {
      AppWindowManager.focusWindow(appId);
    }
  });

  let isDragging = false;
  let initialX = 0;
  let initialY = 0;
  let currentX = 0;
  let currentY = 0;

  dragBar.addEventListener('mousedown', (e) => {
    if (e.target.closest('button') || e.target.closest('input')) return;
    const rect = windowWrapper.getBoundingClientRect();
    const xOffset = parseInt(windowWrapper.style.left, 10) || rect.left || 120;
    const yOffset = parseInt(windowWrapper.style.top, 10) || rect.top || 120;

    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;
    isDragging = true;
    bringToFront(windowWrapper);
  });

  const onMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    currentX = e.clientX - initialX;
    currentY = e.clientY - initialY;

    const maxX = Math.max(0, window.innerWidth - windowWrapper.offsetWidth);
    const maxY = Math.max(0, window.innerHeight - windowWrapper.offsetHeight);

    currentX = Math.max(0, Math.min(currentX, maxX));
    currentY = Math.max(0, Math.min(currentY, maxY));

    windowWrapper.style.left = `${currentX}px`;
    windowWrapper.style.top = `${currentY}px`;
  };

  const onMouseUp = () => {
    if (isDragging) {
      isDragging = false;
    }
  };

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

// 3. Asynchronous Host-to-Guest Lifecycle API
export const AppWindowManager = {
  // Broadcast a state change to a specific running app window
  sendSystemEvent: function(appId, actionType, payload = {}) {
    const wrapper = document.querySelector(`.grid-window[data-app-id="${appId}"]`);
    if (!wrapper) return;

    const iframe = wrapper.querySelector('iframe');
    if (iframe && iframe.contentWindow) {
      // Direct message routing to the isolated guest app
      iframe.contentWindow.postMessage({
        origin: 'EXTENSION_HOST',
        action: actionType,
        data: payload
      }, '*');
    }
  },

  // Focus management: Tell an app it has been clicked/brought to front
  focusWindow: function(appId) {
    const wrapper = document.querySelector(`.grid-window[data-app-id="${appId}"]`);
    if (wrapper) {
      bringToFront(wrapper);
    }
    this.sendSystemEvent(appId, 'WINDOW_FOCUS_GAINED');
  },

  // State management: Tell an app to pause animations or heavy logic when hidden
  minimizeWindow: function(appId) {
    const wrapper = document.querySelector(`.grid-window[data-app-id="${appId}"]`);
    if (wrapper) {
      wrapper.classList.add('is-minimized');
    }
    this.sendSystemEvent(appId, 'WINDOW_STATE_MINIMIZED');
  }
};

export function initAppWindowManager() {
  // Optional host-level system event listener bindings
}
