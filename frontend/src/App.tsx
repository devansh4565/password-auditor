import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import Shell from './components/Shell'
import Analyzer from './pages/Analyzer'

const Attack = lazy(() => import('./pages/Attack'))
const Hashing = lazy(() => import('./pages/Hashing'))
const Rainbow = lazy(() => import('./pages/Rainbow'))
const Audit = lazy(() => import('./pages/Audit'))
const Generator = lazy(() => import('./pages/Generator'))
const ML = lazy(() => import('./pages/ML'))

const fallback = <div className="py-20 text-center font-mono text-sm text-steel">loading…</div>
const wrap = (el: React.ReactNode) => <Suspense fallback={fallback}>{el}</Suspense>

const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <Analyzer /> },
      { path: 'attack', element: wrap(<Attack />) },
      { path: 'hashing', element: wrap(<Hashing />) },
      { path: 'rainbow', element: wrap(<Rainbow />) },
      { path: 'audit', element: wrap(<Audit />) },
      { path: 'generator', element: wrap(<Generator />) },
      { path: 'ml', element: wrap(<ML />) },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
