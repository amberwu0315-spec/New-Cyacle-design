import { AdminLayout } from '@carbonnt-cyacle/web-base'
import { AuthGuard } from '@carbonnt-cyacle/web-uic/pub'

import { adminNavigation } from '#/admin/admin-config.ts'

function AdminBrand() {
  return (
    <div className="flex items-center gap-3" aria-label="Admin 后台管理">
      <span className="grid size-8 grid-cols-2 gap-[3px] rounded-[3px] bg-[#116ab6] p-[5px] shadow-[0_1px_2px_rgba(17,70,120,0.22)]">
        <span className="rounded-[1px] bg-white" />
        <span className="rounded-[1px] bg-white/45" />
        <span className="rounded-[1px] bg-white/45" />
        <span className="rounded-[1px] bg-white" />
      </span>
      <span className="text-[28px] font-semibold leading-none tracking-[-0.035em] text-[#11151b]">
        Admin
      </span>
    </div>
  )
}

export function AdminAppLayout() {
  return (
    <AuthGuard>
      <AdminLayout brand={<AdminBrand />} navigation={adminNavigation} />
    </AuthGuard>
  )
}
