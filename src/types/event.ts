import type { z } from "zod";
import type { Either } from "../monad";

// ====== Event Metadata ======

export interface EventMetadata {
	readonly id: string;
	readonly timestamp: number;
	readonly userId: string;
	readonly version: number;
}

// ====== Domain Event ======

export interface DomainEvent<T extends string = string, P = unknown> {
	readonly type: T;
	readonly payload: P;
	readonly metadata: EventMetadata;
}

// ====== Compensating Event ======

export interface CompensatingEvent<T extends string = string, P = unknown>
	extends DomainEvent<T, P> {
	readonly compensatesId: string;
}

// ====== Event Definition ======

export interface EventDefinition<T extends string = string, P = unknown> {
	readonly type: T;
	readonly schema: z.ZodType<P>;
}

// ====== Event Handler ======

export type EventHandler<S, E extends DomainEvent = DomainEvent> = (
	state: S,
	event: E,
) => Either<Error, S>;
