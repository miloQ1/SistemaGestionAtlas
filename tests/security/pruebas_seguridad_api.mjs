// Pruebas de seguridad automatizadas sobre la API de Atlas.
// Cada prueba indica: requisito de la ERS, resultado esperado y resultado obtenido.
// Uso: node tests/security/pruebas_seguridad_api.mjs [archivo_salida.json]
// Requiere Node 18+ (fetch nativo) y Atlas corriendo en http://localhost:5000
import crypto from 'node:crypto';
import fs from 'node:fs';

const API = process.env.API_URL || 'http://localhost:5000';
const SECRETO_FILTRADO = 'JWT_Secret_Atlas_ISY1102_2026_Key!'; // encontrado en .env / docker-compose / auth.js
const resultados = [];

async function req(method, path, { token, body, headers = {} } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch { /* sin cuerpo JSON */ }
  return { status: res.status, headers: res.headers, data };
}

async function login(email, password = 'Password123!') {
  const r = await req('POST', '/api/auth/login', { body: { email, password } });
  return r.data && r.data.token;
}

function b64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function firmarJWT(payload, secreto) {
  const header = b64url({ alg: 'HS256', typ: 'JWT' });
  const body = b64url(payload);
  const firma = crypto.createHmac('sha256', secreto).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${firma}`;
}

function registrar(id, nombre, requisito, esperado, obtenido, cumple, criticidad) {
  resultados.push({ id, nombre, requisito, esperado, obtenido, resultado: cumple ? 'APROBADO' : 'FALLIDO', criticidad: cumple ? '-' : criticidad });
  console.log(`${cumple ? '✔ APROBADO' : '✘ FALLIDO '} ${id} ${nombre}\n      esperado: ${esperado}\n      obtenido: ${obtenido}`);
}

const admin = await login('admin@atlas.cl');
const editor = await login('editor@atlas.cl');
const stamp = Date.now();

// --- Validación de entradas ---------------------------------------------
let r = await req('POST', '/api/auth/login', { body: { email: "' OR '1'='1' --", password: "' OR '1'='1' --" } });
registrar('SEG-01', 'SQL Injection en login', 'NFR-SEG-5', 'HTTP 401, sin acceso', `HTTP ${r.status}`, r.status === 401, 'Crítica');

r = await req('DELETE', '/api/clientes/25%20OR%201=1', { token: admin });
registrar('SEG-02', 'SQL Injection en parámetro :id', 'NFR-SEG-5', 'HTTP 400 (id inválido)', `HTTP ${r.status}`, r.status === 400, 'Crítica');

r = await req('POST', '/api/clientes', { token: admin, body: { rut: '12.345.678-9', razon_social: '<script>alert("xss")</script>' } });
const xssGuardado = r.status === 201;
registrar('SEG-03', 'XSS en razón social (entrada sin sanear)', 'NFR-SEG-5', 'HTTP 400 o texto saneado',
  `HTTP ${r.status}, se guardó: ${r.data && r.data.razon_social}`, !xssGuardado, 'Baja (React escapa el texto al mostrarlo)');

r = await req('POST', '/api/contratos/25/documentos', { token: admin, body: { pdf_url: 'javascript:alert(document.domain)' } });
registrar('SEG-04', 'XSS almacenado vía pdf_url (javascript:)', 'NFR-SEG-5', 'HTTP 400, solo rutas de documentos válidas',
  `HTTP ${r.status}, pdf_url guardado: ${r.data && r.data.contrato && r.data.contrato.pdf_url}`, r.status === 400, 'Alta');

r = await req('POST', '/api/clientes', { token: admin, body: 'x'.repeat(1_200_000) });
registrar('SEG-05', 'Payload excesivo (> 1 MB)', 'NFR-SEG-5', 'HTTP 413 (sin filtrar detalles internos)', `HTTP ${r.status} ${JSON.stringify(r.data)}`, r.status === 413, 'Baja');

// --- Control de acceso por rol (RBAC) -----------------------------------
r = await req('POST', '/api/clientes', { token: editor, body: { rut: '22.222.222-2', razon_social: `Creado por editor ${stamp}` } });
registrar('SEG-06', 'Editor intenta CREAR cliente', 'RF-3.2, RB-4, NFR-SEG-4', 'HTTP 403', `HTTP ${r.status}`, r.status === 403, 'Crítica');

r = await req('POST', '/api/contratos/25/documentos', { token: editor, body: { pdf_url: '/uploads/editor.pdf' } });
registrar('SEG-07', 'Editor intenta CREAR contrato/documento', 'RF-3.2, RB-4, NFR-SEG-4', 'HTTP 403', `HTTP ${r.status}`, r.status === 403, 'Crítica');

r = await req('DELETE', '/api/clientes/25', { token: editor });
registrar('SEG-08', 'Editor intenta ELIMINAR cliente', 'RF-3.2, RB-4', 'HTTP 403', `HTTP ${r.status}`, r.status === 403, 'Crítica');

r = await req('GET', '/api/auditoria', { token: editor });
registrar('SEG-09', 'Editor intenta ver auditoría', 'RB-4, NFR-SEG-4', 'HTTP 403', `HTTP ${r.status}`, r.status === 403, 'Alta');

r = await req('GET', '/api/clientes');
registrar('SEG-10', 'Acceso sin token', 'RF-1, NFR-SEG-9', 'HTTP 401', `HTTP ${r.status}`, r.status === 401, 'Crítica');

// --- Manejo de sesión / JWT ---------------------------------------------
const [h, p, s] = editor.split('.');
const payloadEditor = JSON.parse(Buffer.from(p, 'base64url').toString());
const alterado = `${h}.${b64url({ ...payloadEditor, rol: 'ADMINISTRADOR' })}.${s}`;
r = await req('GET', '/api/auditoria', { token: alterado });
registrar('SEG-11', 'Token alterado (rol cambiado sin re-firmar)', 'NFR-SEG-9', 'HTTP 401', `HTTP ${r.status}`, r.status === 401, 'Crítica');

const algNone = `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({ ...payloadEditor, rol: 'ADMINISTRADOR' })}.`;
r = await req('GET', '/api/auditoria', { token: algNone });
registrar('SEG-12', 'Token con algoritmo "none"', 'NFR-SEG-9', 'HTTP 401', `HTTP ${r.status}`, r.status === 401, 'Crítica');

const forjado = firmarJWT({ id: 1, email: 'atacante@x.cl', rol: 'ADMINISTRADOR', empresa_id: 1, iat: Math.floor(Date.now() / 1000) }, SECRETO_FILTRADO);
r = await req('GET', '/api/clientes', { token: forjado });
registrar('SEG-13', 'Token forjado con el secreto JWT expuesto en el repositorio', 'NFR-SEG-6, NFR-SEG-9', 'HTTP 401',
  `HTTP ${r.status}, ${Array.isArray(r.data) ? r.data.length + ' clientes devueltos (con datos bancarios)' : ''}`, r.status === 401, 'Crítica');

const expPayload = JSON.parse(Buffer.from(admin.split('.')[1], 'base64url').toString());
const horas = (expPayload.exp - expPayload.iat) / 3600;
r = await req('POST', '/api/auth/logout', { token: admin });
const despues = await req('GET', '/api/clientes', { token: admin });
registrar('SEG-14', 'Cierre de sesión y revocación de token', 'RF-1.2, NFR-SEG-9', 'Endpoint de logout y token inválido después (401)',
  `logout HTTP ${r.status}; token sigue válido después (HTTP ${despues.status}); vigencia ${horas} h sin refresh token`, r.status === 200 && despues.status === 401, 'Alta');

// --- Autenticación -------------------------------------------------------
let bloqueado = false;
for (let i = 0; i < 30; i += 1) {
  const x = await req('POST', '/api/auth/login', { body: { email: 'admin@atlas.cl', password: `incorrecta${i}` } });
  if (x.status === 429 || x.status === 423) { bloqueado = true; break; }
}
const okTras = await login('admin@atlas.cl');
registrar('SEG-15', 'Fuerza bruta: 30 intentos fallidos seguidos', 'NFR-SEG-5 / OWASP A07', 'Bloqueo o HTTP 429 tras N intentos',
  `${bloqueado ? 'bloqueado' : 'sin bloqueo: 30 respuestas 401'}; login correcto posterior ${okTras ? 'permitido' : 'negado'}`, bloqueado, 'Media');

r = await req('POST', '/api/empresas', { body: { nombre: `Empresa Débil ${stamp}`, rut: `${String(stamp).slice(-8)}-1`, correo: `debil${stamp}@test.cl`, usuario_admin: 'Débil', password: '123' } });
registrar('SEG-16', 'Registro con contraseña débil ("123")', 'Restricción 2.4 (12 car., may/min/núm/símbolo)', 'HTTP 400', `HTTP ${r.status}`, r.status === 400, 'Media');

r = await req('POST', '/api/auth/login', { body: { email: 'noexiste@atlas.cl', password: 'x' } });
const r2 = await req('POST', '/api/auth/login', { body: { email: 'admin@atlas.cl', password: 'x' } });
registrar('SEG-17', 'Enumeración de usuarios por mensaje de error', 'OWASP A07', 'Mismo mensaje para usuario inexistente y clave errónea',
  `"${r.data.error}" / "${r2.data.error}"`, r.data.error === r2.data.error, 'Baja');

// --- Aislamiento entre empresas (IDOR) -----------------------------------
const correoB = `adminb${stamp}@test.cl`;
await req('POST', '/api/empresas', { body: { nombre: `Empresa B ${stamp}`, rut: `${String(stamp).slice(-7)}-2`, correo: correoB, usuario_admin: 'Admin B', password: 'ClaveSegura#2026' } });
const adminB = await login(correoB, 'ClaveSegura#2026');
r = await req('DELETE', '/api/clientes/25', { token: adminB });
const rc = await req('POST', '/api/contratos/25/documentos', { token: adminB, body: { pdf_url: '/uploads/b.pdf' } });
const lista = await req('GET', '/api/clientes', { token: adminB });
registrar('SEG-18', 'Empresa B intenta acceder a cliente de empresa A (IDOR)', 'RB-2', 'HTTP 404 y lista vacía',
  `DELETE HTTP ${r.status}, POST contrato HTTP ${rc.status}, lista: ${lista.data.length} clientes`, r.status === 404 && rc.status === 404 && lista.data.length === 0, 'Crítica');

// --- Protección de datos personales --------------------------------------
r = await req('GET', '/api/clientes', { token: editor });
const conBanco = r.data.find((c) => c.datos_bancarios);
registrar('SEG-19', 'Datos bancarios expuestos en texto plano', 'NFR-SEG-3, NFR-SEG-8 (Ley 19.628 / 21.719)', 'Datos cifrados o enmascarados',
  `editor recibe: ${JSON.stringify(conBanco && conBanco.datos_bancarios)}`, !conBanco, 'Alta');

// --- Configuración del servidor ------------------------------------------
r = await req('GET', '/api/health', { headers: { Origin: 'https://sitio-malicioso.com' } });
const acao = r.headers.get('access-control-allow-origin');
registrar('SEG-20', 'CORS con origen no autorizado', 'NFR-SEG-5 / OWASP A05', 'Origen rechazado (sin cabecera ACAO)', `Access-Control-Allow-Origin: ${acao}`, !acao, 'Media');

const faltantes = ['content-security-policy', 'x-frame-options', 'x-content-type-options', 'strict-transport-security'].filter((x) => !r.headers.get(x));
const powered = r.headers.get('x-powered-by');
registrar('SEG-21', 'Cabeceras de seguridad HTTP', 'NFR-SEG-1 / OWASP A05', 'CSP, X-Frame-Options, nosniff, HSTS presentes; sin X-Powered-By',
  `faltan: ${faltantes.join(', ') || 'ninguna'}; X-Powered-By: ${powered}`, faltantes.length === 0 && !powered, 'Media');

const resumen = { total: resultados.length, aprobados: resultados.filter((x) => x.resultado === 'APROBADO').length };
resumen.fallidos = resumen.total - resumen.aprobados;
console.log(`\nResumen: ${resumen.aprobados}/${resumen.total} aprobadas, ${resumen.fallidos} fallidas`);
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify({ fecha: new Date().toISOString(), resumen, resultados }, null, 2));
