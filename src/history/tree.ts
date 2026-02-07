import { type Either, left, right } from "../monad";
import type { DomainEvent, HistoryNode, HistoryTree } from "../types";

// ====== createTree ======

/**
 * 初期イベントで新しい履歴木を作成する。
 */
export const createTree = <E extends DomainEvent>(event: E): HistoryTree<E> => {
	const node: HistoryNode<E> = {
		id: event.metadata.id,
		event,
		parentId: null,
		childIds: [],
	};

	return {
		nodes: new Map([[node.id, node]]),
		rootId: node.id,
		headId: node.id,
	};
};

// ====== appendNode ======

/**
 * 現在のheadに新しいイベントノードを追加し、headを移動する。
 */
export const appendNode = <E extends DomainEvent>(
	tree: HistoryTree<E>,
	event: E,
): Either<Error, HistoryTree<E>> => {
	const parentId = tree.headId;
	const parent = tree.nodes.get(parentId);

	if (!parent) {
		return left(new Error(`Parent node not found: ${parentId}`));
	}

	const newNode: HistoryNode<E> = {
		id: event.metadata.id,
		event,
		parentId,
		childIds: [],
	};

	const updatedParent: HistoryNode<E> = {
		...parent,
		childIds: [...parent.childIds, newNode.id],
	};

	const newNodes = new Map(tree.nodes);
	newNodes.set(parentId, updatedParent);
	newNodes.set(newNode.id, newNode);

	return right({
		nodes: newNodes,
		rootId: tree.rootId,
		headId: newNode.id,
	});
};

// ====== getPathToNode ======

/**
 * rootから指定ノードまでのパス（ノードIDの配列）を返す。
 */
export const getPathToNode = <E extends DomainEvent>(
	tree: HistoryTree<E>,
	nodeId: string,
): Either<Error, ReadonlyArray<string>> => {
	const path: string[] = [];
	let currentId: string | null = nodeId;

	while (currentId !== null) {
		const node = tree.nodes.get(currentId);
		if (!node) {
			return left(new Error(`Node not found: ${currentId}`));
		}
		path.unshift(currentId);
		currentId = node.parentId;
	}

	return right(path);
};

// ====== moveHead ======

/**
 * headを指定ノードに移動する。
 */
export const moveHead = <E extends DomainEvent>(
	tree: HistoryTree<E>,
	nodeId: string,
): Either<Error, HistoryTree<E>> => {
	if (!tree.nodes.has(nodeId)) {
		return left(new Error(`Node not found: ${nodeId}`));
	}

	return right({
		...tree,
		headId: nodeId,
	});
};

// ====== getAncestorsByUser ======

/**
 * 指定ノードから遡り、特定ユーザーのイベントのみを返す。
 */
export const getAncestorsByUser = <E extends DomainEvent>(
	tree: HistoryTree<E>,
	nodeId: string,
	userId: string,
): Either<Error, ReadonlyArray<E>> => {
	const events: E[] = [];
	let currentId: string | null = nodeId;

	while (currentId !== null) {
		const node = tree.nodes.get(currentId);
		if (!node) {
			return left(new Error(`Node not found: ${currentId}`));
		}
		if (node.event.metadata.userId === userId) {
			events.unshift(node.event);
		}
		currentId = node.parentId;
	}

	return right(events);
};
