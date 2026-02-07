import { describe, expect, it } from "vitest";
import { isLeft, isRight, left, right } from "../monad";
import type { DomainEvent, EventHandler, EventMetadata } from "../types";
import { apply } from "./apply";

type TodoState = { readonly title: string; readonly done: boolean };

type TodoCreated = DomainEvent<"TodoCreated", { readonly title: string }>;
type TodoCompleted = DomainEvent<"TodoCompleted", Record<string, never>>;

const meta: EventMetadata = {
	id: "evt-1",
	timestamp: 1000,
	userId: "user-1",
	version: 0,
};

describe("apply", () => {
	const handler: EventHandler<TodoState, TodoCreated> = (state, event) =>
		right({ ...state, title: event.payload.title });

	it("初期状態にイベントを適用できる", () => {
		const state: TodoState = { title: "", done: false };
		const event: TodoCreated = {
			type: "TodoCreated",
			payload: { title: "Buy milk" },
			metadata: meta,
		};

		const result = apply(state, event, handler);
		expect(isRight(result)).toBe(true);
		if (isRight(result)) {
			expect(result.right).toEqual({ title: "Buy milk", done: false });
		}
	});

	it("イミュータビリティを保つ（元の状態は変更されない）", () => {
		const state: TodoState = { title: "original", done: false };
		const event: TodoCreated = {
			type: "TodoCreated",
			payload: { title: "updated" },
			metadata: meta,
		};

		apply(state, event, handler);
		expect(state.title).toBe("original");
	});

	it("ハンドラがLeftを返した場合はLeftになる", () => {
		const failHandler: EventHandler<TodoState, TodoCompleted> = () =>
			left(new Error("cannot complete"));

		const state: TodoState = { title: "test", done: false };
		const event: TodoCompleted = {
			type: "TodoCompleted",
			payload: {},
			metadata: meta,
		};

		const result = apply(state, event, failHandler);
		expect(isLeft(result)).toBe(true);
		if (isLeft(result)) {
			expect(result.left.message).toBe("cannot complete");
		}
	});

	it("ハンドラが例外をthrowした場合はLeft(Error)になる", () => {
		const throwHandler: EventHandler<TodoState, TodoCreated> = () => {
			throw new Error("unexpected error");
		};

		const state: TodoState = { title: "", done: false };
		const event: TodoCreated = {
			type: "TodoCreated",
			payload: { title: "test" },
			metadata: meta,
		};

		const result = apply(state, event, throwHandler);
		expect(isLeft(result)).toBe(true);
		if (isLeft(result)) {
			expect(result.left.message).toBe("unexpected error");
		}
	});
});
