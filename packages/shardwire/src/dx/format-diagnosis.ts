import type { SecretPermissions, ShardwireAppDiagnosisIssue, ShardwireAppDiagnosisReport } from '../discord/types';

function formatPermissionList(axis: SecretPermissions['events'] | SecretPermissions['actions']): string {
	if (axis === undefined) {
		return '(none)';
	}
	if (axis === '*') {
		return '*';
	}
	if (axis.length === 0) {
		return '(none)';
	}
	return axis.join(', ');
}

/**
 * Options for {@link formatShardwireDiagnosis}.
 *
 * @see https://shardwire.js.org/docs/reference/contracts-and-diagnostics/format-shardwire-diagnosis-options/
 */
export interface FormatShardwireDiagnosisOptions {
	/** First line label (default: `Shardwire diagnosis`). */
	title?: string;
	/** When true, omit minimum-scope summary lines (default: false). */
	omitScopeSummary?: boolean;
}

function formatIssue(issue: ShardwireAppDiagnosisIssue, index: number): string {
	const lines: string[] = [];
	const head = `${index + 1}. [${issue.severity}] ${issue.code}: ${issue.message}`;
	lines.push(head);
	if (issue.remediation) {
		lines.push(`   Remediation: ${issue.remediation}`);
	}
	if (issue.context && Object.keys(issue.context).length > 0) {
		lines.push(`   Context: ${JSON.stringify(issue.context)}`);
	}
	return lines.join('\n');
}

/**
 * Returns a multi-line, human-readable summary of a {@link ShardwireAppDiagnosisReport} for logs, CI output, or
 * printing after a strict-startup failure (`ShardwireStrictStartupError`).
 *
 * @see https://shardwire.js.org/docs/reference/contracts-and-diagnostics/format-shardwire-diagnosis/
 */
export function formatShardwireDiagnosis(
	report: ShardwireAppDiagnosisReport,
	options?: FormatShardwireDiagnosisOptions,
): string {
	const title = options?.title ?? 'Shardwire diagnosis';
	const lines: string[] = [];
	lines.push(`${title}: ${report.ok ? 'ok' : 'FAILED'}`);

	if (!options?.omitScopeSummary) {
		if (report.requiredIntents.length > 0) {
			lines.push(`Required intents (manifest): ${report.requiredIntents.join(', ')}`);
		}
		lines.push(`Minimum scope events: ${formatPermissionList(report.minimumScope.events)}`);
		lines.push(`Minimum scope actions: ${formatPermissionList(report.minimumScope.actions)}`);
	}

	if (report.issues.length === 0) {
		lines.push('No issues.');
		return lines.join('\n');
	}

	lines.push('');
	const errors = report.issues.filter((i) => i.severity === 'error');
	const warnings = report.issues.filter((i) => i.severity === 'warning');
	const infos = report.issues.filter((i) => i.severity === 'info');

	let n = 0;
	if (errors.length > 0) {
		lines.push(`Errors (${errors.length}):`);
		for (const issue of errors) {
			lines.push(formatIssue(issue, n));
			n += 1;
		}
		lines.push('');
	}
	if (warnings.length > 0) {
		lines.push(`Warnings (${warnings.length}):`);
		for (const issue of warnings) {
			lines.push(formatIssue(issue, n));
			n += 1;
		}
		lines.push('');
	}
	if (infos.length > 0) {
		lines.push(`Info (${infos.length}):`);
		for (const issue of infos) {
			lines.push(formatIssue(issue, n));
			n += 1;
		}
		lines.push('');
	}

	const body = lines.join('\n');
	let end = body.length;
	while (end > 0 && body.charCodeAt(end - 1) === 10) {
		end -= 1;
	}
	return body.slice(0, end);
}
