// Run by npm when installing from Git (`npm i github:…`) or from a folder: builds the packages if they are not built yet.
// A version tag (vX.Y.Z) already contains the built packages: nothing to do.
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const root = new URL('..', import.meta.url);
const built = ['packages/contract/dist/index.js', 'packages/server/dist/index.js', 'packages/angular/dist/fesm2022/stats-kit-angular.mjs'].every((f) => existsSync(new URL(f, root)));
if (built) process.exit(0);
if (!existsSync(new URL('node_modules/typescript', root))) {
  console.warn('[stats-kit] packages not built and build tools missing: install a version tag (#v0.2.0) or run "npm install" in the repository.');
  process.exit(0);
}
console.log('[stats-kit] building the packages…');
execSync('npm run build', { cwd: root, stdio: 'inherit' });
