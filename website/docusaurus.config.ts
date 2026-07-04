import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const GITHUB_REPO = 'https://github.com/Memnoc/remote-org-chart-plugin';
const APP_URL = 'https://remote-org-chart-plugin.onrender.com';

const config: Config = {
  title: 'Remote Org Chart',
  tagline: 'Interactive org hierarchies built on the Remote API',
  favicon: 'img/logo.svg',

  future: {
    v4: true,
  },

  // Hosted on GitHub Pages: https://memnoc.github.io/remote-org-chart-plugin/
  url: 'https://memnoc.github.io',
  baseUrl: '/remote-org-chart-plugin/',

  organizationName: 'Memnoc',
  projectName: 'remote-org-chart-plugin',

  // Cross-doc links are curated by hand; warn rather than fail the build.
  onBrokenLinks: 'warn',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/', // docs live at /docs/<id>, not /docs/docs/<id>
          editUrl: `${GITHUB_REPO}/tree/main/website/`,
          // Leftover scaffold pages we don't own — kept out of the build.
          exclude: ['tutorial-basics/**', 'tutorial-extras/**'],
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Remote Org Chart',
      logo: {
        alt: 'Remote Org Chart',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: APP_URL,
          label: 'Open App',
          position: 'right',
        },
        {
          href: GITHUB_REPO,
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {label: 'Overview', to: '/overview'},
            {label: 'Features', to: '/features'},
            {label: 'Architecture', to: '/architecture'},
            {label: 'Decisions', to: '/decisions'},
          ],
        },
        {
          title: 'Project',
          items: [
            {label: 'Live App', href: APP_URL},
            {label: 'GitHub', href: GITHUB_REPO},
          ],
        },
      ],
      copyright: `Remote Org Chart — built for the Sr. Solution Architect assignment. © ${new Date().getFullYear()}.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
