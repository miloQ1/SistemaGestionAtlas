# Cómo ejecutar el pipeline de calidad y seguridad (GitHub Actions)

Guía paso a paso para subir Atlas a GitHub y ejecutar el pipeline `.github/workflows/calidad-seguridad.yml`.

**Repositorio del proyecto:** https://github.com/miloQ1/SistemaGestionAtlas

---

## 1. Qué hace el pipeline

Cada vez que se hace push o se abre un pull request, GitHub ejecuta estos controles (las etapas 1, 2 y 3 corren en paralelo; la 4 espera al build y la 5 revisa todo):

| Etapa | Job | Herramientas | Qué revisa |
|---|---|---|---|
| 1 | **SAST y secretos** | gitleaks + ESLint (plugin security) | Claves escritas en el código y patrones inseguros |
| 2 | **Dependencias vulnerables** | npm audit | Librerías con vulnerabilidades conocidas (backend y frontend) |
| 3 | **Build y escaneo de imágenes** | Docker Compose + Trivy | Que las imágenes se construyan y no tengan CVE críticas o altas |
| 4 | **Pruebas automatizadas y DAST** | Newman, script de seguridad, Playwright, Lighthouse, OWASP ZAP | Funcionalidad, permisos, rendimiento, accesibilidad y ataques web |
| 5 | **Gate de calidad** | — | Si algún control falló, bloquea el despliegue |

Los reportes de la etapa 4 se guardan como **artefacto** por 90 días (evidencia).

---

## 2. Requisitos

- [x] Repositorio creado: `miloQ1/SistemaGestionAtlas`
- [x] Token personal (PAT clásico) con permisos **`repo`** y **`workflow`**
- [ ] Git instalado en tu PC

> El permiso `workflow` es obligatorio: sin él GitHub rechaza los archivos de `.github/workflows/`.
> Guarda el token en un lugar seguro y **nunca** lo pegues en el código ni en el informe.

---

## 3. Subir el código al repositorio

```bash
unzip atlas-system-ep3.zip
cd atlas-system

git init
git add .
git commit -m "Atlas + pruebas de seguridad y automatizadas EP3"
git branch -M main
git remote add origin https://github.com/miloQ1/SistemaGestionAtlas.git
git push -u origin main
```

Cuando Git pida credenciales:
- **Username:** `miloQ1`
- **Password:** pega el **token** (no tu contraseña de GitHub)

> Si el repositorio ya tiene commits (por ejemplo, un README creado desde GitHub), primero ejecuta
> `git pull origin main --allow-unrelated-histories`, resuelve conflictos si aparecen y luego haz `git push`.

> El archivo `backend/.env` **no** se sube (está en `.gitignore`). Se incluye `backend/.env.example` como plantilla.

Agrega a tus compañeros: https://github.com/miloQ1/SistemaGestionAtlas/settings/access → **Add people**.

---

## 4. Configurar los secrets

Ir a https://github.com/miloQ1/SistemaGestionAtlas/settings/secrets/actions → **New repository secret**

| Nombre | Valor | ¿Obligatorio? |
|---|---|---|
| `DB_PASSWORD` | Una contraseña para la BD de pruebas | Sí |
| `JWT_SECRET` | Un texto largo y aleatorio | Sí |
| `GITLEAKS_LICENSE` | Licencia gratuita de [gitleaks.io](https://gitleaks.io) | **No** (el repo es de tu cuenta personal) |

`GITHUB_TOKEN` **no se crea**: GitHub lo genera solo en cada ejecución.

Para generar un valor aleatorio:

```bash
openssl rand -base64 32
```

---

## 5. Ejecutar el pipeline

Hay tres formas:

1. **Automática con push:** cualquier `git push` a `main` o `develop`.
2. **Automática con pull request:** al abrir un PR hacia `main`.
3. **Manual:** https://github.com/miloQ1/SistemaGestionAtlas/actions → **Calidad y seguridad → Run workflow → Run workflow**.

---

## 6. Ver los resultados

1. Entra a https://github.com/miloQ1/SistemaGestionAtlas/actions
2. Haz clic en la ejecución más reciente.
3. Verás los 5 jobs con ✅ (aprobado) o ❌ (fallido). Haz clic en uno para ver el log de cada paso.
4. Al final de la página, en **Artifacts**, descarga **`reportes-calidad`**. Contiene:
   - `newman.html`: reporte de Postman
   - `playwright/index.html`: reporte E2E con capturas
   - `lighthouse.report.html`: rendimiento y accesibilidad
   - `seguridad_api.json`: resultados de las 21 pruebas de seguridad

> 💡 Para la defensa: toma capturas del resumen de jobs y de los reportes. Muestran que los controles se ejecutan automáticamente.

---

## 7. Resultado esperado: el pipeline sale en ROJO ❌

**Es lo correcto.** Atlas se dejó tal como fue entregado para que las pruebas evidencien sus defectos. El pipeline debería fallar en:

| Job | Por qué falla | Defecto del informe |
|---|---|---|
| SAST y secretos | gitleaks detecta contraseñas en `docker-compose.yml` y en el código | DEF-02 |
| Dependencias vulnerables | `vite` / `esbuild` con vulnerabilidad alta en el frontend | DEF-10 |
| Pruebas automatizadas | El editor puede crear clientes, falta la confirmación al eliminar, XSS por `pdf_url`, etc. | DEF-01, 03, 11, 12... |
| Gate de calidad | Hay controles fallidos → **build bloqueado** | — |

Los jobs `sast`, `sca` y `build` corren en paralelo, así que aunque uno falle igual se ejecutan las pruebas y se generan todos los reportes. Al final, el gate revisa el resultado de todos.

**Mensaje para la defensa:** *"El pipeline bloquea el despliegue porque detecta los mismos defectos que encontramos en las pruebas. Cuando se corrijan, el gate pasará a verde. Así evitamos que una versión insegura llegue a producción."*

---

## 8. Problemas comunes

| Problema | Solución |
|---|---|
| `refusing to allow a Personal Access Token to create or update workflow ... without workflow scope` | Tu token no tiene el permiso `workflow`. Crea uno nuevo con ese permiso o usa `gh auth login`. |
| `Authentication failed` al hacer push | Usaste tu contraseña en vez del token, o el token expiró. Genera uno nuevo con `repo` y `workflow`. |
| `npm ci` falla por falta de `package-lock.json` | Verifica que se subieron `backend/`, `frontend/` y `tests/package-lock.json`. Si no están, ejecuta `npm install` en cada carpeta y haz commit. |
| No aparece el botón **Run workflow** | El archivo del workflow debe estar en la rama `main`. |
| La pestaña Actions está deshabilitada | https://github.com/miloQ1/SistemaGestionAtlas/settings/actions → **Allow all actions**. |
| Un job queda "Queued" mucho tiempo | En cuentas gratuitas hay cola; espera unos minutos. |

---

## 9. Comprobar que el gate funciona (opcional, buena demo)

1. Crea una rama: `git checkout -b fix/rbac`
2. Corrige DEF-01 agregando `rbacMiddleware(['ADMINISTRADOR'])` a `POST /api/clientes` y `POST /api/contratos/:id/documentos`.
3. Haz push y abre un pull request a `main`.
4. En el PR verás que las pruebas SEG-06, SEG-07, API-12 ahora pasan. Así se demuestra la **mejora continua**: corregir → el pipeline lo valida automáticamente.