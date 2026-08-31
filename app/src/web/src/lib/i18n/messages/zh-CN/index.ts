import { home } from './home'
import { layout } from './layout'
import { notFound } from './not-found'
import { routeError } from './route-error'

export const zhCN = {
  home,
  layout,
  notFound,
  routeError,
}

export type Messages = typeof zhCN
