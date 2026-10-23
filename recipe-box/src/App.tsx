import { BrowserRouter, HashRouter, Link, NavLink, Route, Routes } from 'react-router-dom'
import { FloppyDisk, House, Plus, Tag } from '@phosphor-icons/react'
import { isNativeApp } from './lib/apiBase'
import { DataProvider } from './hooks/useData'
import { BackupPage } from './pages/BackupPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { HomePage } from './pages/HomePage'
import { GeneratePage } from './pages/GeneratePage'
import { ImportPage } from './pages/ImportPage'
import { RecipeDetailPage } from './pages/RecipeDetailPage'
import { RecipeEditPage } from './pages/RecipeEditPage'
import { EmptyState } from './components/EmptyState'

function Shell() {
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
        <Link to="/recipes/new" className="btn btn--primary topbar__new">
          <Plus aria-hidden="true" weight="bold" />
          New
        </Link>
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
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/ai" element={<GeneratePage />} />
          <Route path="/recipes/new" element={<RecipeEditPage />} />
          <Route path="/recipes/:id" element={<RecipeDetailPage />} />
          <Route path="/recipes/:id/edit" element={<RecipeEditPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/backup" element={<BackupPage />} />
          <Route
            path="*"
            element={
              <EmptyState
                title="Page not found"
                action={
                  <Link to="/" className="btn">
                    Back to recipes
                  </Link>
                }
              />
            }
          />
        </Routes>
      </main>
    </>
  )
}

export default function App() {
  // The app's local web server cannot be assumed to fall back to index.html for deep links, so it routes by hash instead.
  const Router = isNativeApp() ? HashRouter : BrowserRouter
  return (
    <Router>
      <DataProvider>
        <Shell />
      </DataProvider>
    </Router>
  )
}
