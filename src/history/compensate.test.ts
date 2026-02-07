import { describe, expect, it } from "vitest";
import { isRight } from "../monad";
import type { DomainEvent, EventMetadata } from "../types";
import { compensate, diffStates } from "./compensate";

describe("diffStates", () => {
	it("変更されたプロパティを検出する", () => {
		const oldState = { title: "old", done: false, count: 1 };
		const newState = { title: "new", done: false, count: 1 };

		const diffs = diffStates(oldState, newState);
		expect(diffs).toEqual([{ key: "title", oldValue: "old", newValue: "new" }]);
	});

	it("複数の変更を検出する", () => {
		const oldState = { a: 1, b: 2, c: 3 };
		const newState = { a: 10, b: 2, c: 30 };

		const diffs = diffStates(oldState, newState);
		expect(diffs).toHaveLength(2);
		expect(diffs).toContainEqual({ key: "a", oldValue: 1, newValue: 10 });
		expect(diffs).toContainEqual({ key: "c", oldValue: 3, newValue: 30 });
	});

	it("変更がない場合は空配列を返す", () => {
		const state = { a: 1, b: 2 };
		const diffs = diffStates(state, state);
		expect(diffs).toEqual([]);
	});

	it("新しいプロパティの追加を検出する", () => {
		const oldState = { a: 1 } as Record<string, unknown>;
		const newState = { a: 1, b: 2 } as Record<string, unknown>;

		const diffs = diffStates(oldState, newState);
		expect(diffs).toEqual([{ key: "b", oldValue: undefined, newValue: 2 }]);
	});
});

describe("compensate", () => {
	const meta: EventMetadata = {
		id: "comp-1",
		timestamp: 2000,
		userId: "user-1",
		version: 1,
	};

	const event: DomainEvent = {
		type: "TitleChanged",
		payload: { title: "new" },
		metadata: {
			id: "evt-1",
			timestamp: 1000,
			userId: "user-1",
			version: 0,
		},
	};

	it("補償イベントを生成する（undo）", () => {
		const oldState = { title: "old", done: false };
		const newState = { title: "new", done: false };

		const result = compensate(event, oldState, newState, meta);
		expect(isRight(result)).toBe(true);
		if (isRight(result)) {
			const comp = result.right;
			expect(comp.type).toBe("Compensate:TitleChanged");
			expect(comp.compensatesId).toBe("evt-1");
			expect(comp.payload).toEqual({ title: "old" });
			expect(comp.metadata).toBe(meta);
		}
	});

	it("変更がない場合でも補償イベントを生成する", () => {
		const state = { title: "same", done: false };
		const result = compensate(event, state, state, meta);
		expect(isRight(result)).toBe(true);
		if (isRight(result)) {
			expect(result.right.payload).toEqual({});
		}
	});
});
