import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { generateReferenceDocs } from '../scripts/reference/generate.mjs';

test('generateReferenceDocs writes grouped reference pages from root exports', async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'shardwire-reference-fixture-'));
  const packageRoot = path.join(fixtureRoot, 'packages', 'shardwire');
  const srcRoot = path.join(packageRoot, 'src');
  const docsRoot = path.join(fixtureRoot, 'apps', 'website', 'content', 'docs', 'reference');

  await mkdir(path.join(srcRoot, 'bot'), { recursive: true });
  await mkdir(path.join(srcRoot, 'dx'), { recursive: true });
  await mkdir(path.join(srcRoot, 'discord'), { recursive: true });
  await mkdir(docsRoot, { recursive: true });

  await writeFile(
    path.join(srcRoot, 'index.ts'),
    [
      "export { createBotBridge } from './bot';",
      "export { defineShardwireApp } from './dx/app-manifest';",
      "export type * from './discord/types';",
      '',
    ].join('\n'),
  );

  await writeFile(
    path.join(srcRoot, 'bot', 'index.ts'),
    [
      '/** Start the bridge on the bot process. */',
      'export function createBotBridge(options: BotBridgeOptions): BotBridge {',
      '  throw new Error("not implemented");',
      '}',
      '',
    ].join('\n'),
  );

  await writeFile(
    path.join(srcRoot, 'dx', 'app-manifest.ts'),
    [
      '/** Declare the app contract for strict startup. */',
      'export function defineShardwireApp(definition: ShardwireAppManifestDefinition): ShardwireAppManifest {',
      '  return definition as unknown as ShardwireAppManifest;',
      '}',
      '',
    ].join('\n'),
  );

  await writeFile(
    path.join(srcRoot, 'discord', 'types.ts'),
    [
      '/** Server configuration for the bot-side bridge. */',
      'export interface BotBridgeOptions {',
      '  token: string;',
      '  port?: number;',
      '}',
      '',
      'export interface BotBridge {',
      '  ready(): Promise<void>;',
      '}',
      '',
      'export interface ShardwireAppManifestDefinition {',
      '  name?: string;',
      '}',
      '',
      'export interface ShardwireAppManifest {',
      '  name: string;',
      '}',
      '',
    ].join('\n'),
  );

  await generateReferenceDocs({
    packageRoot,
    docsRoot,
    indexFile: path.join(srcRoot, 'index.ts'),
  });

  const meta = JSON.parse(await readFile(path.join(docsRoot, 'meta.json'), 'utf8'));
  assert.deepEqual(meta.pages.slice(0, 3), ['index', 'bridge-apis', 'contracts-and-diagnostics']);

  const bridgeCategory = JSON.parse(
    await readFile(path.join(docsRoot, 'bridge-apis', 'meta.json'), 'utf8'),
  );
  assert.ok(bridgeCategory.pages.includes('create-bot-bridge'));
  assert.ok(bridgeCategory.pages.includes('bot-bridge-options'));

  const functionPage = await readFile(path.join(docsRoot, 'bridge-apis', 'create-bot-bridge.mdx'), 'utf8');
  assert.match(functionPage, /title: "createBotBridge"/);
  assert.match(functionPage, /Start the bridge on the bot process/);
  assert.match(functionPage, /```ts[\s\S]*createBotBridge/);

  const interfacePage = await readFile(path.join(docsRoot, 'bridge-apis', 'bot-bridge-options.mdx'), 'utf8');
  assert.match(interfacePage, /<AutoTypeTable path=/);
  assert.match(interfacePage, /name="BotBridgeOptions"/);

  const diagnosticsPage = await readFile(
    path.join(docsRoot, 'contracts-and-diagnostics', 'define-shardwire-app.mdx'),
    'utf8',
  );
  assert.match(diagnosticsPage, /strict startup/i);
});
