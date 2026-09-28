import type { Messages } from '../zh-CN'

export const layout = {
  account: {
    openAdmin: 'Open Admin Console',
  },
  admin: {
    account: {
      contextLabel: 'Admin Console',
      fallbackName: 'Admin account',
      logout: 'Log out',
      menu: 'Admin account menu',
      openFrontend: 'Open Frontend',
    },
    brandAriaLabel: 'Admin Console',
  },
  navCategories: {
    basis: 'Foundation',
    accounting: 'Accounting',
    assetsCompliance: 'Assets & Compliance',
    filing: 'Filing',
    management: 'Management',
    dashboard: 'Dashboard',
    platform: 'Platform',
    account: 'Account',
  },
} satisfies Messages['layout']
