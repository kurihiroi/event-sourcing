import { describe, expect, it } from "vitest";
import { isLeft, isRight, right } from "../monad";
import type { DomainEvent, EventHandler, EventMetadata } from "../types";
import { appendNode, createTree } from "./tree";
import { goTo, redo, undo } from "./undo-redo";

type TodoState = { readonly title: string; readonly done: boolean };

type TodoEvent = DomainEvent<string, Record<string, unknown>>;

const mkMeta = (
	id: string,
	userId = "user-1",
	timestamp = 1000,
): EventMetadata => ({
	id,
	timestamp,
	userId,
	version: 0,
});

const mkEvent = (
	type: string,
	payload: Record<string, unknown>,
	id: string,
	userId = "user-1",
): TodoEvent => ({
	type,
	payload,
	metadata: mkMeta(id, userId),
});

const handler: EventHandler<TodoState, TodoEvent> = (state, event) => {
	switch (event.type) {
		case "TodoCreated":
			return right({
				title: event.payload.title as string,
				done: false,
			});
		case "TodoCompleted":
			return right({ ...state, done: true });
		case "TitleChanged":
			return right({ ...state, title: event.payload.title as string });
		default:
			return right(state);
	}
};

const initialState: TodoState = { title: "", done: false };

describe("undo", () => {
	it("headのイベントを取り消す", () => {
		const e1 = mkEvent("TodoCreated", { title: "Buy milk" }, "e1");
		const e2 = mkEvent("TitleChanged", { title: "Buy eggs" }, "e2");

		let tree = createTree(e1);
		const r1 = appendNode(tree, e2);
		if (!isRight(r1)) return;
		tree = r1.right;

		const stateBeforeHead: TodoState = { title: "Buy milk", done: false };
		const currentState: TodoState = { title: "Buy eggs", done: false };
		const compMeta = mkMeta("comp-1", "user-1", 2000);

		const result = undo(tree, currentState, stateBeforeHead, compMeta);
		expect(isRight(result)).toBe(true);
		if (isRight(result)) {
			expect(result.right.state).toEqual({ title: "Buy milk", done: false });
			expect(result.right.compensatingEvent.compensatesId).toBe("e2");
			expect(result.right.compensatingEvent.type).toBe(
				"Compensate:TitleChanged",
			);
		}
	});

	it("rootノードではundoできない", () => {
		const e1 = mkEvent("TodoCreated", { title: "Buy milk" }, "e1");
		const tree = createTree(e1);

		const result = undo(
			tree,
			{ title: "Buy milk", done: false },
			initialState,
			mkMeta("comp-1"),
		);
		expect(isLeft(result)).toBe(true);
	});
});

describe("redo", () => {
	it("指定ノードのイベントを再適用する", () => {
		const e1 = mkEvent("TodoCreated", { title: "Buy milk" }, "e1");
		const e2 = mkEvent("TodoCompleted", {}, "e2");

		let tree = createTree(e1);
		const r1 = appendNode(tree, e2);
		if (!isRight(r1)) return;
		tree = r1.right;

		// headをe1に戻す
		const state: TodoState = { title: "Buy milk", done: false };

		const result = redo({ ...tree, headId: "e1" }, state, "e2", handler);
		expect(isRight(result)).toBe(true);
		if (isRight(result)) {
			expect(result.right.state.done).toBe(true);
			expect(result.right.tree.headId).toBe("e2");
		}
	});

	it("存在しないノードでLeftを返す", () => {
		const tree = createTree(mkEvent("TodoCreated", { title: "test" }, "e1"));
		const result = redo(tree, initialState, "non-existent", handler);
		expect(isLeft(result)).toBe(true);
	});
});

describe("goTo", () => {
	it("指定ノードまで状態を再構築する", () => {
		const e1 = mkEvent("TodoCreated", { title: "Buy milk" }, "e1");
		const e2 = mkEvent("TitleChanged", { title: "Buy eggs" }, "e2");
		const e3 = mkEvent("TodoCompleted", {}, "e3");

		let tree = createTree(e1);
		const r1 = appendNode(tree, e2);
		if (!isRight(r1)) return;
		tree = r1.right;
		const r2 = appendNode(tree, e3);
		if (!isRight(r2)) return;
		tree = r2.right;

		// e2の時点の状態に戻る
		const result = goTo(tree, initialState, "e2", handler);
		expect(isRight(result)).toBe(true);
		if (isRight(result)) {
			expect(result.right.state).toEqual({ title: "Buy eggs", done: false });
			expect(result.right.tree.headId).toBe("e2");
		}
	});

	it("rootまで戻れる", () => {
		const e1 = mkEvent("TodoCreated", { title: "Buy milk" }, "e1");
		const e2 = mkEvent("TodoCompleted", {}, "e2");

		let tree = createTree(e1);
		const r1 = appendNode(tree, e2);
		if (!isRight(r1)) return;
		tree = r1.right;

		const result = goTo(tree, initialState, "e1", handler);
		expect(isRight(result)).toBe(true);
		if (isRight(result)) {
			expect(result.right.state).toEqual({ title: "Buy milk", done: false });
			expect(result.right.tree.headId).toBe("e1");
		}
	});

	it("存在しないノードでLeftを返す", () => {
		const tree = createTree(mkEvent("TodoCreated", { title: "test" }, "e1"));
		const result = goTo(tree, initialState, "non-existent", handler);
		expect(isLeft(result)).toBe(true);
	});
});
