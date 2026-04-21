/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_SHARDWIRE_URL?: string;
	readonly VITE_SHARDWIRE_SECRET: string;
	readonly VITE_SHARDWIRE_SECRET_ID?: string;
	readonly VITE_DEMO_CHANNEL_ID?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
