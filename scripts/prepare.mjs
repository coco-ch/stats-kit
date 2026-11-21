// Lancé par npm à l'installation depuis Git (`npm i github:…`) ou depuis un dossier : construit les paquets s'ils ne le sont pas.
// Une étiquette de version (vX.Y.Z) contient déjà les paquets construits : rien à faire.
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const root = new URL('..', import.meta.url);
const built = ['packages/contrat/dist/index.js', 'packages/serveur/dist/index.js', 'packages/angular/dist/fesm2022/stats-kit-angular.mjs'].every((f) => existsSync(new URL(f, root)));
if (built) process.exit(0);
if (!existsSync(new URL('node_modules/typescript', root))) {
  console.warn('[stats-kit] paquets non construits et outils absents : installez une étiquette de version (#v0.1.0) ou lancez « npm install » dans le dépôt.');
  process.exit(0);
}
console.log('[stats-kit] construction des paquets…');
execSync('npm run build', { cwd: root, stdio: 'inherit' });
