import { resolve } from "node:path";
import dts from "vite-plugin-dts";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: ["zod"],
    },
  },
  plugins: [
    dts({
      rollupTypes: true,
    }),
  ],
});
