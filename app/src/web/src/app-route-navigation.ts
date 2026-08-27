import {
  ensurePermissions,
  fetchOrganizationProfile,
  getSelectedWorkspaceScope,
} from '@carbonnt-cyacle/web-uic/pub'

import { adminHomeTo } from '#/admin/admin-config.ts'
import { getAppEdition } from '#/app-edition.ts'
import { appPermissionCodes } from '#/app-permissions.ts'
import {
  createConfiguredAppNavConfig,
  resolveAppEditionHomeTo,
} from '#/components/layouts/app-layout/app-nav-config.ts'
import { resolveSystemEntryHomeTo } from '#/system-entry.ts'
import { webModules } from '#/vineModules.gen.ts'

const DEFAULT_APP_HOME_TO = '/project/projects'

export async function resolveDefaultSystemHomeTo() {
  const appEdition = getAppEdition()
  const appEditionHomeTo = resolveAppEditionHomeTo(webModules, appEdition)
  let frontendHomeTo = DEFAULT_APP_HOME_TO

  try {
    const permissionCodeMap = await ensurePermissions({
      codes: appPermissionCodes,
      suppressGlobalToast: true,
      workspaceScope: getSelectedWorkspaceScope(),
    })
    const navConfig = createConfiguredAppNavConfig(
      webModules,
      { permissionCodeMap },
      appEdition,
    )
    const hasDefaultSystemHome = navConfig.scenes.some((scene) =>
      scene.groups.some((group) =>
        group.items.some((item) => item.to === DEFAULT_APP_HOME_TO),
      ),
    )
    frontendHomeTo = hasDefaultSystemHome
      ? DEFAULT_APP_HOME_TO
      : (navConfig.scenes[0]?.defaultTo ?? appEditionHomeTo)
  } catch {
    // 权限加载失败时沿用默认入口，具体页面仍由权限守卫处理。
  }

  try {
    const organizationProfile = await fetchOrganizationProfile({
      suppressGlobalToast: true,
    })
    return resolveSystemEntryHomeTo({
      adminHomeTo,
      businessCodes: organizationProfile?.businessCodes,
      frontendHomeTo,
    })
  } catch {
    return frontendHomeTo
  }
}
