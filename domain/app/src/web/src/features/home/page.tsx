import { useTranslation } from '../../lib/i18n'

export function AppHomePage() {
  const { t } = useTranslation()

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold">{t.home.title}</h1>
      <p className="mt-4 text-lg">
        {t.home.descriptionPrefix}
        <code className="whitespace-nowrap font-sans">plot app apply</code>
        {t.home.descriptionSuffix}
      </p>
    </div>
  )
}
