import { ModuleLayout } from '@carbonnt-cyacle/web-base'
import { Link } from '@tanstack/react-router'

import { useTranslation } from '#/lib/i18n/index.ts'

export function AppHomePage() {
  const { t } = useTranslation()

  return (
    <ModuleLayout>
      <h1 className='text-4xl font-bold'>{t.home.title}</h1>
      <p className='mt-4 text-lg'>
        {t.home.descriptionPrefix}
        <code>{t.home.descriptionPath}</code>
        {t.home.descriptionSuffix}
      </p>

      <div className='mt-4 text-lg'>{t.home.domainsTitle}</div>
      <ul className='list-inside list-disc'>
        <li>
          <Link to='/uic/user/profile' className='text-blue-500 hover:underline'>
            {t.home.uicProfileLink}
          </Link>
        </li>
      </ul>
    </ModuleLayout>
  )
}
