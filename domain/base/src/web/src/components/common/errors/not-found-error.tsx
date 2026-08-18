import { Button } from '#/components/ui/button.tsx'
import { ModuleLayout } from '#/components/layouts/module-layout/module-layout.tsx'

export interface NotFoundErrorProps {
  description: string
  goBackLabel: string
  onGoBack: () => void
  onReturnHome: () => void
  returnHomeLabel: string
  title: string
}

export function NotFoundError({
  description,
  goBackLabel,
  onGoBack,
  onReturnHome,
  returnHomeLabel,
  title,
}: NotFoundErrorProps) {
  return (
    <ModuleLayout className='flex min-h-svh items-center justify-center bg-background px-6 py-12'>
      <main className='mx-auto flex w-full max-w-md flex-col items-center text-center'>
        <div className='text-[6.5rem] leading-none font-black tracking-normal text-foreground sm:text-[7.25rem]'>
          404
        </div>
        <h1 className='mt-8 text-lg leading-6 font-semibold text-foreground'>
          {title}
        </h1>
        <p className='mt-4 max-w-72 text-sm leading-6 font-medium text-muted-foreground'>
          {description}
        </p>
        <div className='mt-8 flex flex-wrap items-center justify-center gap-3'>
          <Button type='button' variant='outline' onClick={onGoBack}>
            {goBackLabel}
          </Button>
          <Button type='button' onClick={onReturnHome}>
            {returnHomeLabel}
          </Button>
        </div>
      </main>
    </ModuleLayout>
  )
}
