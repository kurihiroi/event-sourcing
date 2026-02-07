import type { DomainEvent } from "./event";

// ====== LWW (Last-Write-Wins) ======

export interface LWWValue<T = unknown> {
	readonly value: T;
	readonly timestamp: number;
	readonly userId: string;
}

export type LWWRegister<T extends Record<string, unknown>> = {
	readonly [K in keyof T]: LWWValue<T[K]>;
};

// ====== Snapshot ======

export interface Snapshot<S> {
	readonly state: S;
	readonly version: number;
	readonly timestamp: number;
}

// ====== Replay Result ======

export interface ReplayResult<S> {
	readonly state: S;
	readonly appliedEvents: ReadonlyArray<DomainEvent>;
	readonly failedEvents: ReadonlyArray<{
		readonly event: DomainEvent;
		readonly error: Error;
	}>;
}
