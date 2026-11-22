# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: atlas.spec.js >> Gestión de clientes (RF-4) >> E2E-05 Eliminar cliente solicita confirmación antes de la eliminación lógica
- Location: e2e/atlas.spec.js:55:3

# Error details

```
Error: La ERS (RF-4) exige confirmación antes de eliminar

expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- main [ref=e3]:
  - generic [ref=e4]:
    - heading "Sistema de Gestión Atlas" [level=1] [ref=e5]
    - paragraph [ref=e6]: Gestión segura de clientes y contratos
  - generic [ref=e7]:
    - generic [ref=e8]:
      - generic [ref=e9]:
        - heading "Panel de control" [level=2] [ref=e10]
        - paragraph [ref=e11]:
          - text: "Sesión: Administrador Atlas · Rol activo:"
          - strong [ref=e12]: ADMINISTRADOR
      - button "Cerrar sesión" [ref=e13] [cursor=pointer]
    - navigation "Secciones del sistema" [ref=e14]:
      - button "Clientes" [ref=e15] [cursor=pointer]
      - button "Contratos" [ref=e16] [cursor=pointer]
      - button "Auditoría" [ref=e17] [cursor=pointer]
    - region "Clientes" [ref=e18]:
      - generic [ref=e19]:
        - generic [ref=e20]:
          - heading "Clientes" [level=2] [ref=e21]
          - paragraph [ref=e22]: "Prueba RBAC CP-SEG-01: la eliminación está reservada al administrador."
        - button "Actualizar lista" [ref=e23] [cursor=pointer]
      - generic [ref=e24]:
        - generic [ref=e25]: Razón social
        - textbox "Razón social" [ref=e26]
        - generic [ref=e27]: RUT
        - textbox "RUT" [ref=e28]
        - generic [ref=e29]: Banco (opcional)
        - textbox "Banco (opcional)" [ref=e30]
        - generic [ref=e31]: Cuenta (opcional)
        - textbox "Cuenta (opcional)" [ref=e32]
        - button "Crear cliente" [ref=e33] [cursor=pointer]
      - list [ref=e34]:
        - listitem [ref=e35]:
          - generic [ref=e36]:
            - strong [ref=e37]: Distribuidora del Sur Ltda.
            - generic [ref=e38]: "RUT: 99.888.777-6 · ID: 25"
          - button "Intentar eliminar a Distribuidora del Sur Ltda." [ref=e39] [cursor=pointer]: Eliminar
        - listitem [ref=e40]:
          - generic [ref=e41]:
            - strong [ref=e42]: Cliente creado por editor
            - generic [ref=e43]: "RUT: 33.333.333-3 · ID: 27"
          - button "Intentar eliminar a Cliente creado por editor" [ref=e44] [cursor=pointer]: Eliminar
        - listitem [ref=e45]:
          - generic [ref=e46]:
            - strong [ref=e47]: <script>alert("xss")</script>
            - generic [ref=e48]: "RUT: 12.345.678-9 · ID: 28"
          - button "Intentar eliminar a <script>alert(\"xss\")</script>" [ref=e49] [cursor=pointer]: Eliminar
        - listitem [ref=e50]:
          - generic [ref=e51]:
            - strong [ref=e52]: Creado por editor 1795388717710
            - generic [ref=e53]: "RUT: 22.222.222-2 · ID: 29"
          - button "Intentar eliminar a Creado por editor 1795388717710" [ref=e54] [cursor=pointer]: Eliminar
        - listitem [ref=e55]:
          - generic [ref=e56]:
            - strong [ref=e57]: Cliente E2E 1795388724441
            - generic [ref=e58]: "RUT: 76.111.222-3 · ID: 30"
          - button "Intentar eliminar a Cliente E2E 1795388724441" [ref=e59] [cursor=pointer]: Eliminar
  - status [ref=e60]: Cliente con ID 31 eliminado lógicamente con éxito.
```

# Test source

