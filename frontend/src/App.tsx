import { lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';

const LandingPage = lazy(() => import('./pages/landing/index'));
const DashboardPage = lazy(() => import('./pages/dashboard/index'));
const SimulationPage = lazy(() => import('./pages/simulation/index'));
const CriticalModePage = lazy(() => import('./pages/critical/index'));
const AnalyticsPage = lazy(() => import('./pages/analytics/index'));
const ValidationPage = lazy(() => import('./pages/validation/index'));
const DataExplorerPage = lazy(() => import('./pages/data-explorer/index'));

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#020617] text-cyan-100/80">
          Loading mission control...
        </div>
      }
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
        >
          <Routes location={location}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/simulation" element={<SimulationPage />} />
            <Route path="/simulation/:eventId" element={<SimulationPage />} />
            <Route path="/critical" element={<CriticalModePage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/validation" element={<ValidationPage />} />
            <Route path="/data-explorer" element={<DataExplorerPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  );
}
