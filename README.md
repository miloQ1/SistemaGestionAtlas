# Atlas – EP3 ISY1102 (Seguridad y Calidad en el Desarrollo de Software)

Software del caso A "Sistema de Gestión Atlas" + pruebas de seguridad y automatizadas de la EP3.

## Levantar Atlas
```bash
cp backend/.env.example backend/.env   # completar valores
docker compose up -d --build           # front: http://localhost:3000  API: http://localhost:5000
```
Usuarios de prueba: `admin@atlas.cl` / `editor@atlas.cl` (clave `Password123!`).

## Ejecutar las pruebas
```bash
cd tests
npm install
npx playwright install chromium
npm run test:security     # 21 pruebas de seguridad dirigidas (RBAC, JWT, XSS, SQLi...)
npm run test:api          # colección Postman con Newman (16 casos)
npm run test:e2e          # Playwright (11 flujos) -> reporte en reports/playwright
npm run test:lighthouse   # rendimiento y accesibilidad
npm run test:carga        # 200 usuarios concurrentes (autocannon). Alternativa: k6 run load-test.js
cd ../backend && npx eslint .   # SAST
npm audit                       # SCA (repetir en frontend/)
bash ../tests/security/check_secrets.sh ..   # búsqueda de secretos
```
DAST: iniciar OWASP ZAP en modo daemon (`zap.sh -daemon -port 8090 -config api.key=atlaskey`) y ejecutar
`python tests/security/zap_scan.py tests/reports` (requiere `pip install zaproxy requests`).

Para reiniciar la BD entre suites: `DB_PASSWORD=... bash tests/reset_db.sh`.

## Pipeline CI/CD
`.github/workflows/calidad-seguridad.yml`: SAST + secretos → SCA → build + Trivy → pruebas + ZAP → gate de calidad.
Configurar en GitHub > Settings > Secrets: `DB_PASSWORD` y `JWT_SECRET`.

> Nota: el código de la aplicación se mantiene tal como fue entregado para que las pruebas evidencien los defectos
> (por ejemplo, los secretos en `docker-compose.yml`). Las correcciones propuestas están en la sección 6 del informe.
