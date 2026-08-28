import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://viijs.org",
  output: "static",
  integrations: [
    starlight({
      title: "Vii",
      customCss: ["./src/styles/starlight.css"],
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/kas-labs/vii",
        },
      ],
      sidebar: [
        {
          label: "Documentation",
          items: [{ autogenerate: { directory: "docs" } }],
        },
      ],
    }),
  ],
});
