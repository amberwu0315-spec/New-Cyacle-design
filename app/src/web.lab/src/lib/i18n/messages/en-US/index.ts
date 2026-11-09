import type { Messages } from '../zh-CN'
import { home } from './home'
import { layout } from './layout'
import { notFound } from './not-found'
import { routeError } from './route-error'

export const enUS = {
  home,
  layout,
  notFound,
  routeError,
} satisfies Messages
