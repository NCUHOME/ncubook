import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  onboardingSidebar: [
    {
      type: 'doc',
      id: 'onboarding/README',
      label: '入学指南',
    },
    'onboarding/freshmen-guide',
    'onboarding/essentials',
    'onboarding/dorm-life',
    'onboarding/campus-card',
    'onboarding/student-id',
    'onboarding/network',
  ],

  academicsSidebar: [
    {
      type: 'doc',
      id: 'academics/README',
      label: '学业',
    },
    'academics/credits-gpa',
    'academics/curriculum',
    'academics/general-courses',
    'academics/major-courses',
    'academics/exams',
    'academics/major-change',
    'academics/double-degree',
    'academics/attendance',
    'academics/english',
    'academics/sports',
    'academics/class-cadre',
  ],

  campusLifeSidebar: [
    {
      type: 'doc',
      id: 'campus-life/README',
      label: '生活',
    },
    'campus-life/dining',
    'campus-life/campus-transport',
    'campus-life/external-transport',
    'campus-life/repair',
    'campus-life/phone-directory',
    'campus-life/jiayuan-register',
    {
      type: 'category',
      label: '常用软件',
      items: [
        'campus-life/software/README',
        'campus-life/software/iNCU/README',
      ],
    },
  ],

  careerSidebar: [
    {
      type: 'doc',
      id: 'career/README',
      label: '升学与求职',
    },
    'career/postgraduate',
    'career/awards',
    'career/innovation-research',
  ],

  contributorsSidebar: [
    'contributors/README',
    'contributors/contributing',
  ],
};

export default sidebars;
