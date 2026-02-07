import { type Either, left, tryCatch } from "../monad";
import type { DomainEvent, EventHandler } from "../types";

// ====== apply ======

/**
 * イベントをハンドラ経由で状態に適用する。
 * ハンドラが例外をthrowした場合もLeft(Error)として返す。
 */
export const apply = <S, E extends DomainEvent>(
	state: S,
	event: E,
	handler: EventHandler<S, E>,
): Either<Error, S> => {
	const tried = tryCatch(() => handler(state, event));
	if (tried._tag === "Left") {
		return tried;
	}
	const result = tried.right;
	if (result._tag === "Left") {
		return left(result.left);
	}
	return result;
};
