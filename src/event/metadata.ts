import { z } from "zod";
import { type Either, left, right } from "../monad";
import type { EventMetadata } from "../types";

// ====== Zod Schema ======

export const eventMetadataSchema = z.object({
	id: z.string().min(1),
	timestamp: z.number().int().positive(),
	userId: z.string().min(1),
	version: z.number().int().nonnegative(),
});

// ====== Factory ======

export const createMetadata = (
	params: Omit<EventMetadata, "version"> & { readonly version?: number },
): EventMetadata => ({
	id: params.id,
	timestamp: params.timestamp,
	userId: params.userId,
	version: params.version ?? 0,
});

// ====== Validation ======

export const validateMetadata = (
	input: unknown,
): Either<Error, EventMetadata> => {
	const result = eventMetadataSchema.safeParse(input);
	if (result.success) {
		return right(result.data);
	}
	return left(new Error(result.error.message));
};
