const ERROR_DOCS_BASE_URL = 'https://unloopedmido.github.io/shardwire/errors/';

export function docsErrorLink(anchor: string): string {
	return `${ERROR_DOCS_BASE_URL}#${anchor}`;
}

export function withErrorDocsLink(message: string, anchor: string): string {
	if (message.includes('See: http://') || message.includes('See: https://')) {
		return message;
	}
	return `${message} See: ${docsErrorLink(anchor)}`;
}
