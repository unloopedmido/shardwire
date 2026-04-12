import type { ShardwireLogger } from "../core/types";

export function withLogger(logger?: ShardwireLogger): Required<ShardwireLogger> {
  return {
    debug: logger?.debug ?? (() => undefined),
    info: logger?.info ?? (() => undefined),
    warn: logger?.warn ?? (() => undefined),
    error: logger?.error ?? (() => undefined),
  };
}
