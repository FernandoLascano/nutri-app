import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data')
const STATE_FILE = path.join(DATA_DIR, 'state.json')
const PORT = Number(process.env.PORT) || 3001

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8'
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

function readState() {
  ensureDataDir()
  if (!fs.existsSync(STATE_FILE)) return null
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function writeState(body) {
  ensureDataDir()
  fs.writeFileSync(STATE_FILE, JSON.stringify(body, null, 2), 'utf-8')
}

const server = http.createServer((req, res) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { ...CORS_HEADERS, 'Content-Length': '0' })
    res.end()
    return
  }

  if (req.url === '/api/state' && req.method === 'GET') {
    const state = readState()
    if (state === null) {
      res.writeHead(404, CORS_HEADERS)
      res.end(JSON.stringify({ error: 'no state yet' }))
      return
    }
    res.writeHead(200, CORS_HEADERS)
    res.end(JSON.stringify(state))
    return
  }

  if (req.url === '/api/state' && req.method === 'PUT') {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf-8'))
        writeState(body)
        res.writeHead(200, CORS_HEADERS)
        res.end(JSON.stringify({ ok: true }))
      } catch (e) {
        res.writeHead(400, CORS_HEADERS)
        res.end(JSON.stringify({ error: 'invalid json' }))
      }
    })
    return
  }

  res.writeHead(404, CORS_HEADERS)
  res.end(JSON.stringify({ error: 'not found' }))
})

server.listen(PORT, () => {
  console.log(`Nutri-app API: http://localhost:${PORT}`)
  console.log(`  GET  /api/state  - leer estado`)
  console.log(`  PUT  /api/state  - guardar estado`)
  console.log(`  Base de datos: ${STATE_FILE}`)
})
