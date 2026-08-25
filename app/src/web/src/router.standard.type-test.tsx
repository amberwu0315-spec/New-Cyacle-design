import type { LinkProps } from '@tanstack/react-router'

import { router } from './router.ts'

if (true) {
  const projectLink = {
    to: '/project/projects/$projectId/$projectType',
    params: { projectId: 'project-1', projectType: 'CFP' },
  } satisfies LinkProps<
    'a',
    typeof router,
    string,
    '/project/projects/$projectId/$projectType'
  >

  const adminUserLink = {
    to: '/admin/users/$userId',
    params: { userId: 'user-1' },
  } satisfies LinkProps<'a', typeof router, string, '/admin/users/$userId'>

  const invalidProjectParams = {
    to: '/project/projects/$projectId/$projectType',
    // @ts-expect-error projectType is required by the project detail route.
    params: { projectId: 'project-1' },
  } satisfies LinkProps<
    'a',
    typeof router,
    string,
    '/project/projects/$projectId/$projectType'
  >

  const missingLink = {
    // @ts-expect-error The final app Router rejects unregistered paths.
    to: '/project/missing',
  } satisfies LinkProps<'a', typeof router, string, '/project/missing'>

  type AppRoutePath = keyof typeof router.routesByPath
  type AssertFalse<T extends false> = T
  const routePathIsNotBroadString: AssertFalse<
    string extends AppRoutePath ? true : false
  > = false

  void projectLink
  void adminUserLink
  void invalidProjectParams
  void missingLink
  void routePathIsNotBroadString
}
