# Cómo levantar Atlas y ejecutar las pruebas en local

Guía de respaldo por si el pipeline de GitHub falla o el profe pide ver las pruebas en vivo.
Comandos para **Windows (PowerShell)**. Donde hay diferencias con Linux/Mac se indica.

---

## Opción A: con Docker (recomendada)

### Requisitos
- Docker Desktop instalado y **abierto** (ícono de la ballena en verde)
- Node.js 20 o superior (`node -v`)
- Git

### 1. Levantar Atlas
```powershell
cd C:\Users\PC\Desktop\atlas-system
docker compose up -d --build
```

Esperar unos 20 segundos y verificar:
```powershell
docker compose ps                                  # los 3 contenedores en "running" / "healthy"
curl.exe http://localhost:5000/api/health          # debe responder {"status":"ok"}
```

| Servicio | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:5000 |
| PostgreSQL | localhost:5432 |

**Usuarios de prueba** (clave `Password123!`):
- `admin@atlas.cl` → ADMINISTRADOR
- `editor@atlas.cl` → EDITOR

### 2. Apagar
```powershell
docker compose down        # apaga y conserva los datos
docker compose down -v     # apaga y BORRA la base de datos (vuelve al estado inicial)
```

---

## Opción B: sin Docker (Node + PostgreSQL instalados)

Usar solo si Docker no funciona en el PC.

### Requisitos
- Node.js 20+
- PostgreSQL 15 o 16 instalado (con `psql` en el PATH)

### 1. Crear la base de datos
```powershell
psql -U postgres -c "CREATE USER atlas_admin WITH PASSWORD 'AtlasSecretPassword2026!';"
psql -U postgres -c "CREATE DATABASE atlas_db OWNER atlas_admin;"
$env:PGPASSWORD = "AtlasSecretPassword2026!"
psql -h localhost -U atlas_admin -d atlas_db -f db/init.sql
```

### 2. Backend (terminal 1)
```powershell
cd backend
copy .env.example .env      # luego editar .env: DB_PASSWORD=AtlasSecretPassword2026!  y  JWT_SECRET=<cualquier texto largo>
npm install
npm start                   # "Servidor Atlas ejecutándose en puerto 5000"
```

### 3. Frontend (terminal 2)
```powershell
cd frontend
npm install
$env:VITE_API_URL = "http://localhost:5000"
npm run build
npx vite preview --host 0.0.0.0 --port 3000
```

> Linux/Mac: usar `export VITE_API_URL=http://localhost:5000` en vez de `$env:...`

---

## Ejecutar las pruebas

Con Atlas levantado (opción A o B), en una **terminal nueva**:

```powershell
cd C:\Users\PC\Desktop\atlas-system\tests
npm install
npx playwright install chromium
```

| Prueba | Comando | Resultado esperado |
|---|---|---|
| Seguridad de la API (21 casos) | `npm run test:security` | 9 aprobadas / 12 fallidas |
| Postman / Newman (16 casos) | `npm run test:api` | 36 de 38 validaciones OK |
| Playwright E2E (11 flujos) | `npm run test:e2e` | 8 aprobados / 3 fallidos |
| Lighthouse | `npm run test:lighthouse` | Rendimiento 100, Accesibilidad 100 |
| Carga (200 usuarios) | `npm run test:carga` | Lecturas OK, login lento |

Análisis estático y dependencias:
```powershell
cd ..\backend
npx eslint .                # SAST: 0 hallazgos
npm audit                   # 0 vulnerabilidades
cd ..\frontend
npm audit                   # 2 vulnerabilidades (vite / esbuild)
```

Búsqueda de secretos (requiere **Git Bash**, viene con Git para Windows):
```bash
bash tests/security/check_secrets.sh .
```

### Ver los reportes
Quedan en `tests\reports\`:
```powershell
start reports\newman.html
start reports\lighthouse.report.html
npx playwright show-report reports\playwright
```

---

## Reiniciar la base de datos entre pruebas

Las pruebas crean datos (clientes, contratos, empresas). Para repetirlas desde cero:

- **Con Docker:**
  ```powershell
  docker compose down -v
  docker compose up -d
  ```
- **Sin Docker (Git Bash):**
  ```bash
  DB_PASSWORD='AtlasSecretPassword2026!' bash tests/reset_db.sh
  ```

---

## OWASP ZAP (opcional, para mostrar en vivo)

**Más fácil, con la interfaz gráfica:**
1. Descargar ZAP desde https://www.zaproxy.org/download/
2. Abrir ZAP → **Automated Scan**
3. URL: `http://localhost:3000` → **Attack**
4. Al terminar: **Report → Generate Report** (HTML)

**Con Docker (sin instalar nada):**
```powershell
docker run --rm -v "${PWD}\tests\reports:/zap/wrk:rw" ghcr.io/zaproxy/zaproxy:stable `
  zap-baseline.py -t http://host.docker.internal:3000 -r zap_baseline.html
```

---

## Problemas comunes

| Problema | Solución |
|---|---|
| `port is already allocated` (5432, 5000 o 3000) | Otro programa usa el puerto. Cerrar el PostgreSQL local (Servicios de Windows) u otra app, o ejecutar `docker compose down` y reintentar. |
| `Cannot connect to the Docker daemon` | Abrir Docker Desktop y esperar a que diga "Engine running". |
| El login dice "Error conectando al servidor Atlas" | La API no está arriba. Revisar `docker compose logs atlas-backend`. |
| La API responde 503 en `/api/health` | PostgreSQL aún no termina de iniciar. Esperar 10 a 20 segundos. |
| `npx playwright` falla por el navegador | Ejecutar `npx playwright install chromium`. |
| Lighthouse: `Chrome not found` | Instalar Google Chrome o definir `$env:CHROME_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"`. |
| `bash` no se reconoce | Usar **Git Bash** en vez de PowerShell para los archivos `.sh`. |
| Las pruebas dan resultados distintos a los del informe | La BD tiene datos de ejecuciones anteriores. Reiniciarla (ver sección anterior). |

---

## Guion rápido para mostrar en la defensa (2 minutos)

1. `docker compose up -d` y abrir http://localhost:3000
2. Entrar como `editor@atlas.cl` y crear un cliente: **el editor no debería poder** (DEF-01)
3. `npm run test:security`: mostrar en vivo SEG-06 y SEG-13 en rojo
4. `npx playwright show-report reports\playwright`: mostrar las capturas de las pruebas fallidas
5. Cerrar con: *"Estas mismas pruebas corren automáticamente en el pipeline y bloquean el despliegue."*
