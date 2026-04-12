export type CommandMap = Record<string, unknown>;
export type EventMap = Record<string, unknown>;

export type Unsubscribe = () => void;

export interface ShardwireLogger {
  debug?: (message: string, meta?: Record<string, unknown>) => void;
  info?: (message: string, meta?: Record<string, unknown>) => void;
  warn?: (message: string, meta?: Record<string, unknown>) => void;
  error?: (message: string, meta?: Record<string, unknown>) => void;
}

export interface DiscordClientLike {
  login(token: string): Promise<string>;
  destroy(): void;
  once(event: "ready", listener: () => void): void;
  on(event: "ready", listener: () => void): void;
  off(event: "ready", listener: () => void): void;
}

export interface CommandContext {
  requestId: string;
  receivedAt: number;
  connectionId: string;
  source?: string;
}

export interface EventMeta {
  ts: number;
  source?: string;
}

export interface CommandSuccess<T = unknown> {
  ok: true;
  requestId: string;
  ts: number;
  data: T;
}

export interface CommandFailure {
  ok: false;
  requestId: string;
  ts: number;
  error: {
    code:
      | "AUTH_ERROR"
      | "TIMEOUT"
      | "COMMAND_NOT_FOUND"
      | "VALIDATION_ERROR"
      | "INTERNAL_ERROR";
    message: string;
    details?: unknown;
  };
}

export type CommandResult<T = unknown> = CommandSuccess<T> | CommandFailure;

export interface HostOptions<C extends CommandMap, E extends EventMap> {
  client?: DiscordClientLike;
  token?: string;
  server: {
    port: number;
    host?: string;
    secret: string;
    path?: string;
    heartbeatMs?: number;
    commandTimeoutMs?: number;
    maxPayloadBytes?: number;
    corsOrigins?: string[];
  };
  name?: string;
  logger?: ShardwireLogger;
}

export interface ConsumerOptions<C extends CommandMap, E extends EventMap> {
  url: string;
  secret: string;
  webSocketFactory?: (url: string) => {
    readyState: number;
    send(data: string): void;
    close(code?: number, reason?: string): void;
    on(event: "open" | "message" | "close" | "error", listener: (...args: any[]) => void): void;
    once(event: "close", listener: () => void): void;
  };
  reconnect?: {
    enabled?: boolean;
    initialDelayMs?: number;
    maxDelayMs?: number;
    jitter?: boolean;
  };
  requestTimeoutMs?: number;
  logger?: ShardwireLogger;
}

export interface HostShardwire<C extends CommandMap, E extends EventMap> {
  mode: "host";
  onCommand<K extends keyof C & string>(
    name: K,
    handler: (payload: C[K], ctx: CommandContext) => Promise<unknown> | unknown,
  ): Unsubscribe;
  emitEvent<K extends keyof E & string>(name: K, payload: E[K]): void;
  broadcast<K extends keyof E & string>(name: K, payload: E[K]): void;
  close(): Promise<void>;
}

export interface ConsumerShardwire<C extends CommandMap, E extends EventMap> {
  mode: "consumer";
  send<K extends keyof C & string>(
    name: K,
    payload: C[K],
    options?: { timeoutMs?: number; requestId?: string },
  ): Promise<CommandResult>;
  on<K extends keyof E & string>(
    name: K,
    handler: (payload: E[K], meta: EventMeta) => void,
  ): Unsubscribe;
  off<K extends keyof E & string>(
    name: K,
    handler: (payload: E[K], meta: EventMeta) => void,
  ): void;
  connected(): boolean;
  close(): Promise<void>;
}

export interface CreateShardwire {
  <C extends CommandMap = {}, E extends EventMap = {}>(
    options: HostOptions<C, E>,
  ): HostShardwire<C, E>;
  <C extends CommandMap = {}, E extends EventMap = {}>(
    options: ConsumerOptions<C, E>,
  ): ConsumerShardwire<C, E>;
}
