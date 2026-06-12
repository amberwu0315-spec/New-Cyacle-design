import type { Messages } from '../zh-CN'

export const common = {
  actions: {
    cancel: 'Cancel',
    reset: 'Reset',
    save: 'Save',
  },
  language: {
    current: 'Current language: {language}',
    names: {
      'zh-CN': '中文',
      'en-US': 'English',
    },
  },
  shell: {
    sidebar: {
      brandName: 'Cyacle',
      homeLink: 'Back to home',
      scenePickerLabel: 'Current scene: {label}',
      resizeLabel: 'Resize sidebar',
      resizeHint: 'Drag to resize. Double-click to restore the default width.',
    },
    topbar: {
      openSidebar: 'Open sidebar',
      expandSidebar: 'Expand sidebar',
      collapseSidebar: 'Collapse sidebar',
    },
    account: {
      menu: 'Account menu',
      logout: 'Log out',
    },
  },
  nav: {
    categories: {
      businessApps: 'Business Apps',
    },
  },
} satisfies Messages['common']
