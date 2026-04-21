import { defineShardwireApp, generateSecretScope } from 'shardwire/client';

export const browserSecretId = 'browser';

export const manifest = defineShardwireApp({
	name: '{{MANIFEST_NAME}}',
	events: ['messageCreate'],
	actions: ['sendMessage'],
});

export const browserSecretScope = generateSecretScope(manifest);
