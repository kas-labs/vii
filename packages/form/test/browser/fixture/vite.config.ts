import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const formRoot = path.resolve(__dirname, "../../../");
const coreRoot = path.resolve(__dirname, "../../../../../packages/core");

export default {
  root: __dirname,
  server: {
    port: 4173,
    strictPort: true,
    host: "127.0.0.1",
  },
  resolve: {
    alias: {
      "@vii-labs/core": path.resolve(coreRoot, "src/index.ts"),
      "@vii-labs/form/vanilla": path.resolve(formRoot, "src/adapters/vanilla/index.ts"),
      "@vii-labs/form/react": path.resolve(formRoot, "src/adapters/react/index.ts"),
      "@vii-labs/form": path.resolve(formRoot, "src/index.ts"),
    },
  },
  esbuild: {
    jsx: "automatic",
  },
};
