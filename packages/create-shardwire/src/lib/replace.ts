const PLACEHOLDER = /\{\{([A-Z0-9_]+)\}\}/g;

export function applyTemplateVars(content: string, vars: Record<string, string>): string {
	return content.replace(PLACEHOLDER, (full, key: string) => {
		if (key in vars) {
			return vars[key]!;
		}
		return full;
	});
}

export function assertNoUnresolvedPlaceholders(content: string, fileHint: string): void {
	const left = content.match(PLACEHOLDER);
	if (left) {
		throw new Error(`Unresolved placeholders in ${fileHint}: ${left.join(', ')}`);
	}
}
