// SPDX-License-Identifier: Apache-2.0

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

type AuditPhase = 'pre-publish' | 'published';

const expectedOrigin = 'https://github.com/bajrang0789/agentic-sdlc-kit.git';

function fail(message: string): never {
  throw new Error(`Bootstrap provenance audit failed: ${message}`);
}

function runGit(root: string, args: string[]): string {
  try {
    return execFileSync('git', ['-C', root, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    fail(`could not run git ${args.join(' ')}: ${detail}`);
  }
}

function runGh(args: string[]): string {
  try {
    return execFileSync('gh', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    fail(
      `could not query GitHub. Run this owner-only audit from an authenticated checkout: ${detail}`,
    );
  }
}

function parsePhase(args: string[]): AuditPhase {
  if (args.length !== 2 || args[0] !== '--phase') {
    fail('usage: npm run bootstrap:audit -- --phase pre-publish|published');
  }

  const phase = args[1];
  if (phase !== 'pre-publish' && phase !== 'published') {
    fail('phase must be pre-publish or published');
  }

  return phase;
}

function checkSubmodules(root: string): void {
  if (existsSync(resolve(root, '.gitmodules'))) {
    fail('.gitmodules is present');
  }

  const index = runGit(root, ['ls-files', '-s']);
  const gitlink = index.split('\n').find((line) => line.startsWith('160000 '));
  if (gitlink !== undefined) {
    fail(`gitlink found in the index: ${gitlink}`);
  }
}

function checkLooseObjectState(root: string): void {
  const values = new Map<string, number>();
  for (const line of runGit(root, ['count-objects', '-v']).split('\n')) {
    const separator = line.indexOf(':');
    if (separator === -1) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    const value = Number(line.slice(separator + 1).trim());
    values.set(key, value);
  }

  for (const key of ['in-pack', 'packs', 'prune-packable', 'garbage']) {
    if ((values.get(key) ?? 0) !== 0) {
      fail(
        `git count-objects reports ${key}=${values.get(key) ?? 0}, not a newly initialized object set`,
      );
    }
  }
}

function checkNoRemotes(root: string): void {
  const remotes = runGit(root, ['remote']);
  if (remotes !== '') {
    fail(`pre-publish audit requires no remotes, found: ${remotes.replaceAll('\n', ', ')}`);
  }
}

function checkPublishedRemote(root: string): void {
  const remotes = runGit(root, ['remote']).split('\n').filter(Boolean);
  if (remotes.length !== 1 || remotes[0] !== 'origin') {
    fail(
      `published audit requires only the origin remote, found: ${remotes.join(', ') || '(none)'}`,
    );
  }

  const fetchUrls = runGit(root, ['config', '--get-all', 'remote.origin.url'])
    .split('\n')
    .filter(Boolean);
  const pushUrls = runGit(root, ['remote', 'get-url', '--all', '--push', 'origin'])
    .split('\n')
    .filter(Boolean);

  if (fetchUrls.length !== 1 || fetchUrls[0] !== expectedOrigin) {
    fail(`origin fetch URL must be ${expectedOrigin}`);
  }
  if (pushUrls.length !== 1 || pushUrls[0] !== expectedOrigin) {
    fail(`origin push URL must be ${expectedOrigin}`);
  }
}

function checkOriginalRootHistory(root: string): void {
  const roots = runGit(root, ['rev-list', '--max-parents=0', 'HEAD']).split('\n').filter(Boolean);
  if (roots.length !== 1) {
    fail(`expected exactly one root commit, found ${roots.length}`);
  }

  const tree = runGit(root, ['show', '-s', '--format=%T', roots[0]!]);
  if (tree !== '4b825dc642cb6eb9a060e54bf8d69288fbee4904') {
    fail('the sole root commit does not have the expected empty initial tree');
  }
}

function checkPublishedGitHubMetadata(): void {
  const response = runGh(['api', 'repos/bajrang0789/agentic-sdlc-kit']);
  let repository: unknown;
  try {
    repository = JSON.parse(response);
  } catch {
    fail('GitHub repository response was not valid JSON');
  }

  if (repository === null || typeof repository !== 'object') {
    fail('GitHub repository response was not an object');
  }

  const metadata = repository as Record<string, unknown>;
  if (metadata.fork !== false) {
    fail('GitHub does not report isFork=false');
  }
  if (metadata.parent !== null && metadata.parent !== undefined) {
    fail('GitHub reports a parent repository');
  }
  if (metadata.source !== null && metadata.source !== undefined) {
    fail('GitHub reports a source repository');
  }
}

const phase = parsePhase(process.argv.slice(2));
const root = runGit(process.cwd(), ['rev-parse', '--show-toplevel']);

checkSubmodules(root);

if (phase === 'pre-publish') {
  checkLooseObjectState(root);
  checkNoRemotes(root);
  console.log(
    'Bootstrap pre-publish provenance audit passed. Record this result before the first publish.',
  );
} else {
  checkPublishedRemote(root);
  checkOriginalRootHistory(root);
  checkPublishedGitHubMetadata();
  console.log(
    'Bootstrap published provenance audit passed. Record this owner-only result before release.',
  );
}
