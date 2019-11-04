const devtools = chrome.devtools;

devtools.panels.create(
  'Tarzan',
  'icon.png',
  'panel.html',
);
