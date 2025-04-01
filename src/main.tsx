import { render } from 'preact'
import { StrictMode } from 'preact/compat'
import App from './App.tsx'
import './index.css'

render(
  <StrictMode>
    <App />
  </StrictMode>,
  document.getElementById('root')!
)
