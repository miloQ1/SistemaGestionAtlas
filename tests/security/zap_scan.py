"""
Escaneo DAST de Atlas con OWASP ZAP (modo daemon).
Uso: python zap_scan.py  (ZAP debe estar corriendo en 127.0.0.1:8090 con api.key=atlaskey)
1. Obtiene un token de admin para poder escanear rutas protegidas.
2. Agrega el header Authorization a todas las peticiones (regla Replacer).
3. Ejecuta Spider sobre el frontend y siembra los endpoints de la API.
4. Ejecuta el escaneo activo y genera reporte HTML + JSON.
"""
import json, time, requests, sys, os
from zapv2 import ZAPv2

FRONT = os.getenv("FRONT_URL", "http://localhost:3000")
API = os.getenv("API_URL", "http://localhost:5000")
OUT = sys.argv[1] if len(sys.argv) > 1 else "."
zap = ZAPv2(apikey="atlaskey", proxies={"http": "http://127.0.0.1:8090", "https": "http://127.0.0.1:8090"})
proxies = {"http": "http://127.0.0.1:8090"}

token = requests.post(f"{API}/api/auth/login", json={"email": "admin@atlas.cl", "password": "Password123!"}).json()["token"]
zap.replacer.add_rule(description="auth", enabled=True, matchtype="REQ_HEADER",
                      matchregex=False, matchstring="Authorization", replacement=f"Bearer {token}")

# Sembrar endpoints de la API a través del proxy de ZAP
h = {"Content-Type": "application/json"}
requests.get(f"{API}/api/health", proxies=proxies)
requests.post(f"{API}/api/auth/login", json={"email": "admin@atlas.cl", "password": "x"}, proxies=proxies)
requests.get(f"{API}/api/clientes", proxies=proxies)
requests.post(f"{API}/api/clientes", json={"rut": "11.111.111-1", "razon_social": "Cliente ZAP"}, proxies=proxies)
requests.get(f"{API}/api/contratos", proxies=proxies)
requests.post(f"{API}/api/contratos/25/documentos", json={"pdf_url": "/uploads/zap.pdf"}, proxies=proxies)
requests.get(f"{API}/api/auditoria", proxies=proxies)

print("Spider frontend...")
sid = zap.spider.scan(FRONT)
while int(zap.spider.status(sid)) < 100: time.sleep(2)
zap.core.access_url(FRONT)
time.sleep(5)

for target in (FRONT, API):
    print("Active scan", target)
    aid = zap.ascan.scan(target, recurse=True)
    while int(zap.ascan.status(aid)) < 100:
        print("  progreso", zap.ascan.status(aid), "%"); time.sleep(10)

alerts = zap.core.alerts()
with open(os.path.join(OUT, "zap_alerts.json"), "w") as f: json.dump(alerts, f, indent=2, ensure_ascii=False)
with open(os.path.join(OUT, "zap_report.html"), "w") as f: f.write(zap.core.htmlreport())
resumen = {}
for a in alerts:
    k = (a["risk"], a["alert"]); resumen.setdefault(k, set()).add(a["url"])
for (risk, name), urls in sorted(resumen.items()):
    print(f"[{risk}] {name} ({len(urls)} URL)")
