import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: "南昌大学生存手册",
  url: "https://book.ncuos.com",
  baseUrl: "/",
  future: {
    v4: true,
    experimental_faster: true,
  },
  onBrokenLinks: "warn",
  favicon: "img/favicon.ico",
  trailingSlash: false,
  organizationName: "NCUHOME",
  projectName: "ncubook",
  tagline: "南昌大学生存手册 | For NCUer",
  i18n: {
    defaultLocale: "zh-Hans",
    locales: ["zh-Hans"],
  },
  presets: [
    [
      "classic",
      {
        docs: {
          editUrl: "https://github.com/NCUHOME/ncubook/tree/main",
          routeBasePath: "/",
          sidebarPath: "./sidebars.ts",
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],
  markdown: {
    mermaid: true,
    mdx1Compat: {
      comments: false,
      admonitions: false,
      headingIds: true,
    },
  },
  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    image: "img/social-card.jpg",
    docs: {
      versionPersistence: "localStorage",
      sidebar: {
        hideable: false,
        autoCollapseCategories: true,
      },
    },
    navbar: {
      title: "南昌大学生存手册",
      logo: {
        alt: "图标",
        src: "img/logo.svg",
      },
      items: [
        {
          href: "https://github.com/NCUHOME/ncubook",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "文档",
          items: [
            {
              label: "首页",
              to: "/",
            },
          ],
        },
        {
          title: "社群",
          items: [
            {
              label: "南昌大学2025官方新生群",
              href: "https://qm.qq.com/q/h7FonOyE0g",
            },
            {
              label: "2025家园工作室招新群",
              href: "https://hr-qq-group.ncuos.com",
            },
          ],
        },
        {
          title: "更多",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/NCUHOME/ncubook",
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} 南昌大学生存手册.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
  themes: [
    "@docusaurus/theme-mermaid",
    [
      require.resolve("@easyops-cn/docusaurus-search-local"),
      /** @type {import("@easyops-cn/docusaurus-search-local").PluginOptions} */
      {
        indexBlog: false,
        docsRouteBasePath: "/",
        hashed: true,
        language: ["en", "zh"],
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
      },
    ],
  ],
  stylesheets: ["js/katex.min.css"],
};

export default config;
