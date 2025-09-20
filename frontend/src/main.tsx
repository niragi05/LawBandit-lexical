import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import './index.css'
import Layout from './components/Layout'
import App from './App.tsx'
import Interpreter from './components/Interpreter'
import PdfViewer from './components/PdfViewer'
import { FlowchartGenerator } from './components/FlowchartGenerator'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/interpreter" element={<Interpreter />} />
          <Route path="/pdf-viewer" element={<PdfViewer />} />
          <Route path="/flowchart" element={<FlowchartGenerator />} />
        </Routes>
      </Layout>
    </BrowserRouter>
    <Analytics />
    <SpeedInsights />
  </StrictMode>,
)
