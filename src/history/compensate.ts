import { type Either, right } from "../monad";
import type { CompensatingEvent, DomainEvent, EventMetadata } from "../types";

// ====== diffStates ======

/**
 * 2つの状態のdiffを計算し、変更されたキーと新旧の値を返す。
 */
export const diffStates = <S extends Record<string, unknown>>(
	oldState: S,
	newState: S,
): ReadonlyArray<{
	readonly key: string;
	readonly oldValue: unknown;
	readonly newValue: unknown;
}> => {
	const keys = new Set([...Object.keys(oldState), ...Object.keys(newState)]);
	const diffs: Array<{
		readonly key: string;
		readonly oldValue: unknown;
		readonly newValue: unknown;
	}> = [];

	for (const key of keys) {
		const oldVal = oldState[key];
		const newVal = newState[key];
		if (oldVal !== newVal) {
			diffs.push({ key, oldValue: oldVal, newValue: newVal });
		}
	}

	return diffs;
};

// ====== compensate ======

/**
 * 指定イベントの効果を打ち消す補償イベントを生成する。
 * oldState: イベント適用前の状態, newState: イベント適用後の状態
 */
export const compensate = <S extends Record<string, unknown>>(
	event: DomainEvent,
	oldState: S,
	newState: S,
	metadata: EventMetadata,
): Either<Error, CompensatingEvent> => {
	const diffs = diffStates(oldState, newState);

	const reversePayload: Record<string, unknown> = {};
	for (const diff of diffs) {
		reversePayload[diff.key] = diff.oldValue;
	}

	const compensatingEvent: CompensatingEvent = {
		type: `Compensate:${event.type}`,
		payload: reversePayload,
		metadata,
		compensatesId: event.metadata.id,
	};

	return right(compensatingEvent);
};
