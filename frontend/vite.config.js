import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import fs from 'fs'

// Custom plugin: serve /frames/* directly from ../animated/ folder
// This means NO file copying needed — Vite reads straight from source!
function serveAnimatedFrames() {
  const animatedDir = path.resolve('../animated')
  return {
    name: 'serve-animated-frames',
    configureServer(server) {
      server.middlewares.use('/frames', (req, res, next) => {
        // req.url here is e.g. "/ezgif-frame-001.jpg"
        const filename = req.url.replace(/^\//, '')
        const filePath = path.join(animatedDir, filename)
        if (fs.existsSync(filePath)) {
          res.setHeader('Content-Type', 'image/jpeg')
          res.setHeader('Cache-Control', 'public, max-age=31536000')
          fs.createReadStream(filePath).pipe(res)
        } else {
          next()
        }
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), serveAnimatedFrames()],
  server: {
    fs: {
      allow: ['..']
    },
    proxy: {
      '/token': 'http://127.0.0.1:8000',
      '/register': 'http://127.0.0.1:8000',
      '/users': 'http://127.0.0.1:8000',
      '/logs': 'http://127.0.0.1:8000',
      '/stats': 'http://127.0.0.1:8000',
      '/search': 'http://127.0.0.1:8000',
      '/upload-audio': 'http://127.0.0.1:8000',
      '/static': 'http://127.0.0.1:8000',
      '/profile': 'http://127.0.0.1:8000',
      '/predict': 'http://127.0.0.1:8000'
    }
  }
})
