'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const packageRoot = path.dirname(require.resolve('gsap/package.json'));
const dest = path.join(root, 'assets', 'vendor');
fs.mkdirSync(dest, { recursive: true });
for (const [source, target] of [['dist/gsap.min.js', 'gsap.min.js'], ['dist/gsap.js', 'gsap.js'], ['README.md', 'GSAP-README.md'], ['package.json', 'gsap-package.json']]) {
  fs.copyFileSync(path.join(packageRoot, source), path.join(dest, target));
}
fs.writeFileSync(path.join(dest, 'GSAP-LICENSE.txt'), 'GSAP 3.15.1, copyright Webflow / GreenSock.\nOriginal copyright notices are retained in gsap.js and gsap.min.js.\nThe runtime is governed by the Standard No Charge GSAP License, not the MIT license of the skills.\nOfficial terms: https://gsap.com/community/standard-license/\nOfficial installation: https://gsap.com/docs/v3/Installation/\nThis project uses GSAP for a presentation, not a visual animation authoring product.\n');
console.log('GSAP ' + require('gsap/package.json').version + ' copied locally.');

const leafletRoot = path.dirname(require.resolve('leaflet/package.json'));
const leafletDest = path.join(dest, 'leaflet');
fs.mkdirSync(leafletDest, { recursive: true });
for (const file of ['leaflet.js','leaflet-src.js','leaflet.css','leaflet.js.map']) fs.copyFileSync(path.join(leafletRoot,'dist',file),path.join(leafletDest,file));
fs.cpSync(path.join(leafletRoot,'dist/images'),path.join(leafletDest,'images'),{recursive:true});
fs.copyFileSync(path.join(leafletRoot,'LICENSE'),path.join(leafletDest,'LICENSE'));
console.log('Leaflet '+require('leaflet/package.json').version+' copied locally.');
