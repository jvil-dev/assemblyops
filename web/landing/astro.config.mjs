// astro.config.mjs - Astro build config for the AssemblyOps landing site: site URL, sitemap, self-hosted DM Sans.
// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.assemblyops.org',
  integrations: [sitemap()],
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'DM Sans',
      cssVariable: '--font-dm-sans',
      weights: [400, 500, 700],
      styles: ['normal'],
    },
  ],
});