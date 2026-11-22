// Pruebas E2E de los flujos principales de Atlas (Playwright)
// Cada test indica el requisito de la ERS que valida.
const { test, expect } = require('@playwright/test');
const path = require('path');

const API = process.env.API_URL || 'http://localhost:5000';
const PASSWORD = 'Password123!';

async function login(page, email) {
  await page.goto('/');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña').fill(PASSWORD);
  await page.getByRole('button', { name: 'Ingresar al sistema' }).click();
  await expect(page.getByRole('heading', { name: 'Panel de control' })).toBeVisible();
}

async function tokenAdmin(request) {
  const r = await request.post(`${API}/api/auth/login`, { data: { email: 'admin@atlas.cl', password: PASSWORD } });
  return (await r.json()).token;
}

test.describe('Autenticación (RF-1)', () => {
  test('E2E-01 Login de administrador muestra el panel con su rol', async ({ page }) => {
    await login(page, 'admin@atlas.cl');
    await expect(page.getByText('Rol activo: ADMINISTRADOR')).toBeVisible();
  });

  test('E2E-02 Login con contraseña incorrecta muestra error genérico', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Correo electrónico').fill('admin@atlas.cl');
    await page.getByLabel('Contraseña').fill('incorrecta');
    await page.getByRole('button', { name: 'Ingresar al sistema' }).click();
    await expect(page.locator('p.notice')).toHaveText('Credenciales inválidas');
  });

  test('E2E-03 Cerrar sesión elimina el token del navegador', async ({ page }) => {
    await login(page, 'admin@atlas.cl');
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
  });
});

test.describe('Gestión de clientes (RF-4)', () => {
  test('E2E-04 Administrador crea un cliente y aparece en la lista', async ({ page }) => {
    await login(page, 'admin@atlas.cl');
    const nombre = `Cliente E2E ${Date.now()}`;
    await page.getByLabel('Razón social').fill(nombre);
    await page.getByLabel('RUT').fill('76.111.222-3');
    await page.getByRole('button', { name: 'Crear cliente' }).click();
    await expect(page.locator('p.notice')).toContainText('creado correctamente');
    await expect(page.getByText(nombre, { exact: true })).toBeVisible();
  });

  test('E2E-05 Eliminar cliente solicita confirmación antes de la eliminación lógica', async ({ page }) => {
    await login(page, 'admin@atlas.cl');
    const nombre = `Cliente a eliminar ${Date.now()}`;
    await page.getByLabel('Razón social').fill(nombre);
    await page.getByLabel('RUT').fill('76.333.444-5');
    await page.getByRole('button', { name: 'Crear cliente' }).click();
    await expect(page.getByText(nombre, { exact: true })).toBeVisible();

    let pidioConfirmacion = false;
    page.on('dialog', async (dialog) => { pidioConfirmacion = true; await dialog.dismiss(); });
    await page.getByRole('button', { name: `Intentar eliminar a ${nombre}` }).click();
    await page.waitForTimeout(800);
    expect(pidioConfirmacion, 'La ERS (RF-4) exige confirmación antes de eliminar').toBe(true);
  });

  test('E2E-06 Texto con <script> se muestra como texto y no se ejecuta (XSS reflejado en UI)', async ({ page }) => {
    let alertaEjecutada = false;
    page.on('dialog', async (dialog) => { alertaEjecutada = true; await dialog.dismiss(); });
    await login(page, 'admin@atlas.cl');
    await page.getByLabel('Razón social').fill('<img src=x onerror=alert(1)>');
    await page.getByLabel('RUT').fill('76.555.666-7');
    await page.getByRole('button', { name: 'Crear cliente' }).click();
    await expect(page.getByText('<img src=x onerror=alert(1)>', { exact: true })).toBeVisible();
    expect(alertaEjecutada).toBe(false);
  });
});

test.describe('Control de acceso por rol en la interfaz (RF-3, RB-4)', () => {
  test('E2E-07 Editor no ve la sección Auditoría', async ({ page }) => {
    await login(page, 'editor@atlas.cl');
    await expect(page.getByText('Rol activo: EDITOR')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Auditoría' })).toHaveCount(0);
  });

  test('E2E-08 Editor no tiene disponible el formulario de creación de clientes', async ({ page }) => {
    await login(page, 'editor@atlas.cl');
    await expect(page.getByRole('button', { name: 'Crear cliente' }), 'RB-4: el editor solo tiene permisos de lectura').toHaveCount(0);
  });

  test('E2E-09 Editor que intenta eliminar recibe HTTP 403', async ({ page }) => {
    await login(page, 'editor@atlas.cl');
    await page.getByRole('button', { name: /Intentar eliminar a Distribuidora del Sur/ }).click();
    await expect(page.locator('p.notice')).toContainText('HTTP 403');
  });
});

test.describe('Contratos y documentos (RF-5)', () => {
  test('E2E-10 Administrador asocia un PDF a un contrato y se lista', async ({ page }) => {
    await login(page, 'admin@atlas.cl');
    await page.getByRole('button', { name: 'Contratos' }).click();
    await page.getByLabel('Cliente').selectOption({ label: /Distribuidora del Sur/ }).catch(async () => {
      await page.getByLabel('Cliente').selectOption({ index: 0 });
    });
    await page.getByLabel('Archivo PDF').setInputFiles(path.join(__dirname, 'fixtures', 'contrato_prueba.pdf'));
    await page.getByRole('button', { name: 'Asociar documento' }).click();
    await expect(page.getByRole('button', { name: 'Abrir PDF guardado' }).first()).toBeVisible();
  });

  test('E2E-11 Un pdf_url malicioso (javascript:) no debe generar un enlace ejecutable', async ({ page, request }) => {
    const token = await tokenAdmin(request);
    await request.post(`${API}/api/contratos/25/documentos`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { pdf_url: 'javascript:alert(document.domain)' },
    });
    await login(page, 'admin@atlas.cl');
    await page.getByRole('button', { name: 'Contratos' }).click();
    const links = page.getByRole('link', { name: 'Abrir PDF' });
    await expect(links.first()).toBeVisible();
    const hrefs = await links.evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(hrefs.filter((h) => h && h.toLowerCase().startsWith('javascript:')), 'NFR-SEG-5: enlace con javascript: en la tabla').toHaveLength(0);
  });
});
