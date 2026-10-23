const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../public/images/catalog');
const files = fs.readdirSync(dir);
console.log('Total files found:', files.length);

const mapping = {
  'brick-1': '1.',
  'brick-2': '2.',
  'brick-3': '3.',
  'brick-4': '4.',
  'brick-5': '5.',
  'brick-6': '6.',
  'brick-7': '7.',
  'brick-8': '8.',
  'brick-9': '9.',
  'brick-10': '10.',
  'brick-11': '11.',
  'brick-12': '12.',
  'brick-13': '13.',
  'brick-14': '14.',
  'brick-15': '15.',
  'brick-16': '16.',
  'brick-17': '17.'
};

const results = {};

for (const [brickId, prefix] of Object.entries(mapping)) {
  const match = files.find(f => f.startsWith(prefix + ' ') || f.startsWith(prefix));
  if (match) {
    const src = path.join(dir, match);
    const dst = path.join(dir, brickId + '.jpg');
    fs.copyFileSync(src, dst);
    results[brickId] = `/images/catalog/${brickId}.jpg`;
    console.log(`✓ Copied: "${match}" -> "${brickId}.jpg"`);
  } else {
    console.warn(`✗ No match found for ${brickId} (${prefix})`);
  }
}

console.log('\n--- Link Summary ---');
console.log(JSON.stringify(results, null, 2));
