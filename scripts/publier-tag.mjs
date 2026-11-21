// Publie une version installable sans npm : construit les paquets, puis crée l'étiquette vX.Y.Z sur un commit qui contient
// les dossiers dist (le reste de l'historique ne les contient pas). Le package.json de l'étiquette n'a plus ni script `prepare`
// ni dépendances de développement : l'installation est immédiate.
//   node scripts/publier-tag.mjs            → étiquette v<version du package.json>, poussée sur origin
//   node scripts/publier-tag.mjs --local    → sans pousser
import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const sh = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'pipe', encoding: 'utf8' }).trim();
const root = sh('git rev-parse --show-toplevel');
if (sh('git status --porcelain', root)) throw new Error('Dépôt non propre : commitez d’abord.');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const tag = `v${pkg.version}`;
if (sh(`git tag -l ${tag}`, root)) throw new Error(`L’étiquette ${tag} existe déjà : changez la version.`);

execSync('npm run build', { cwd: root, stdio: 'inherit' });
const dir = mkdtempSync(join(tmpdir(), 'stats-kit-'));
try {
  sh(`git worktree add --detach "${dir}" HEAD`, root);
  for (const d of ['packages/contrat/dist', 'packages/serveur/dist', 'packages/angular/dist']) cpSync(join(root, d), join(dir, d), { recursive: true });
  const release = { ...pkg };
  delete release.devDependencies;
  release.scripts = {};
  writeFileSync(join(dir, 'package.json'), JSON.stringify(release, null, 2) + '\n');
  sh('git add -f packages/contrat/dist packages/serveur/dist packages/angular/dist package.json', dir);
  sh(`git -c commit.gpgsign=false commit -m "Version ${pkg.version} : paquets construits" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`, dir);
  sh(`git tag -a ${tag} -m "stats-kit ${pkg.version}"`, dir);
  if (!process.argv.includes('--local')) sh(`git push origin ${tag}`, root);
  console.log(`Étiquette ${tag} créée${process.argv.includes('--local') ? '' : ' et poussée'} : npm i <dépôt>#${tag}`);
} finally {
  sh(`git worktree remove --force "${dir}"`, root);
  rmSync(dir, { recursive: true, force: true });
}
