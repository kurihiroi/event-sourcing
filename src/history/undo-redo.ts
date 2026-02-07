import { type Either, flatMap, left, right } from "../monad";
import { apply } from "../state/apply";
import type {
	CompensatingEvent,
	DomainEvent,
	EventHandler,
	EventMetadata,
	HistoryTree,
} from "../types";
import { compensate } from "./compensate";
import { appendNode, getPathToNode, moveHead } from "./tree";

// ====== Result Types ======

interface UndoResult<S, E extends DomainEvent = DomainEvent> {
	readonly state: S;
	readonly tree: HistoryTree<E>;
	readonly compensatingEvent: CompensatingEvent;
}

interface RedoResult<S, E extends DomainEvent = DomainEvent> {
	readonly state: S;
	readonly tree: HistoryTree<E>;
}

interface GoToResult<S, E extends DomainEvent = DomainEvent> {
	readonly state: S;
	readonly tree: HistoryTree<E>;
}

// ====== undo ======

/**
 * 現在のheadのイベントを取り消す。
 * headの親に戻り、補償イベントを生成して木に追加する。
 */
export const undo = <S extends Record<string, unknown>, E extends DomainEvent>(
	tree: HistoryTree<E>,
	currentState: S,
	stateBeforeHead: S,
	metadata: EventMetadata,
): Either<Error, UndoResult<S, E>> => {
	const headNode = tree.nodes.get(tree.headId);
	if (!headNode) {
		return left(new Error(`Head node not found: ${tree.headId}`));
	}
	if (headNode.parentId === null) {
		return left(new Error("Cannot undo: already at root"));
	}

	return flatMap(
		compensate(headNode.event, stateBeforeHead, currentState, metadata),
		(compEvent) => {
			const compAsDomainEvent = compEvent as unknown as E;
			return flatMap(appendNode(tree, compAsDomainEvent), (updatedTree) =>
				right({
					state: stateBeforeHead,
					tree: updatedTree,
					compensatingEvent: compEvent,
				}),
			);
		},
	);
};

// ====== redo ======

/**
 * 指定されたイベントを再適用する。
 * headから子ノードを辿って再適用し、headを進める。
 */
export const redo = <S, E extends DomainEvent>(
	tree: HistoryTree<E>,
	currentState: S,
	targetNodeId: string,
	handler: EventHandler<S, E>,
): Either<Error, RedoResult<S, E>> => {
	const targetNode = tree.nodes.get(targetNodeId);
	if (!targetNode) {
		return left(new Error(`Target node not found: ${targetNodeId}`));
	}

	return flatMap(apply(currentState, targetNode.event, handler), (newState) =>
		flatMap(moveHead(tree, targetNodeId), (updatedTree) =>
			right({
				state: newState,
				tree: updatedTree,
			}),
		),
	);
};

// ====== goTo ======

/**
 * 指定ノードまで状態を再構築する。
 * rootから対象ノードまでのパスを辿り、順番にイベントを適用する。
 */
export const goTo = <S, E extends DomainEvent>(
	tree: HistoryTree<E>,
	initialState: S,
	targetNodeId: string,
	handler: EventHandler<S, E>,
): Either<Error, GoToResult<S, E>> =>
	flatMap(getPathToNode(tree, targetNodeId), (path) => {
		let state: Either<Error, S> = right(initialState);

		for (const nodeId of path) {
			const node = tree.nodes.get(nodeId);
			if (!node) {
				return left(new Error(`Node not found: ${nodeId}`));
			}
			state = flatMap(state, (s) => apply(s, node.event, handler));
		}

		return flatMap(state, (s) =>
			flatMap(moveHead(tree, targetNodeId), (updatedTree) =>
				right({
					state: s,
					tree: updatedTree,
				}),
			),
		);
	});
