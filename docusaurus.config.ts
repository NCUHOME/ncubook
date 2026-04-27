import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: "此间",
  url: "https://book.ncuos.com",
  baseUrl: "/",
  future: {
    v4: true,
    experimental_faster: false,
  },
  onBrokenLinks: "warn",
  favicon: "img/logo.svg",
  trailingSlash: false,
  organizationName: "NCUHOME",
  projectName: "ncubook",
  tagline: "把信息、经验和提问放到一起",
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
          routeBasePath: "/docs",
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
      title: "此间",
      items: [
        {
          to: '/docs/onboarding/',
          position: 'left',
          label: '新生',
        },
        {
          to: '/docs/academics/',
          position: 'left',
          label: '学业',
        },
        {
          to: '/docs/campus-life/',
          position: 'left',
          label: '生活',
        },
        {
          to: '/docs/career/',
          position: 'left',
          label: '发展',
        },
        {
          to: '/moment',
          label: '此刻',
          position: 'left',
        },
        {
          to: '/xiaojiayuan',
          label: '小家园',
          position: 'left',
        },
        {
          to: '/docs/contributors/',
          label: '共建',
          position: 'left',
        },
        {
          type: 'search',
          position: 'right',
        },
      ],
    },
    footer: {
      links: [
        {
          title: "栏目",
          items: [
            { label: "新生", to: "/docs/onboarding/" },
            { label: "学业", to: "/docs/academics/" },
            { label: "生活", to: "/docs/campus-life/" },
            { label: "发展", to: "/docs/career/" },
            { label: "此刻", to: "/moment" },
            { label: "共建", to: "/docs/contributors/" },
          ],
        },
        {
          title: "项目",
          items: [
            { label: "关于此间", to: "/docs/about" },
            { label: "参与共建", to: "/docs/contributors/contributing" },
          ],
        },
        {
          title: "说明",
          items: [
            { label: "南大家园", href: "https://github.com/NCUHOME" },
          ],
        },
      ],
      copyright: `让信息回到真实，也回到人。由 ${new Date().getFullYear()} 南大家园维护。`,
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
        docsRouteBasePath: "/docs",
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
