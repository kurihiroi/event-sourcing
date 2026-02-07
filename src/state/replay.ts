import { type Either, right } from "../monad";
import type { DomainEvent, EventHandler, ReplayResult } from "../types";
import { apply } from "./apply";

// ====== sortEvents ======

/**
 * イベントをタイムスタンプ順にソートする。
 * 同一タイムスタンプの場合はIDの辞書順で決定。
 */
export const sortEvents = <E extends DomainEvent>(
	events: ReadonlyArray<E>,
): ReadonlyArray<E> =>
	[...events].sort((a, b) => {
		const timeDiff = a.metadata.timestamp - b.metadata.timestamp;
		if (timeDiff !== 0) return timeDiff;
		return a.metadata.id.localeCompare(b.metadata.id);
	});

// ====== replay ======

/**
 * ソート済みイベント列を順番に適用し、状態を再構築する。
 * 失敗したイベントはスキップして記録し、残りは適用を続ける。
 */
export const replay = <S, E extends DomainEvent>(
	initialState: S,
	events: ReadonlyArray<E>,
	handler: EventHandler<S, E>,
): Either<Error, ReplayResult<S>> => {
	const sorted = sortEvents(events);
	let state = initialState;
	const appliedEvents: DomainEvent[] = [];
	const failedEvents: Array<{
		readonly event: DomainEvent;
		readonly error: Error;
	}> = [];

	for (const event of sorted) {
		const result = apply(state, event, handler);
		if (result._tag === "Right") {
			state = result.right;
			appliedEvents.push(event);
		} else {
			failedEvents.push({ event, error: result.left });
		}
	}

	return right({
		state,
		appliedEvents,
		failedEvents,
	});
};
