import type { RuntimeSchema, SchemaValidationIssue } from "../core/types";

export interface SafeParseResultSuccess<T> {
  success: true;
  data: T;
}

export interface SafeParseResultFailure {
  success: false;
  error: {
    message: string;
    issues?: SchemaValidationIssue[];
  };
}

export type SafeParseResult<T> = SafeParseResultSuccess<T> | SafeParseResultFailure;

export interface SafeParseSchema<T> {
  safeParse: (value: unknown) => SafeParseResult<T>;
}

export function fromSafeParseSchema<T>(schema: SafeParseSchema<T>): RuntimeSchema<T> {
  return {
    parse(value) {
      const result = schema.safeParse(value);
      if (result.success) {
        return result.data;
      }
      const error = new Error(result.error.message) as Error & { issues?: SchemaValidationIssue[] };
      if (result.error.issues) {
        error.issues = result.error.issues;
      }
      throw error;
    },
  };
}
