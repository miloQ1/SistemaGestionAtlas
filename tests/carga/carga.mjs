// Prueba de carga (NFR-PERF-1 y NFR-PERF-3) con autocannon.
// Simula 200 usuarios concurrentes durante 20 s por escenario y revisa el percentil 95 (< 300 ms).
// Alternativa equivalente con k6: tests/load-test.js
import autocannon from 'autocannon';
import fs from 'node:fs';

const API = process.env.API_URL || 'http://localhost:5000';
const USUARIOS = Number(process.env.USUARIOS || 200);
const DURACION = Number(process.env.DURACION || 20);

const login = await fetch(`${API}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@atlas.cl', password: 'Password123!' }),
});
const { token } = await login.json();

const escenarios = [
  { nombre: 'GET /api/clientes (listar, CRUD simple)', url: `${API}/api/clientes`, headers: { Authorization: `Bearer ${token}` } },
  { nombre: 'GET /api/contratos (listar)', url: `${API}/api/contratos`, headers: { Authorization: `Bearer ${token}` } },
  { nombre: 'POST /api/auth/login (bcrypt)', url: `${API}/api/auth/login`, method: 'POST',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@atlas.cl', password: 'Password123!' }) },
];

const salida = [];
for (const e of escenarios) {
  const r = await autocannon({ url: e.url, method: e.method || 'GET', headers: e.headers, body: e.body, connections: USUARIOS, duration: DURACION });
  const fila = {
    escenario: e.nombre,
    usuarios: USUARIOS,
    peticiones: r.requests.total,
    req_por_seg: Math.round(r.requests.average),
    p50_ms: r.latency.p50,
    p95_ms: r.latency.p97_5 ?? r.latency.p95,
    p99_ms: r.latency.p99,
    errores: r.errors + r.non2xx,
  };
  fila.p95_ms = r.latency.p95 ?? fila.p95_ms;
  fila.cumple_300ms = fila.p95_ms < 300 ? 'SÍ' : 'NO';
  salida.push(fila);
  console.log(`${fila.escenario}: ${fila.peticiones} peticiones, ${fila.req_por_seg} req/s, p50 ${fila.p50_ms} ms, p95 ${fila.p95_ms} ms, errores ${fila.errores} -> cumple < 300 ms: ${fila.cumple_300ms}`);
}
fs.mkdirSync('reports', { recursive: true });
fs.writeFileSync('reports/carga.json', JSON.stringify(salida, null, 2));
