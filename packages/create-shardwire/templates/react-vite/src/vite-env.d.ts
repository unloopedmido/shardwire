/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_SHARDWIRE_URL?: string;
	readonly VITE_SHARDWIRE_SECRET: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
