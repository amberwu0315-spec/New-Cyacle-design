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
      switchWorkspace: 'Switch workspace',
      logout: 'Log out',
    },
    profileBootstrap: {
      errorTitle: 'Unable to verify your sign-in status',
      errorDescription: 'The system could not retrieve your account information. To protect workspace data, access is paused for now.',
      actionHint: 'Try reloading first. If the issue continues, sign in again before entering the workspace.',
      retry: 'Reload',
      logout: 'Sign in again',
    },
  },
  workspace: {
    title: 'Choose workspace',
    description: 'Choose the workspace to enter. The app stays locked until one is selected.',
    loading: 'Loading available workspaces',
    emptyTitle: 'No available workspaces',
    emptyDescription: 'This account does not have access to a workspace. Contact an administrator.',
    retry: 'Reload',
    current: 'Current workspace',
    personal: 'Personal workspace',
    organization: 'Organization workspace',
    switchFailed: 'Failed to switch workspace. Please try again.',
  },
  nav: {
    categories: {
      businessApps: 'Business Apps',
    },
  },
} satisfies Messages['common']
