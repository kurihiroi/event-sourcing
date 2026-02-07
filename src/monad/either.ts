// ====== Types ======

export interface Left<out L> {
	readonly _tag: "Left";
	readonly left: L;
}

export interface Right<out R> {
	readonly _tag: "Right";
	readonly right: R;
}

export type Either<L, R> = Left<L> | Right<R>;

// ====== Constructors ======

export const left = <L>(value: L): Either<L, never> => ({
	_tag: "Left",
	left: value,
});

export const right = <R>(value: R): Either<never, R> => ({
	_tag: "Right",
	right: value,
});

// ====== Type Guards ======

export const isLeft = <L, R>(either: Either<L, R>): either is Left<L> =>
	either._tag === "Left";

export const isRight = <L, R>(either: Either<L, R>): either is Right<R> =>
	either._tag === "Right";

// ====== Transformations ======

export const map = <L, R, B>(
	either: Either<L, R>,
	f: (a: R) => B,
): Either<L, B> => (isRight(either) ? right(f(either.right)) : either);

export const flatMap = <L, R, L2, B>(
	either: Either<L, R>,
	f: (a: R) => Either<L2, B>,
): Either<L | L2, B> => (isRight(either) ? f(either.right) : either);

// ====== Pattern Matching ======

export const match = <L, R, A, B>(
	either: Either<L, R>,
	handlers: {
		readonly onLeft: (left: L) => A;
		readonly onRight: (right: R) => B;
	},
): A | B =>
	isLeft(either)
		? handlers.onLeft(either.left)
		: handlers.onRight(either.right);

// ====== Utility Constructors ======

export const tryCatch = <R>(f: () => R): Either<Error, R> => {
	try {
		return right(f());
	} catch (e) {
		return left(e instanceof Error ? e : new Error(String(e)));
	}
};

export const fromNullable = <L, R>(
	value: R | null | undefined,
	onNull: () => L,
): Either<L, NonNullable<R>> =>
	value != null ? right(value as NonNullable<R>) : left(onNull());

// ====== Do Notation ======

export const Do = right({});

export const bind = <L, R, L2, K extends string, B>(
	either: Either<L, R>,
	name: K,
	f: (ctx: R) => Either<L2, B>,
): Either<L | L2, R & { readonly [P in K]: B }> =>
	flatMap(either, (ctx) =>
		map(f(ctx), (value) => {
			const record = ctx as Record<string, unknown>;
			return { ...record, [name]: value } as R & {
				readonly [P in K]: B;
			};
		}),
	);
