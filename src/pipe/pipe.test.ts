import { describe, expect, it } from "vitest";
import { isLeft, isRight, left, right } from "../monad";
import type { DomainEvent, EventHandler, EventMetadata } from "../types";
import { liftHandler, pipe } from "./pipe";

type Counter = { readonly count: number };
type Incremented = DomainEvent<"Incremented", { readonly amount: number }>;
type Decremented = DomainEvent<"Decremented", { readonly amount: number }>;

const meta: EventMetadata = {
	id: "evt-1",
	timestamp: 1000,
	userId: "user-1",
	version: 0,
};

const incHandler: EventHandler<Counter, Incremented> = (state, event) =>
	right({ count: state.count + event.payload.amount });

const decHandler: EventHandler<Counter, Decremented> = (state, event) =>
	right({ count: state.count - event.payload.amount });

describe("pipe", () => {
	it("複数のイベントを順番に適用する", () => {
		const lifted = liftHandler("Incremented", incHandler);
		const events: DomainEvent[] = [
			{ type: "Incremented", payload: { amount: 1 }, metadata: meta },
			{ type: "Incremented", payload: { amount: 2 }, metadata: meta },
			{ type: "Incremented", payload: { amount: 3 }, metadata: meta },
		];

		const result = pipe(
			{ count: 0 },
			events.map((event) => ({ event, handler: lifted })),
		);

		expect(isRight(result)).toBe(true);
		if (isRight(result)) {
			expect(result.right.count).toBe(6);
		}
	});

	it("空のステップ配列では初期状態を返す", () => {
		const result = pipe({ count: 0 }, []);
		expect(isRight(result)).toBe(true);
		if (isRight(result)) {
			expect(result.right.count).toBe(0);
		}
	});

	it("途中でLeftになると短絡評価する", () => {
		const failHandler: EventHandler<Counter, DomainEvent> = () =>
			left(new Error("fail"));

		const lifted = liftHandler("Incremented", incHandler);

		const result = pipe({ count: 0 }, [
			{
				event: { type: "Incremented", payload: { amount: 1 }, metadata: meta },
				handler: lifted,
			},
			{
				event: { type: "Fail", payload: {}, metadata: meta },
				handler: failHandler,
			},
			{
				event: { type: "Incremented", payload: { amount: 10 }, metadata: meta },
				handler: lifted,
			},
		]);

		expect(isLeft(result)).toBe(true);
	});
});

describe("liftHandler", () => {
	it("イベント型が一致する場合はハンドラを適用する", () => {
		const lifted = liftHandler("Incremented", incHandler);
		const event: Incremented = {
			type: "Incremented",
			payload: { amount: 5 },
			metadata: meta,
		};

		const result = lifted({ count: 0 }, event);
		expect(isRight(result)).toBe(true);
		if (isRight(result)) {
			expect(result.right.count).toBe(5);
		}
	});

	it("イベント型が一致しない場合は状態をそのまま返す", () => {
		const lifted = liftHandler("Incremented", incHandler);
		const event: Decremented = {
			type: "Decremented",
			payload: { amount: 5 },
			metadata: meta,
		};

		const result = lifted({ count: 10 }, event);
		expect(isRight(result)).toBe(true);
		if (isRight(result)) {
			expect(result.right.count).toBe(10);
		}
	});

	it("複数のliftedハンドラを組み合わせられる", () => {
		const liftedInc = liftHandler("Incremented", incHandler);
		const liftedDec = liftHandler("Decremented", decHandler);

		const combinedHandler: EventHandler<Counter, DomainEvent> = (
			state,
			event,
		) => {
			const r1 = liftedInc(state, event);
			if (r1._tag === "Left") return r1;
			return liftedDec(r1.right, event);
		};

		const incEvent: DomainEvent = {
			type: "Incremented",
			payload: { amount: 10 },
			metadata: meta,
		};
		const decEvent: DomainEvent = {
			type: "Decremented",
			payload: { amount: 3 },
			metadata: meta,
		};

		const r1 = combinedHandler({ count: 0 }, incEvent);
		expect(isRight(r1)).toBe(true);
		if (isRight(r1)) {
			expect(r1.right.count).toBe(10);
		}

		const r2 = combinedHandler({ count: 10 }, decEvent);
		expect(isRight(r2)).toBe(true);
		if (isRight(r2)) {
			expect(r2.right.count).toBe(7);
		}
	});
});
