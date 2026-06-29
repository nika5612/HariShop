import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import { HelmetProvider } from 'react-helmet-async'
import store from './store'
import './bootstrap.min.css'
import './index.css'
import App from './App'

// 🔧 FIXED: Robust global process polyfill (before ReactDOM.render)
window.process = window.process || {
  env: { 
    NODE_ENV: 'development',
    PUBLIC_URL: ''
  }
};

// Init theme from localStorage
document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'dark');

ReactDOM.render(
  <HelmetProvider>
    <Provider store={store}>
      <App />
    </Provider>
  </HelmetProvider>,
  document.getElementById('root')
)
