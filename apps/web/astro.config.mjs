import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://viijs.org",
  output: "static",
  integrations: [
    starlight({
      title: "Vii",
      sidebar: [
        {
          label: "Documentation",
          items: [{ autogenerate: { directory: "docs" } }],
        },
      ],
    }),
  ],
});
