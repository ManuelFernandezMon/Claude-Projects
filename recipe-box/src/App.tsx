import { BrowserRouter, Link, NavLink, Route, Routes } from 'react-router-dom'
import { DataProvider } from './hooks/useData'
import { BackupPage } from './pages/BackupPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { HomePage } from './pages/HomePage'
import { RecipeDetailPage } from './pages/RecipeDetailPage'
import { RecipeEditPage } from './pages/RecipeEditPage'
import { EmptyState } from './components/EmptyState'

function Shell() {
  return (
    <>
      <a href="#main" className="skip">
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
      <main id="main" className="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
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
  return (
    <BrowserRouter>
      <DataProvider>
        <Shell />
      </DataProvider>
    </BrowserRouter>
  )
}
