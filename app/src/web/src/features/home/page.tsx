import { ModuleLayout } from '@carbonnt-cyacle/web-base'
import { Link } from '@tanstack/react-router'

export function AppHomePage() {
  return (
    <ModuleLayout>
      <h1 className='text-4xl font-bold'>Welcome to Vine Start</h1>
      <p className='mt-4 text-lg'>
        Edit <code>app/src/web/src</code> to customize the app shell.
      </p>

      <div className='mt-4 text-lg '>Domains</div>
      <ul className='list-inside list-disc'>
        <li>
          <Link to='/uic/user/profile' className='text-blue-500 hover:underline'>
            UIC User Profile
          </Link>
        </li>
      </ul>
    </ModuleLayout>
  )
}
