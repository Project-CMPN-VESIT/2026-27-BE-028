# SimulatorDashboard - UI-Only Implementation

## Overview

This is a complete React UI conversion of the satellite simulator HTML dashboard. It's a **UI-only implementation** with static/dummy data - no backend integration yet.

## 🎯 Implementation Status

### ✅ Completed Components

1. **TopBar.jsx** - Navigation bar with time scale, pause, trajectory, and apogee/perigee controls
2. **BurnControls.jsx** - Left panel with burn direction buttons, thrust control, orbit selection
3. **TelemetryPanel.jsx** - Right panel with satellite telemetry grid and camera controls
4. **DecisionPanel.jsx** - Decision engine display with confidence metrics and cost analysis
5. **ChartsPanel.jsx** - Bottom charts panel using Recharts (PoC, Fuel, Distance)
6. **EarthScene.jsx** - 3D Earth visualization using React Three Fiber
7. **ExplanationPanel.jsx** - Floating event label and scenario information
8. **SimulatorDashboard.jsx** - Main page combining all components

### ✅ Styling

- **SimulatorDashboard.css** - Complete styling matching the HTML design
- Updated **App.css** - View toggle button styles
- Updated **index.html** - Google Fonts for Orbitron, Share Tech Mono, Exo 2

### ✅ Updated Files

- **package.json** - Added dependencies: three, @react-three/fiber, @react-three/drei, recharts
- **App.jsx** - Added view mode toggle between Dashboard and SimulatorDashboard
- **index.html** - Added font imports

## 🚀 Quick Start

### Install Dependencies

```bash
cd frontend
npm install
```

### Run Development Server

```bash
npm run dev
```

### Access the App

Open http://localhost:5173 in your browser. You'll see the simulator dashboard.

### Toggle Views

- **Simulator Button** (🛰) - In top-right corner when on traditional dashboard
- **Dashboard Button** (📊) - In bottom-right corner when on simulator

## 📁 File Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── TopBar.jsx
│   │   ├── BurnControls.jsx
│   │   ├── TelemetryPanel.jsx
│   │   ├── DecisionPanel.jsx
│   │   ├── ChartsPanel.jsx
│   │   ├── EarthScene.jsx
│   │   ├── ExplanationPanel.jsx
│   │   └── SimulatorDashboard.css
│   ├── pages/
│   │   ├── Dashboard.jsx (original - unchanged)
│   │   └── SimulatorDashboard.jsx
│   ├── App.jsx (updated with view toggle)
│   └── index.css
├── index.html (updated with fonts)
└── package.json (updated with new dependencies)
```

## 🎨 UI Features

### Top Bar
- Logo with pulsing indicator
- Time scale slider (1x - 500x)
- Pause/Resume button
- Trajectory toggle
- Apogee/Perigee markers toggle
- Sync indicator

### Left Panel - Burn Controls
- **Burn Direction**: Prograde, Retrograde, Radial buttons
- **Thrust Control**: 0-100% slider
- **Orbit Type**: Dropdown selector for ISS, Elliptical, Molniya, GEO, Custom
- **Decision Badge**: Shows COMMIT recommendation with confidence

### Right Panel - Telemetry
- **10 Telemetry Cells**: ALT, VEL, DIST, TCA, PoC, APO, PERI, ECC, INCL, PERIOD
- **Camera Controls**: FREE, SAT, TOP, NADIR modes
- Real-time data updates (simulated)

### Center Overlay
- **Event Label**: Large glitch-animated title
- **Explanation Box**: Scenario details, tags, asset/threat info
- **Tags**: CRITICAL, WARN, OK status indicators

### Bottom Charts
- **Collision Probability**: Red line showing PoC over time
- **Fuel Remaining**: Green line showing fuel percentage
- **Separation Distance**: Cyan line showing distance trend

### 3D Scene
- Procedural Earth texture with landmasses
- Atmosphere glow effect
- Animated satellite model
- Orbit trail visualization
- Starfield background
- Mouse controls for free-look camera

## 🔧 Component Props & State

### TopBar
```jsx
<TopBar 
  timeScale={50}
  onTimeScaleChange={(scale) => {}}
  paused={false}
  onPauseToggle={() => {}}
  showTrajectory={true}
  onTrajectoryToggle={() => {}}
  showApoPeri={true}
  onApoPeriToggle={() => {}}
/>
```

### BurnControls
```jsx
<BurnControls 
  onBurn={(type, thrustPercent) => {}}
  currentOrbit="elliptical"
  onOrbitChange={(orbit) => {}}
/>
```

### TelemetryPanel
```jsx
<TelemetryPanel 
  telemetry={{}} // Optional custom telemetry
  cameraMode="free"
  onCameraChange={(mode) => {}}
