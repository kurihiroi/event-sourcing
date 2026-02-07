import type { LWWRegister, LWWValue } from "../types";

// ====== LWW Resolution ======

/**
 * 2つのLWW値を比較し、勝者を返す。
 * タイムスタンプが大きい方が勝ち。同一の場合はuserIdの辞書順で決定。
 */
export const resolveLWW = <T>(a: LWWValue<T>, b: LWWValue<T>): LWWValue<T> => {
	if (a.timestamp > b.timestamp) return a;
	if (b.timestamp > a.timestamp) return b;
	return a.userId >= b.userId ? a : b;
};

// ====== Register Merge ======

/**
 * 2つのLWWRegisterをプロパティ単位でマージする。
 */
export const mergeLWWRegisters = <T extends Record<string, unknown>>(
	a: LWWRegister<T>,
	b: LWWRegister<T>,
): LWWRegister<T> => {
	const keys = new Set([...Object.keys(a), ...Object.keys(b)]);

	const merged = {} as Record<string, LWWValue>;

	for (const key of keys) {
		const aVal = (a as Record<string, LWWValue | undefined>)[key];
		const bVal = (b as Record<string, LWWValue | undefined>)[key];

		if (aVal && bVal) {
			merged[key] = resolveLWW(aVal, bVal);
		} else if (aVal) {
			merged[key] = aVal;
		} else if (bVal) {
			merged[key] = bVal;
		}
	}

	return merged as LWWRegister<T>;
};

// ====== Materialize ======

/**
 * LWWRegisterから現在の値を取り出す（LWWValue → 生の値）。
 */
export const materialize = <T extends Record<string, unknown>>(
	register: LWWRegister<T>,
): T => {
	const result = {} as Record<string, unknown>;

	for (const [key, lwv] of Object.entries(register)) {
		result[key] = (lwv as LWWValue).value;
	}

	return result as T;
};
