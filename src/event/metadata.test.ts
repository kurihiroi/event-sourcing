import { describe, expect, it } from "vitest";
import { isLeft, isRight } from "../monad";
import {
	createMetadata,
	eventMetadataSchema,
	validateMetadata,
} from "./metadata";

describe("metadata", () => {
	const validParams = {
		id: "evt-1",
		timestamp: 1000,
		userId: "user-1",
	} as const;

	describe("eventMetadataSchema", () => {
		it("有効なメタデータをパースできる", () => {
			const result = eventMetadataSchema.safeParse({
				id: "evt-1",
				timestamp: 1000,
				userId: "user-1",
				version: 0,
			});
			expect(result.success).toBe(true);
		});

		it("空のidを拒否する", () => {
			const result = eventMetadataSchema.safeParse({
				id: "",
				timestamp: 1000,
				userId: "user-1",
				version: 0,
			});
			expect(result.success).toBe(false);
		});

		it("負のtimestampを拒否する", () => {
			const result = eventMetadataSchema.safeParse({
				id: "evt-1",
				timestamp: -1,
				userId: "user-1",
				version: 0,
			});
			expect(result.success).toBe(false);
		});

		it("空のuserIdを拒否する", () => {
			const result = eventMetadataSchema.safeParse({
				id: "evt-1",
				timestamp: 1000,
				userId: "",
				version: 0,
			});
			expect(result.success).toBe(false);
		});
	});

	describe("createMetadata", () => {
		it("メタデータを生成する", () => {
			const meta = createMetadata(validParams);
			expect(meta).toEqual({
				id: "evt-1",
				timestamp: 1000,
				userId: "user-1",
				version: 0,
			});
		});

		it("versionを指定できる", () => {
			const meta = createMetadata({ ...validParams, version: 3 });
			expect(meta.version).toBe(3);
		});

		it("version省略時は0になる", () => {
			const meta = createMetadata(validParams);
			expect(meta.version).toBe(0);
		});
	});

	describe("validateMetadata", () => {
		it("有効なメタデータでRightを返す", () => {
			const result = validateMetadata({
				id: "evt-1",
				timestamp: 1000,
				userId: "user-1",
				version: 0,
			});
			expect(isRight(result)).toBe(true);
		});

		it("無効なメタデータでLeftを返す", () => {
			const result = validateMetadata({ id: "", timestamp: -1 });
			expect(isLeft(result)).toBe(true);
			if (isLeft(result)) {
				expect(result.left).toBeInstanceOf(Error);
			}
		});

		it("null入力でLeftを返す", () => {
			const result = validateMetadata(null);
			expect(isLeft(result)).toBe(true);
		});
	});
});
