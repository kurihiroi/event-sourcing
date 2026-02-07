import { describe, expect, it } from "vitest";
import { isRight, left, right } from "../monad";
import type { DomainEvent, EventHandler, EventMetadata } from "../types";
import { replay, sortEvents } from "./replay";

type Counter = { readonly count: number };

const mkMeta = (id: string, timestamp: number): EventMetadata => ({
	id,
	timestamp,
	userId: "user-1",
	version: 0,
});

const mkEvent = (
	id: string,
	amount: number,
	timestamp: number,
): DomainEvent => ({
	type: "Incremented",
	payload: { amount },
	metadata: mkMeta(id, timestamp),
});

describe("sortEvents", () => {
	it("タイムスタンプ順にソートする", () => {
		const events = [
			mkEvent("e3", 3, 300),
			mkEvent("e1", 1, 100),
			mkEvent("e2", 2, 200),
		];

		const sorted = sortEvents(events);
		expect(sorted[0]?.metadata.id).toBe("e1");
		expect(sorted[1]?.metadata.id).toBe("e2");
		expect(sorted[2]?.metadata.id).toBe("e3");
	});

	it("同一タイムスタンプの場合はIDの辞書順でソートする", () => {
		const events = [
			mkEvent("b", 2, 100),
			mkEvent("a", 1, 100),
			mkEvent("c", 3, 100),
		];

		const sorted = sortEvents(events);
		expect(sorted[0]?.metadata.id).toBe("a");
		expect(sorted[1]?.metadata.id).toBe("b");
		expect(sorted[2]?.metadata.id).toBe("c");
	});

	it("元の配列を変更しない", () => {
		const events = [mkEvent("e2", 2, 200), mkEvent("e1", 1, 100)];
		sortEvents(events);
		expect(events[0]?.metadata.id).toBe("e2");
	});
});

describe("replay", () => {
	const handler: EventHandler<Counter, DomainEvent> = (state, event) =>
		right({
			count: state.count + (event.payload as { amount: number }).amount,
		});

	it("イベント列から状態を再構築する", () => {
		const events = [
			mkEvent("e1", 1, 100),
			mkEvent("e2", 2, 200),
			mkEvent("e3", 3, 300),
		];

		const result = replay({ count: 0 }, events, handler);
		expect(isRight(result)).toBe(true);
		if (isRight(result)) {
			expect(result.right.state.count).toBe(6);
			expect(result.right.appliedEvents).toHaveLength(3);
			expect(result.right.failedEvents).toHaveLength(0);
		}
	});

	it("順不同のイベントもタイムスタンプ順で適用する", () => {
		const events = [
			mkEvent("e3", 3, 300),
			mkEvent("e1", 1, 100),
			mkEvent("e2", 2, 200),
		];

		const result = replay({ count: 0 }, events, handler);
		expect(isRight(result)).toBe(true);
		if (isRight(result)) {
			expect(result.right.state.count).toBe(6);
		}
	});

	it("失敗したイベントをスキップして記録する", () => {
		const failingHandler: EventHandler<Counter, DomainEvent> = (
			state,
			event,
		) => {
			if ((event.payload as { amount: number }).amount < 0) {
				return left(new Error("Negative amount"));
			}
			return right({
				count: state.count + (event.payload as { amount: number }).amount,
			});
		};

		const events = [
			mkEvent("e1", 1, 100),
			mkEvent("e2", -1, 200),
			mkEvent("e3", 3, 300),
		];

		const result = replay({ count: 0 }, events, failingHandler);
		expect(isRight(result)).toBe(true);
		if (isRight(result)) {
			expect(result.right.state.count).toBe(4);
			expect(result.right.appliedEvents).toHaveLength(2);
			expect(result.right.failedEvents).toHaveLength(1);
			expect(result.right.failedEvents[0]?.error.message).toBe(
				"Negative amount",
			);
		}
	});

	it("空のイベント列では初期状態を返す", () => {
		const result = replay({ count: 0 }, [], handler);
		expect(isRight(result)).toBe(true);
		if (isRight(result)) {
			expect(result.right.state.count).toBe(0);
			expect(result.right.appliedEvents).toHaveLength(0);
		}
	});
});
