// Publishes a version installable without npm: builds the packages, then creates the vX.Y.Z tag on a commit that contains the
// dist folders (the rest of the history does not contain them). The package.json of the tag has neither a `prepare` script nor
// dev dependencies: installation is immediate.
//   node scripts/publish-tag.mjs            → tag v<package.json version>, pushed to origin
//   node scripts/publish-tag.mjs --local    → without pushing
import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const sh = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'pipe', encoding: 'utf8' }).trim();
const root = sh('git rev-parse --show-toplevel');
if (sh('git status --porcelain', root)) throw new Error('Working tree not clean: commit first.');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const tag = `v${pkg.version}`;
if (sh(`git tag -l ${tag}`, root)) throw new Error(`Tag ${tag} already exists: change the version.`);

const dists = ['packages/contract/dist', 'packages/server/dist', 'packages/angular/dist'];
execSync('npm run build', { cwd: root, stdio: 'inherit' });
const dir = mkdtempSync(join(tmpdir(), 'stats-kit-'));
try {
  sh(`git worktree add --detach "${dir}" HEAD`, root);
  for (const d of dists) cpSync(join(root, d), join(dir, d), { recursive: true });
  const release = { ...pkg };
  delete release.devDependencies;
  release.scripts = {};
  writeFileSync(join(dir, 'package.json'), JSON.stringify(release, null, 2) + '\n');
  sh(`git add -f ${dists.join(' ')} package.json`, dir);
  sh(`git -c commit.gpgsign=false commit -m "Release ${pkg.version}: built packages" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`, dir);
  sh(`git tag -a ${tag} -m "stats-kit ${pkg.version}"`, dir);
  if (!process.argv.includes('--local')) sh(`git push origin ${tag}`, root);
  console.log(`Tag ${tag} created${process.argv.includes('--local') ? '' : ' and pushed'}: npm i <repository>#${tag}`);
} finally {
  sh(`git worktree remove --force "${dir}"`, root);
  rmSync(dir, { recursive: true, force: true });
}
