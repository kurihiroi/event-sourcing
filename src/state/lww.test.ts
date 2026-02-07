import { describe, expect, it } from "vitest";
import type { LWWRegister, LWWValue } from "../types";
import { materialize, mergeLWWRegisters, resolveLWW } from "./lww";

describe("resolveLWW", () => {
	it("タイムスタンプが大きい方が勝つ", () => {
		const a: LWWValue<string> = { value: "old", timestamp: 100, userId: "u1" };
		const b: LWWValue<string> = { value: "new", timestamp: 200, userId: "u2" };
		expect(resolveLWW(a, b)).toBe(b);
	});

	it("タイムスタンプが小さい方は負ける", () => {
		const a: LWWValue<string> = { value: "new", timestamp: 200, userId: "u1" };
		const b: LWWValue<string> = { value: "old", timestamp: 100, userId: "u2" };
		expect(resolveLWW(a, b)).toBe(a);
	});

	it("同一タイムスタンプ時はuserIdの辞書順で大きい方が勝つ", () => {
		const a: LWWValue<string> = {
			value: "a-val",
			timestamp: 100,
			userId: "alice",
		};
		const b: LWWValue<string> = {
			value: "b-val",
			timestamp: 100,
			userId: "bob",
		};
		expect(resolveLWW(a, b)).toBe(b);
	});

	it("完全に同一の場合はaを返す", () => {
		const a: LWWValue<string> = { value: "same", timestamp: 100, userId: "u1" };
		const b: LWWValue<string> = { value: "same", timestamp: 100, userId: "u1" };
		expect(resolveLWW(a, b)).toBe(a);
	});
});

describe("mergeLWWRegisters", () => {
	type State = { title: string; done: boolean };

	it("プロパティ単位でマージする", () => {
		const a: LWWRegister<State> = {
			title: { value: "old-title", timestamp: 100, userId: "u1" },
			done: { value: true, timestamp: 200, userId: "u1" },
		};
		const b: LWWRegister<State> = {
			title: { value: "new-title", timestamp: 200, userId: "u2" },
			done: { value: false, timestamp: 100, userId: "u2" },
		};

		const result = mergeLWWRegisters(a, b);
		expect(result.title.value).toBe("new-title");
		expect(result.done.value).toBe(true);
	});

	it("片方にしか存在しないプロパティも含める", () => {
		const a = {
			title: { value: "t", timestamp: 100, userId: "u1" },
		} as LWWRegister<State>;
		const b = {
			done: { value: true, timestamp: 100, userId: "u1" },
		} as LWWRegister<State>;

		const result = mergeLWWRegisters(a, b);
		expect(result.title.value).toBe("t");
		expect(result.done.value).toBe(true);
	});
});

describe("materialize", () => {
	type State = { title: string; count: number };

	it("LWWRegisterから値を取り出す", () => {
		const register: LWWRegister<State> = {
			title: { value: "hello", timestamp: 100, userId: "u1" },
			count: { value: 42, timestamp: 100, userId: "u1" },
		};

		const result = materialize(register);
		expect(result).toEqual({ title: "hello", count: 42 });
	});
});
