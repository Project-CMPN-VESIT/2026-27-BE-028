# 🚀 Quick React Frontend Setup

## Install Dependencies

```bash
cd frontend
npm install
```

This will install:
- React 19
- Tailwind CSS 4
- Chart.js & react-chartjs-2
- Axios
- Vite build tool

## Start Development Server

```bash
npm run dev
```

Frontend will be available at: **http://localhost:5173**

## Production Build

```bash
npm run build
npm run preview
```

Build outputs to `frontend/dist/`

---

## Environment Configuration

`.env` file (already created):
```
VITE_API_URL=http://localhost:8000/api
```

Change this in production to your deployed backend URL.

---

## Available Scripts

- `npm run dev` - Start development server (hot reload)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

---

## Tech Stack

- **React 19** - UI framework
- **Vite 8** - Build tool & dev server
- **Tailwind CSS 4** - Utility-first CSS
- **Chart.js 4** - Data visualization
- **Axios** - HTTP client

---

## Component Structure

```
src/
├── components/
│   ├── EventSelector.jsx    - Event dropdown & loader
│   ├── SimulationForm.jsx   - Parameter input form
│   ├── DecisionResult.jsx   - Results display
│   └── Charts.jsx           - Chart.js visualizations
│
├── pages/
│   └── Dashboard.jsx        - Main page layout
│
├── services/
│   └── api.js               - API client (Axios)
│
├── App.jsx                  - Root component
├── main.jsx                 - React entry point
├── index.css                - Global styles + stars animation
└── App.css                  - Component styles
```

---

## Space Theme Features

✨ **Animated Stars Background** - Three layers of moving stars
🎨 **Dark Palette** - Gray-900/950 with cyan accents
💫 **Glowing Effects** - Cyan borders and shadows
🌌 **Backdrop Blur** - Glassmorphism effects
📊 **Chart Theming** - Dark charts with cyan highlights

---

## Troubleshooting

### Clear Cache & Reinstall
```bash
rm -rf node_modules package-lock.json
npm install
```

### Port Already in Use
Vite will automatically use next available port (5174, 5175, etc.)

### Hot Reload Not Working
- Check file watchers limit (Linux)
- Restart dev server
- Clear browser cache

---

**Ready to launch!** 🚀