```ts
  1   | // Pruebas E2E de los flujos principales de Atlas (Playwright)
  2   | // Cada test indica el requisito de la ERS que valida.
  3   | const { test, expect } = require('@playwright/test');
  4   | const path = require('path');
  5   | 
  6   | const API = process.env.API_URL || 'http://localhost:5000';
  7   | const PASSWORD = 'Password123!';
  8   | 
  9   | async function login(page, email) {
  10  |   await page.goto('/');
  11  |   await page.getByLabel('Correo electrónico').fill(email);
  12  |   await page.getByLabel('Contraseña').fill(PASSWORD);
  13  |   await page.getByRole('button', { name: 'Ingresar al sistema' }).click();
  14  |   await expect(page.getByRole('heading', { name: 'Panel de control' })).toBeVisible();
  15  | }
  16  | 
  17  | async function tokenAdmin(request) {
  18  |   const r = await request.post(`${API}/api/auth/login`, { data: { email: 'admin@atlas.cl', password: PASSWORD } });
  19  |   return (await r.json()).token;
  20  | }
  21  | 
  22  | test.describe('Autenticación (RF-1)', () => {
  23  |   test('E2E-01 Login de administrador muestra el panel con su rol', async ({ page }) => {
  24  |     await login(page, 'admin@atlas.cl');
  25  |     await expect(page.getByText('Rol activo: ADMINISTRADOR')).toBeVisible();
  26  |   });
  27  | 
  28  |   test('E2E-02 Login con contraseña incorrecta muestra error genérico', async ({ page }) => {
  29  |     await page.goto('/');
  30  |     await page.getByLabel('Correo electrónico').fill('admin@atlas.cl');
  31  |     await page.getByLabel('Contraseña').fill('incorrecta');
  32  |     await page.getByRole('button', { name: 'Ingresar al sistema' }).click();
  33  |     await expect(page.locator('p.notice')).toHaveText('Credenciales inválidas');
  34  |   });
  35  | 
  36  |   test('E2E-03 Cerrar sesión elimina el token del navegador', async ({ page }) => {
  37  |     await login(page, 'admin@atlas.cl');
  38  |     await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  39  |     await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  40  |     expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
  41  |   });
  42  | });
  43  | 
  44  | test.describe('Gestión de clientes (RF-4)', () => {
  45  |   test('E2E-04 Administrador crea un cliente y aparece en la lista', async ({ page }) => {
  46  |     await login(page, 'admin@atlas.cl');
  47  |     const nombre = `Cliente E2E ${Date.now()}`;
  48  |     await page.getByLabel('Razón social').fill(nombre);
  49  |     await page.getByLabel('RUT').fill('76.111.222-3');
  50  |     await page.getByRole('button', { name: 'Crear cliente' }).click();
  51  |     await expect(page.locator('p.notice')).toContainText('creado correctamente');
  52  |     await expect(page.getByText(nombre, { exact: true })).toBeVisible();
  53  |   });
  54  | 
  55  |   test('E2E-05 Eliminar cliente solicita confirmación antes de la eliminación lógica', async ({ page }) => {
  56  |     await login(page, 'admin@atlas.cl');
  57  |     const nombre = `Cliente a eliminar ${Date.now()}`;
  58  |     await page.getByLabel('Razón social').fill(nombre);
  59  |     await page.getByLabel('RUT').fill('76.333.444-5');
  60  |     await page.getByRole('button', { name: 'Crear cliente' }).click();
  61  |     await expect(page.getByText(nombre, { exact: true })).toBeVisible();
  62  | 
  63  |     let pidioConfirmacion = false;
  64  |     page.on('dialog', async (dialog) => { pidioConfirmacion = true; await dialog.dismiss(); });
  65  |     await page.getByRole('button', { name: `Intentar eliminar a ${nombre}` }).click();
  66  |     await page.waitForTimeout(800);
> 67  |     expect(pidioConfirmacion, 'La ERS (RF-4) exige confirmación antes de eliminar').toBe(true);
      |                                                                                     ^ Error: La ERS (RF-4) exige confirmación antes de eliminar
  68  |   });
  69  | 
  70  |   test('E2E-06 Texto con <script> se muestra como texto y no se ejecuta (XSS reflejado en UI)', async ({ page }) => {
  71  |     let alertaEjecutada = false;
  72  |     page.on('dialog', async (dialog) => { alertaEjecutada = true; await dialog.dismiss(); });
  73  |     await login(page, 'admin@atlas.cl');
  74  |     await page.getByLabel('Razón social').fill('<img src=x onerror=alert(1)>');
  75  |     await page.getByLabel('RUT').fill('76.555.666-7');
  76  |     await page.getByRole('button', { name: 'Crear cliente' }).click();
  77  |     await expect(page.getByText('<img src=x onerror=alert(1)>', { exact: true })).toBeVisible();
  78  |     expect(alertaEjecutada).toBe(false);
  79  |   });
  80  | });
  81  | 
  82  | test.describe('Control de acceso por rol en la interfaz (RF-3, RB-4)', () => {
  83  |   test('E2E-07 Editor no ve la sección Auditoría', async ({ page }) => {
  84  |     await login(page, 'editor@atlas.cl');
  85  |     await expect(page.getByText('Rol activo: EDITOR')).toBeVisible();
  86  |     await expect(page.getByRole('button', { name: 'Auditoría' })).toHaveCount(0);
  87  |   });
  88  | 
  89  |   test('E2E-08 Editor no tiene disponible el formulario de creación de clientes', async ({ page }) => {
  90  |     await login(page, 'editor@atlas.cl');
  91  |     await expect(page.getByRole('button', { name: 'Crear cliente' }), 'RB-4: el editor solo tiene permisos de lectura').toHaveCount(0);
  92  |   });
  93  | 
  94  |   test('E2E-09 Editor que intenta eliminar recibe HTTP 403', async ({ page }) => {
  95  |     await login(page, 'editor@atlas.cl');
  96  |     await page.getByRole('button', { name: /Intentar eliminar a Distribuidora del Sur/ }).click();
  97  |     await expect(page.locator('p.notice')).toContainText('HTTP 403');
  98  |   });
  99  | });
  100 | 
  101 | test.describe('Contratos y documentos (RF-5)', () => {
  102 |   test('E2E-10 Administrador asocia un PDF a un contrato y se lista', async ({ page }) => {
  103 |     await login(page, 'admin@atlas.cl');
  104 |     await page.getByRole('button', { name: 'Contratos' }).click();
  105 |     await page.getByLabel('Cliente').selectOption({ label: /Distribuidora del Sur/ }).catch(async () => {
  106 |       await page.getByLabel('Cliente').selectOption({ index: 0 });
  107 |     });
  108 |     await page.getByLabel('Archivo PDF').setInputFiles(path.join(__dirname, 'fixtures', 'contrato_prueba.pdf'));
  109 |     await page.getByRole('button', { name: 'Asociar documento' }).click();
  110 |     await expect(page.getByRole('button', { name: 'Abrir PDF guardado' }).first()).toBeVisible();
  111 |   });
  112 | 
  113 |   test('E2E-11 Un pdf_url malicioso (javascript:) no debe generar un enlace ejecutable', async ({ page, request }) => {
  114 |     const token = await tokenAdmin(request);
  115 |     await request.post(`${API}/api/contratos/25/documentos`, {
  116 |       headers: { Authorization: `Bearer ${token}` },
  117 |       data: { pdf_url: 'javascript:alert(document.domain)' },
  118 |     });
  119 |     await login(page, 'admin@atlas.cl');
  120 |     await page.getByRole('button', { name: 'Contratos' }).click();
  121 |     const links = page.getByRole('link', { name: 'Abrir PDF' });
  122 |     await expect(links.first()).toBeVisible();
  123 |     const hrefs = await links.evaluateAll((els) => els.map((e) => e.getAttribute('href')));
  124 |     expect(hrefs.filter((h) => h && h.toLowerCase().startsWith('javascript:')), 'NFR-SEG-5: enlace con javascript: en la tabla').toHaveLength(0);
  125 |   });
  126 | });
  127 | 
```