/>
```

### ChartsPanel
No props - uses internal dummy data

### EarthScene
```jsx
<EarthScene cameraMode="free" />
```

### DecisionPanel
No props - displays static decision data

### ExplanationPanel
```jsx
<ExplanationPanel 
  event={null} // Uses default if null
  scenario={null} // Uses default if null
/>
```

## 🎯 Dummy Data & Static Values

All components use hardcoded/dummy data:

- **Telemetry**: Updates every 1 second with small random variations
- **Charts**: Generated with procedural data
- **Decision**: Static decision recommendations
- **Events**: Static event and scenario information

## 🔌 Next Steps - Phase 2 (Not Yet Implemented)

When you're ready to connect to the backend:

1. Replace `getDecision` API calls
2. Hook up WebSocket for real-time telemetry
3. Connect decision engine results
4. Replace dummy chart data with backend data
5. Add command/control API endpoints for burns

## ⚠️ Important Notes

### Current Limitations

- **No Backend Integration**: All data is static/dummy
- **3D View**: Basic Earth and satellite models (simple geometry)
- **No Animations**: Satellite movement and time progression not simulated
- **No Persistence**: State resets on page reload

### Browser Compatibility

- Requires WebGL support (modern browsers)
- Desktop/Laptop recommended (not optimized for mobile)
- Chrome, Firefox, Safari, Edge (latest versions)

### Performance

- Recharts is efficient for real-time updates
- React Three Fiber handles 3D rendering well
- CSS animations are GPU-accelerated

## 🛠 Customization

### Change Colors

Edit the CSS variables in `SimulatorDashboard.css`:
```css
:root {
  --cyan: #00ffff;
  --green: #00ff88;
  --red: #ff2d55;
  --orange: #ff6b2b;
  /* ... */
}
```

### Modify Telemetry Display

Edit `TelemetryPanel.jsx` to change which metrics are displayed or add new ones.

### Update Chart Data Range

Modify the data generation functions in `ChartsPanel.jsx`.

### Customize 3D Scene

Edit `EarthScene.jsx` to change Earth texture, add more objects, modify lighting, etc.

## 📊 Component Dependencies

```
SimulatorDashboard.jsx
├── TopBar.jsx
├── BurnControls.jsx
├── TelemetryPanel.jsx
├── DecisionPanel.jsx
├── ChartsPanel.jsx (uses Recharts)
├── EarthScene.jsx (uses @react-three/fiber)
└── ExplanationPanel.jsx
```

## 🐛 Troubleshooting

### Black screen?
- Check browser console for errors
- Make sure WebGL is enabled
- Try different browser

### Charts not showing?
- Verify recharts is installed: `npm list recharts`
- Check browser console for errors
- Make sure window size allows chart rendering

### 3D view not visible?
- Check that @react-three/fiber and three are installed
- Verify Canvas component in EarthScene is rendering
- Check browser WebGL support

### Fonts not loading?
- Check network tab for Google Fonts requests
- Verify fonts are loading from CDN
- Fall back to system fonts is working

## 📝 Code Examples

### Access Simulator Dashboard

```jsx
import SimulatorDashboard from './pages/SimulatorDashboard';

// In your route setup:
<SimulatorDashboard />
```

### Customize Decision Display

In `DecisionPanel.jsx`, modify the decision object:
```jsx
const [decision, setDecision] = useState({
  recommendation: 'WAIT',  // Change to WAIT or FORCE
  confidence: 92.1,        // Any percentage
  costCurrent: 300,
  costIfWait: 250,
  metrics: {
    fuelRequired: 200,
    timeToBurn: 5,
    successRate: 88.5
  }
});
```

### Update Telemetry Values

In `TelemetryPanel.jsx`, modify the telemetryData state:
```jsx
const [telemetryData, setTelemetryData] = useState({
  altitude: 7500,
  velocity: 6098,
  distance: 450,
  // ... add more metrics
});
```

## 🎓 Architecture

### Stateful Components
- SimulatorDashboard: Main state container
- TelemetryPanel: Self-contained telemetry updates
- TopBar: Simple prop-based state

### Stateless Components
- DecisionPanel: Pure display
- ExplanationPanel: Pure display
- ChartsPanel: Self-contained with useMemo

### 3D Components
- EarthScene: Canvas-based React Three Fiber scene

## 📚 Resources

- React: https://react.dev
- React Three Fiber: https://docs.pmnd.rs/react-three-fiber
- Recharts: https://recharts.org
- Three.js: https://threejs.org

---

**Created**: UI-Only Implementation  
**Phase**: 1 (UI Design & Components)  
**Status**: ✅ Complete & Ready for Backend Integration
