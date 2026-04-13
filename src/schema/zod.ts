import type { RuntimeSchema, SchemaValidationIssue } from "../core/types";
import { fromSafeParseSchema } from "./index";
import type { ZodType } from "zod";

function normalizeZodPath(path: ReadonlyArray<PropertyKey>): string {
  if (path.length === 0) {
    return "";
  }
  return path
    .filter((segment): segment is string | number => typeof segment === "string" || typeof segment === "number")
    .map((segment) => String(segment))
    .join(".");
}

export function fromZodSchema<T>(schema: ZodType<T>): RuntimeSchema<T> {
  return fromSafeParseSchema<T>({
    safeParse(value) {
      const result = schema.safeParse(value);
      if (result.success) {
        return { success: true, data: result.data };
      }
      const issues: SchemaValidationIssue[] = result.error.issues.map((issue) => ({
        path: normalizeZodPath(issue.path),
        message: issue.message,
      }));
      return {
        success: false,
        error: {
          message: "Schema validation failed.",
          issues,
        },
      };
    },
  });
}
