// scripts/post-build.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const distDir = path.join(rootDir, 'dist');
const distAssets = path.join(distDir, 'assets');
const rootAssets = path.join(rootDir, 'assets');

// 1. Clean root assets
if (fs.existsSync(rootAssets)) {
  fs.rmSync(rootAssets, { recursive: true, force: true });
}
fs.mkdirSync(rootAssets, { recursive: true });

// 2. Copy dist/assets to root/assets
if (fs.existsSync(distAssets)) {
  fs.cpSync(distAssets, rootAssets, { recursive: true });
  console.log(`✅ [2/3] Cleaned & copied dist/assets -> root/assets`);
}

// 3. Copy dist/index.html to root/index.html
if (fs.existsSync(path.join(distDir, 'index.html'))) {
  fs.copyFileSync(path.join(distDir, 'index.html'), path.join(rootDir, 'index.html'));
  console.log(`✅ [3/3] Mirrored dist/index.html -> root/index.html`);
}

console.log(`\n🎉 Ready for Git Push! Run:\n   git add . && git commit -m "deploy: update" && git push origin main\n`);