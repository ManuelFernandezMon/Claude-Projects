import { Outlet, RouterProvider, ScrollRestoration, createBrowserRouter, createHashRouter, type RouteObject } from 'react-router-dom'
import { Link, NavLink } from './lib/nav'
import { FloppyDisk, House, Plus, Tag } from '@phosphor-icons/react'
import { isNativeApp } from './lib/apiBase'
import { DataProvider } from './hooks/useData'
import { useAndroidBack } from './hooks/useAndroidBack'
import { AiEditPage } from './pages/AiEditPage'
import { BackupPage } from './pages/BackupPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { HomePage } from './pages/HomePage'
import { GeneratePage } from './pages/GeneratePage'
import { ImportPage } from './pages/ImportPage'
import { RecipeDetailPage } from './pages/RecipeDetailPage'
import { RecipeEditPage } from './pages/RecipeEditPage'
import { EmptyState } from './components/EmptyState'
import { ThemeToggle } from './components/ThemeToggle'
import { ToastHost } from './components/ToastHost'

function Shell() {
  useAndroidBack()
  return (
    <>
      <a
        href="#main"
        className="skip"
        onClick={(e) => {
          // A plain #main link would change the URL, which collides with hash routing inside the Android app.
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
      >
        Skip to content
      </a>
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand__mark" aria-hidden="true" />
          recipe-box
        </Link>
        <div className="topbar__actions">
          <ThemeToggle />
          <Link to="/recipes/new" className="btn btn--primary topbar__new">
            <Plus aria-hidden="true" weight="bold" />
            New
          </Link>
        </div>
      </header>
      <nav className="nav" aria-label="Main">
        <NavLink to="/" end>
          <House aria-hidden="true" />
          Recipes
        </NavLink>
        <NavLink to="/categories">
          <Tag aria-hidden="true" />
          Categories
        </NavLink>
        <NavLink to="/backup">
          <FloppyDisk aria-hidden="true" />
          Backup
        </NavLink>
      </nav>
      <main id="main" className="main" tabIndex={-1}>
        <Outlet />
      </main>
      <ToastHost />
      <ScrollRestoration />
    </>
  )
}

function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      action={
        <Link to="/" className="btn">
          Back to recipes
        </Link>
      }
    />
  )
}

function Root() {
  return (
    <DataProvider>
      <Shell />
    </DataProvider>
  )
}

const routes: RouteObject[] = [
  {
    element: <Root />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/import', element: <ImportPage /> },
      { path: '/ai', element: <GeneratePage /> },
      { path: '/recipes/new', element: <RecipeEditPage /> },
      { path: '/recipes/:id', element: <RecipeDetailPage /> },
      { path: '/recipes/:id/edit', element: <RecipeEditPage /> },
      { path: '/recipes/:id/ai', element: <AiEditPage /> },
      { path: '/categories', element: <CategoriesPage /> },
      { path: '/backup', element: <BackupPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]

// The app's local web server cannot be assumed to fall back to index.html for deep links, so it routes by hash instead.
// A data router (rather than <BrowserRouter>) is what lets navigations run as view transitions.
const router = isNativeApp() ? createHashRouter(routes) : createBrowserRouter(routes)

export default function App() {
  return <RouterProvider router={router} />
}
