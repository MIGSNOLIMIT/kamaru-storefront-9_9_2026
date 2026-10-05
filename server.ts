import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer as createViteServer, type Connect, type ViteDevServer } from 'vite'
import { handleCmsApi } from './cms/api-plugin.ts'

const root = path.dirname(fileURLToPath(import.meta.url))
const port = Number(process.env.PORT) || 43917
const isProd = process.env.NODE_ENV === 'production'

const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
}

function sendFile(res: ServerResponse, file: string) {
  res.setHeader('Content-Type', types[path.extname(file)] ?? 'application/octet-stream')
  createReadStream(file).pipe(res)
}

function serveSpa(res: ServerResponse, distDir: string, urlPath: string) {
  const relative = decodeURIComponent(urlPath.split('?')[0]).replace(/^\/+/, '')
  const file = path.normalize(path.join(distDir, relative))
  if (!file.startsWith(distDir)) {
    res.statusCode = 403
    res.end('Forbidden')
    return
  }
  if (relative && existsSync(file) && statSync(file).isFile()) {
    sendFile(res, file)
    return
  }
  sendFile(res, path.join(distDir, 'index.html'))
}

function useVite(vite: ViteDevServer, req: IncomingMessage, res: ServerResponse) {
  const middlewares = vite.middlewares as Connect.Server
  middlewares(req, res, () => {
    res.statusCode = 404
    res.end('Not found')
  })
}

async function main() {
  let storefront: ViteDevServer | null = null
  let cms: ViteDevServer | null = null
  const server = createServer(async (req, res) => {
    try {
      const url = req.url ?? '/'
      if (url.startsWith('/api/')) {
        const handled = await handleCmsApi(req, res)
        if (!handled) {
          res.statusCode = 404
          res.end('Not found')
        }
        return
      }
      if (url === '/cms' || url.startsWith('/cms?')) {
        res.statusCode = 302
        res.setHeader('Location', '/cms/')
        res.end()
        return
      }
      if (!isProd && (url === '/cms/' || url.startsWith('/cms/?'))) {
        let html = readFileSync(path.join(root, 'cms', 'index.html'), 'utf8')
        html = await cms!.transformIndexHtml('/cms/', html)
        if (!html.includes('/cms/src/main.tsx') && !html.includes('./src/main.tsx')) {
          html = html.replace('src="/src/main.tsx"', 'src="/cms/src/main.tsx"')
        }
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(html)
        return
      }
      if (isProd) {
        if (url === '/cms/' || url.startsWith('/cms/')) {
          serveSpa(res, path.join(root, 'cms', 'dist'), url.replace(/^\/cms/, '') || '/')
          return
        }
        serveSpa(res, path.join(root, 'dist'), url)
        return
      }
      if (url.startsWith('/cms/')) {
        useVite(cms!, req, res)
        return
      }
      useVite(storefront!, req, res)
    } catch (error) {
      res.statusCode = 500
      res.end(error instanceof Error ? error.message : 'Server error')
    }
  })

  if (!isProd) {
    storefront = await createViteServer({
      root,
      server: { middlewareMode: true, hmr: { server, path: '/__store_hmr' } },
      appType: 'spa',
    })
    cms = await createViteServer({
      configFile: path.join(root, 'cms', 'vite.config.ts'),
      server: { middlewareMode: true, hmr: { server, path: '/__cms_hmr' } },
      appType: 'spa',
    })
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`Kamaru running at http://localhost:${port}`)
    console.log(`CMS at http://localhost:${port}/cms/`)
  })
}

void main()
