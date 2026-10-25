import { lazy, Suspense } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';

const DashboardPage = lazy(() => import('./pages/dashboard/index'));
// @ts-ignore - lazy-load the JSX simulation wrapper used by the modular simulator
const SimulationPage = lazy(() => import('./pages/simulation/index'));
const DataExplorerPage = lazy(() => import('./pages/data-explorer/index'));
const CausalPage = lazy(() => import('./pages/causal/index'));
const WhatIfPage = lazy(() => import('./pages/what-if/index'));
const XaiPage = lazy(() => import('./pages/xai/index'));
const AnalyticsPage = lazy(() => import('./pages/analytics/index'));

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#020617] text-cyan-100/80 font-[Orbitron] tracking-widest text-sm">
          INITIALIZING MISSION CONTROL & CAUSAL INTELLIGENCE...
        </div>
      }
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.24, ease: 'easeOut' }}
        >
          <Routes location={location}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/data-explorer" element={<DataExplorerPage />} />
            <Route path="/simulation" element={<SimulationPage />} />
            <Route path="/simulation/:eventId" element={<SimulationPage />} />
            <Route path="/causal" element={<CausalPage />} />
            <Route path="/what-if" element={<WhatIfPage />} />
            <Route path="/xai" element={<XaiPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            {/* Backward-compatible redirects */}
            <Route path="/critical" element={<Navigate to="/simulation" replace />} />
            <Route path="/validation" element={<Navigate to="/analytics" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
