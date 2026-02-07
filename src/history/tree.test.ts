import { describe, expect, it } from "vitest";
import { isLeft, isRight } from "../monad";
import type { DomainEvent } from "../types";
import {
	appendNode,
	createTree,
	getAncestorsByUser,
	getPathToNode,
	moveHead,
} from "./tree";

const mkEvent = (id: string, userId = "user-1"): DomainEvent => ({
	type: "TestEvent",
	payload: { id },
	metadata: { id, timestamp: Date.now(), userId, version: 0 },
});

describe("createTree", () => {
	it("初期イベントで木を作成する", () => {
		const event = mkEvent("e1");
		const tree = createTree(event);

		expect(tree.rootId).toBe("e1");
		expect(tree.headId).toBe("e1");
		expect(tree.nodes.size).toBe(1);

		const node = tree.nodes.get("e1");
		expect(node?.event).toBe(event);
		expect(node?.parentId).toBeNull();
		expect(node?.childIds).toEqual([]);
	});
});

describe("appendNode", () => {
	it("headに子ノードを追加し、headを移動する", () => {
		const tree = createTree(mkEvent("e1"));
		const result = appendNode(tree, mkEvent("e2"));

		expect(isRight(result)).toBe(true);
		if (isRight(result)) {
			const t = result.right;
			expect(t.headId).toBe("e2");
			expect(t.nodes.size).toBe(2);

			const parent = t.nodes.get("e1");
			expect(parent?.childIds).toEqual(["e2"]);

			const child = t.nodes.get("e2");
			expect(child?.parentId).toBe("e1");
		}
	});

	it("分岐を作成できる", () => {
		const tree = createTree(mkEvent("e1"));
		const r1 = appendNode(tree, mkEvent("e2"));
		expect(isRight(r1)).toBe(true);
		if (!isRight(r1)) return;

		// headをrootに戻して分岐
		const moved = moveHead(r1.right, "e1");
		expect(isRight(moved)).toBe(true);
		if (!isRight(moved)) return;

		const r2 = appendNode(moved.right, mkEvent("e3"));
		expect(isRight(r2)).toBe(true);
		if (isRight(r2)) {
			const root = r2.right.nodes.get("e1");
			expect(root?.childIds).toEqual(["e2", "e3"]);
			expect(r2.right.headId).toBe("e3");
		}
	});
});

describe("getPathToNode", () => {
	it("rootから指定ノードまでのパスを返す", () => {
		let tree = createTree(mkEvent("e1"));
		const r1 = appendNode(tree, mkEvent("e2"));
		if (!isRight(r1)) return;
		tree = r1.right;

		const r2 = appendNode(tree, mkEvent("e3"));
		if (!isRight(r2)) return;
		tree = r2.right;

		const path = getPathToNode(tree, "e3");
		expect(isRight(path)).toBe(true);
		if (isRight(path)) {
			expect(path.right).toEqual(["e1", "e2", "e3"]);
		}
	});

	it("存在しないノードでLeftを返す", () => {
		const tree = createTree(mkEvent("e1"));
		const result = getPathToNode(tree, "non-existent");
		expect(isLeft(result)).toBe(true);
	});
});

describe("moveHead", () => {
	it("headを指定ノードに移動する", () => {
		const tree = createTree(mkEvent("e1"));
		const r1 = appendNode(tree, mkEvent("e2"));
		if (!isRight(r1)) return;

		const result = moveHead(r1.right, "e1");
		expect(isRight(result)).toBe(true);
		if (isRight(result)) {
			expect(result.right.headId).toBe("e1");
		}
	});

	it("存在しないノードでLeftを返す", () => {
		const tree = createTree(mkEvent("e1"));
		const result = moveHead(tree, "non-existent");
		expect(isLeft(result)).toBe(true);
	});
});

describe("getAncestorsByUser", () => {
	it("指定ユーザーのイベントのみを返す", () => {
		let tree = createTree(mkEvent("e1", "alice"));
		const r1 = appendNode(tree, mkEvent("e2", "bob"));
		if (!isRight(r1)) return;
		tree = r1.right;

		const r2 = appendNode(tree, mkEvent("e3", "alice"));
		if (!isRight(r2)) return;
		tree = r2.right;

		const result = getAncestorsByUser(tree, "e3", "alice");
		expect(isRight(result)).toBe(true);
		if (isRight(result)) {
			expect(result.right).toHaveLength(2);
			expect(result.right[0]?.metadata.id).toBe("e1");
			expect(result.right[1]?.metadata.id).toBe("e3");
		}
	});

	it("一致するユーザーがいない場合は空配列を返す", () => {
		const tree = createTree(mkEvent("e1", "alice"));
		const result = getAncestorsByUser(tree, "e1", "unknown");
		expect(isRight(result)).toBe(true);
		if (isRight(result)) {
			expect(result.right).toHaveLength(0);
		}
	});
});
