import type { z } from "zod";
import { type Either, left, right } from "../monad";
import type { DomainEvent, EventDefinition, EventMetadata } from "../types";
import { validateMetadata } from "./metadata";

// ====== defineEvent ======

export const defineEvent = <T extends string, P>(
	type: T,
	schema: z.ZodType<P>,
): EventDefinition<T, P> => ({
	type,
	schema,
});

// ====== safeCreateEvent ======

export const safeCreateEvent = <T extends string, P>(
	definition: EventDefinition<T, P>,
	payload: unknown,
	metadata: unknown,
): Either<Error, DomainEvent<T, P>> => {
	const metaResult = validateMetadata(metadata);
	if (metaResult._tag === "Left") {
		return metaResult;
	}

	const payloadResult = definition.schema.safeParse(payload);
	if (!payloadResult.success) {
		return left(new Error(payloadResult.error.message));
	}

	return right({
		type: definition.type,
		payload: payloadResult.data,
		metadata: metaResult.right as EventMetadata,
	});
};
