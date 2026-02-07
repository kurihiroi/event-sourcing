import { describe, expect, it } from "vitest";
import { z } from "zod";
import { isLeft, isRight } from "../monad";
import { defineEvent, safeCreateEvent } from "./define-event";

describe("defineEvent", () => {
	const schema = z.object({ title: z.string() });
	const definition = defineEvent("TodoCreated", schema);

	it("EventDefinitionを生成する", () => {
		expect(definition.type).toBe("TodoCreated");
		expect(definition.schema).toBe(schema);
	});
});

describe("safeCreateEvent", () => {
	const schema = z.object({ title: z.string() });
	const definition = defineEvent("TodoCreated", schema);

	const validMetadata = {
		id: "evt-1",
		timestamp: 1000,
		userId: "user-1",
		version: 0,
	};

	it("有効な入力でDomainEventを生成する", () => {
		const result = safeCreateEvent(
			definition,
			{ title: "Buy milk" },
			validMetadata,
		);
		expect(isRight(result)).toBe(true);
		if (isRight(result)) {
			expect(result.right.type).toBe("TodoCreated");
			expect(result.right.payload).toEqual({ title: "Buy milk" });
			expect(result.right.metadata).toEqual(validMetadata);
		}
	});

	it("無効なメタデータでLeftを返す", () => {
		const result = safeCreateEvent(
			definition,
			{ title: "Buy milk" },
			{ id: "", timestamp: -1 },
		);
		expect(isLeft(result)).toBe(true);
	});

	it("無効なペイロードでLeftを返す", () => {
		const result = safeCreateEvent(definition, { title: 123 }, validMetadata);
		expect(isLeft(result)).toBe(true);
	});

	it("メタデータのバリデーションが先に実行される", () => {
		const result = safeCreateEvent(definition, { title: 123 }, { id: "" });
		expect(isLeft(result)).toBe(true);
	});
});
