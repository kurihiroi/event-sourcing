import { type Either, flatMap, right } from "../monad";
import { apply } from "../state/apply";
import type { DomainEvent, EventHandler } from "../types";

// ====== pipe ======

/**
 * 複数のイベント+ハンドラのペアを順番に適用する。
 * いずれかがLeftを返した時点で短絡して返す。
 */
export const pipe = <S>(
	initialState: S,
	steps: ReadonlyArray<{
		readonly event: DomainEvent;
		readonly handler: EventHandler<S, DomainEvent>;
	}>,
): Either<Error, S> => {
	let result: Either<Error, S> = right(initialState);

	for (const step of steps) {
		result = flatMap(result, (state) => apply(state, step.event, step.handler));
	}

	return result;
};

// ====== liftHandler ======

/**
 * 特定のイベント型のハンドラを汎用DomainEventハンドラに持ち上げる。
 * イベントのtypeが一致しない場合は状態をそのまま返す。
 */
export const liftHandler =
	<S, E extends DomainEvent>(
		eventType: E["type"],
		handler: EventHandler<S, E>,
	): EventHandler<S, DomainEvent> =>
	(state, event) => {
		if (event.type === eventType) {
			return handler(state, event as E);
		}
		return right(state);
	};
