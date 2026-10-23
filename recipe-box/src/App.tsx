import { BrowserRouter, HashRouter, Link, NavLink, Route, Routes } from 'react-router-dom'
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
          <span className="brand__prompt" aria-hidden="true">
            &gt;_
          </span>
          recipe-box
        </Link>
        <nav className="nav" aria-label="Main">
          <NavLink to="/" end>
            Recipes
          </NavLink>
          <NavLink to="/categories">Categories</NavLink>
          <NavLink to="/backup">Backup</NavLink>
        </nav>
        <Link to="/recipes/new" className="btn btn--primary topbar__new">
          + New
        </Link>
      </header>
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
