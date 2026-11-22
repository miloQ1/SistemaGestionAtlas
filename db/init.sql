CREATE TABLE IF NOT EXISTS empresas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    rut VARCHAR(12) UNIQUE NOT NULL,
    direccion VARCHAR(200),
    correo VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    empresa_id INT REFERENCES empresas(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) CHECK (rol IN ('ADMINISTRADOR', 'EDITOR')) NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    empresa_id INT REFERENCES empresas(id) ON DELETE CASCADE,
    rut VARCHAR(12) NOT NULL,
    razon_social VARCHAR(150) NOT NULL,
    datos_bancarios JSONB,
    eliminado_logico BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contratos (
    id SERIAL PRIMARY KEY,
    cliente_id INT REFERENCES clientes(id) ON DELETE CASCADE,
    titulo VARCHAR(150) NOT NULL,
    monto NUMERIC(12, 2) NOT NULL,
    pdf_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auditoria_logs (
    id SERIAL PRIMARY KEY,
    usuario_id INT REFERENCES usuarios(id),
    accion VARCHAR(100) NOT NULL,
    detalle TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clientes_empresa_activo
    ON clientes (empresa_id, eliminado_logico);
CREATE INDEX IF NOT EXISTS idx_contratos_cliente
    ON contratos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_timestamp
    ON auditoria_logs (timestamp DESC);

INSERT INTO empresas (id, nombre, rut, direccion, correo)
VALUES (1, 'Transportes Bío Bío SpA', '76.543.210-K', 'Av. Prat 456, Concepción', 'contacto@biobio.cl')
ON CONFLICT (id) DO NOTHING;

INSERT INTO usuarios (empresa_id, nombre, email, password_hash, rol)
VALUES
    (1, 'Administrador Atlas', 'admin@atlas.cl', '$2a$10$8uNpVz4i2H0deke0hBNcoO1.ZiJGcFUuKpMG7bgSrp80ZUCuSK5M2', 'ADMINISTRADOR'),
    (1, 'Editor Atlas', 'editor@atlas.cl', '$2a$10$8uNpVz4i2H0deke0hBNcoO1.ZiJGcFUuKpMG7bgSrp80ZUCuSK5M2', 'EDITOR')
ON CONFLICT (email) DO NOTHING;

INSERT INTO clientes (id, empresa_id, rut, razon_social, datos_bancarios)
VALUES (25, 1, '99.888.777-6', 'Distribuidora del Sur Ltda.', '{"banco": "Banco de Chile", "cuenta": "00-12345-6"}')
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('empresas', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM empresas), 1));
SELECT setval(pg_get_serial_sequence('usuarios', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM usuarios), 1));
SELECT setval(pg_get_serial_sequence('clientes', 'id'), GREATEST((SELECT COALESCE(MAX(id), 1) FROM clientes), 1));
