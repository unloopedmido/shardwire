import type { WebSocket } from "ws";
import type { CommandContext } from "../core/types";

export interface HostConnectionState {
  id: string;
  socket: WebSocket;
  authenticated: boolean;
  lastHeartbeatAt: number;
  clientName?: string;
}

export type CommandHandler = (
  payload: unknown,
  context: CommandContext,
) => Promise<unknown> | unknown;
