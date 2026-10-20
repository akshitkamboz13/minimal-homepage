// Synchronous new tab relay.
// Browsers (Chromium/Firefox) lock omnibox focus onto the registered newtab override page.
// By synchronously redirecting to index.html before that lock resolves, index.html is treated
// as a normal document navigation, allowing target input elements (Puff CLI or Search input)
// to claim keyboard focus immediately.
location.replace('index.html');
