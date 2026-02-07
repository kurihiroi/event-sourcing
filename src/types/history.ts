import type { DomainEvent } from "./event";

// ====== History Node ======

export interface HistoryNode<E extends DomainEvent = DomainEvent> {
	readonly id: string;
	readonly event: E;
	readonly parentId: string | null;
	readonly childIds: ReadonlyArray<string>;
}

// ====== History Tree ======

export interface HistoryTree<E extends DomainEvent = DomainEvent> {
	readonly nodes: ReadonlyMap<string, HistoryNode<E>>;
	readonly rootId: string;
	readonly headId: string;
}

// ====== Undo/Redo Options ======

export interface UndoRedoOptions {
	readonly userId?: string;
}
