const fs = require('fs');
const path = require('path');

const targetFile = path.join(
  __dirname,
  '..',
  'node_modules',
  '@capgo',
  'capacitor-updater',
  'android',
  'src',
  'main',
  'java',
  'ee',
  'forgr',
  'capacitor_updater',
  'DelayUpdateUtils.java'
);

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');
  let modified = false;

  const replacements = [
    { from: 'case DelayUntilNext.background:', to: 'case background:' },
    { from: 'case DelayUntilNext.kill:', to: 'case kill:' },
    { from: 'case DelayUntilNext.date:', to: 'case date:' },
    { from: 'case DelayUntilNext.nativeVersion:', to: 'case nativeVersion:' },
  ];

  for (const { from, to } of replacements) {
    if (content.includes(from)) {
      content = content.replaceAll(from, to);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('[PostInstall] Successfully patched @capgo/capacitor-updater DelayUpdateUtils.java for Java compiler compatibility.');
  }
}
