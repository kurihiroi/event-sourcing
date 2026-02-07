import { describe, expect, it } from "vitest";
import {
	Do,
	type Either,
	bind,
	flatMap,
	fromNullable,
	isLeft,
	isRight,
	left,
	map,
	match,
	right,
	tryCatch,
} from "./either";

describe("Either", () => {
	// ====== Constructors ======

	describe("left", () => {
		it("Left値を生成する", () => {
			const result = left("error");
			expect(result).toEqual({ _tag: "Left", left: "error" });
		});
	});

	describe("right", () => {
		it("Right値を生成する", () => {
			const result = right(42);
			expect(result).toEqual({ _tag: "Right", right: 42 });
		});
	});

	// ====== Type Guards ======

	describe("isLeft", () => {
		it("Left値に対してtrueを返す", () => {
			expect(isLeft(left("error"))).toBe(true);
		});

		it("Right値に対してfalseを返す", () => {
			expect(isLeft(right(42))).toBe(false);
		});
	});

	describe("isRight", () => {
		it("Right値に対してtrueを返す", () => {
			expect(isRight(right(42))).toBe(true);
		});

		it("Left値に対してfalseを返す", () => {
			expect(isRight(left("error"))).toBe(false);
		});
	});

	// ====== Transformations ======

	describe("map", () => {
		it("Right値を変換する", () => {
			const result = map(right(2), (x) => x * 3);
			expect(result).toEqual(right(6));
		});

		it("Left値はそのまま素通りする", () => {
			const result = map(left("error") as Either<string, number>, (x) => x * 3);
			expect(result).toEqual(left("error"));
		});

		it("型を変換できる", () => {
			const result = map(right(42), (x) => `value: ${x}`);
			expect(result).toEqual(right("value: 42"));
		});
	});

	describe("flatMap", () => {
		it("Right値に関数を適用してEitherを返す", () => {
			const result = flatMap(right(2), (x) => right(x * 3));
			expect(result).toEqual(right(6));
		});

		it("Left値はそのまま素通りする（短絡評価）", () => {
			const result = flatMap(left("error") as Either<string, number>, (x) =>
				right(x * 3),
			);
			expect(result).toEqual(left("error"));
		});

		it("関数がLeftを返した場合はLeftになる", () => {
			const result = flatMap(right(2), () => left("failed"));
			expect(result).toEqual(left("failed"));
		});

		it("チェーンできる", () => {
			const result = flatMap(
				flatMap(right(2), (x) => right(x + 3)),
				(x) => right(x * 2),
			);
			expect(result).toEqual(right(10));
		});

		it("チェーンの途中でLeftになると以降はスキップされる", () => {
			const result = flatMap(
				flatMap(right(2), () => left("stop") as Either<string, number>),
				(x) => right(x * 2),
			);
			expect(result).toEqual(left("stop"));
		});
	});

	// ====== Pattern Matching ======

	describe("match", () => {
		it("Right値にはonRightが呼ばれる", () => {
			const result = match(right(42), {
				onLeft: (e) => `error: ${e}`,
				onRight: (v) => `value: ${v}`,
			});
			expect(result).toBe("value: 42");
		});

		it("Left値にはonLeftが呼ばれる", () => {
			const result = match(left("oops"), {
				onLeft: (e) => `error: ${e}`,
				onRight: (v) => `value: ${v}`,
			});
			expect(result).toBe("error: oops");
		});

		it("異なる戻り値型を返せる", () => {
			const result = match(right(42) as Either<string, number>, {
				onLeft: () => null,
				onRight: (v) => v * 2,
			});
			expect(result).toBe(84);
		});
	});

	// ====== Utility Constructors ======

	describe("tryCatch", () => {
		it("成功時はRight値を返す", () => {
			const result = tryCatch(() => 42);
			expect(result).toEqual(right(42));
		});

		it("Errorがthrowされた場合はLeft(Error)を返す", () => {
			const result = tryCatch(() => {
				throw new Error("boom");
			});
			expect(isLeft(result)).toBe(true);
			if (isLeft(result)) {
				expect(result.left).toBeInstanceOf(Error);
				expect(result.left.message).toBe("boom");
			}
		});

		it("Error以外がthrowされた場合もLeft(Error)を返す", () => {
			const result = tryCatch(() => {
				throw "string error";
			});
			expect(isLeft(result)).toBe(true);
			if (isLeft(result)) {
				expect(result.left).toBeInstanceOf(Error);
				expect(result.left.message).toBe("string error");
			}
		});
	});

	describe("fromNullable", () => {
		it("値がある場合はRight値を返す", () => {
			const result = fromNullable(42, () => "was null");
			expect(result).toEqual(right(42));
		});

		it("nullの場合はLeft値を返す", () => {
			const result = fromNullable(null, () => "was null");
			expect(result).toEqual(left("was null"));
		});

		it("undefinedの場合はLeft値を返す", () => {
			const result = fromNullable(undefined, () => "was undefined");
			expect(result).toEqual(left("was undefined"));
		});

		it("0やfalseや空文字はRight値として扱う", () => {
			expect(fromNullable(0, () => "nope")).toEqual(right(0));
			expect(fromNullable(false, () => "nope")).toEqual(right(false));
			expect(fromNullable("", () => "nope")).toEqual(right(""));
		});
	});

	// ====== Do Notation ======

	describe("Do / bind", () => {
		it("単一のbindで値を蓄積できる", () => {
			const result = bind(Do, "x", () => right(1));
			expect(result).toEqual(right({ x: 1 }));
		});

		it("複数のbindで値を蓄積できる", () => {
			const step1 = bind(Do, "x", () => right(10));
			const step2 = bind(step1, "y", ({ x }) => right(x + 5));
			const step3 = bind(step2, "z", ({ x, y }) => right(x + y));
			expect(step3).toEqual(right({ x: 10, y: 15, z: 25 }));
		});

		it("途中でLeftになると以降のbindはスキップされる", () => {
			const step1 = bind(Do, "x", () => right(10));
			const step2 = bind(
				step1,
				"y",
				() => left("error") as Either<string, number>,
			);
			const step3 = bind(step2, "z", ({ x }) => right(x * 2));
			expect(isLeft(step3)).toBe(true);
			if (isLeft(step3)) {
				expect(step3.left).toBe("error");
			}
		});

		it("前のbindの結果を参照できる", () => {
			const result = bind(
				bind(
					bind(Do, "a", () => right(2)),
					"b",
					({ a }) => right(a * 3),
				),
				"c",
				({ a, b }) => right(a + b),
			);
			expect(result).toEqual(right({ a: 2, b: 6, c: 8 }));
		});
	});
});
