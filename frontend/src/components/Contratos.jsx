import { useCallback, useEffect, useState } from 'react';
import { readPdf, removePdf, storePdf } from '../services/pdfStorage.js';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const LOCAL_PDF_PREFIX = 'atlas-browser:';

export default function Contratos({ user, onMessage }) {
  const [clientes, setClientes] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [previewPdf, setPreviewPdf] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${user.token}` };
      const [clientsResponse, contractsResponse] = await Promise.all([
        fetch(`${apiUrl}/api/clientes`, { headers }),
        fetch(`${apiUrl}/api/contratos`, { headers }),
      ]);
      const [clientsData, contractsData] = await Promise.all([
        clientsResponse.json(),
        contractsResponse.json(),
      ]);
      if (!clientsResponse.ok || !contractsResponse.ok) {
        onMessage(clientsData.error || contractsData.error || 'No fue posible cargar los contratos.');
        return;
      }
      setClientes(clientsData);
      setContratos(contractsData);
      setClienteId((current) => current || (clientsData[0] ? String(clientsData[0].id) : ''));
    } catch (error) {
      onMessage('Error conectando al servidor Atlas.');
    } finally {
      setLoading(false);
    }
  }, [onMessage, user.token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => () => {
    if (previewPdf) {
      URL.revokeObjectURL(previewPdf.url);
    }
  }, [previewPdf]);

  async function handleSubmit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    if (!clienteId) {
      onMessage('Registra o selecciona un cliente antes de asociar un documento.');
      return;
    }
    if (!pdfFile) {
      onMessage('Selecciona un archivo PDF para guardarlo en este navegador.');
      return;
    }

    let storedPdfId;
    setSubmitting(true);
    try {
      storedPdfId = await storePdf(pdfFile);
      const response = await fetch(`${apiUrl}/api/contratos/${clienteId}/documentos`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pdf_url: storedPdfId }),
      });
      const data = await response.json();
      if (!response.ok) {
        await removePdf(storedPdfId);
        storedPdfId = null;
        onMessage(data.error || 'No fue posible registrar el documento.');
        return;
      }
      storedPdfId = null;
      setPdfFile(null);
      formElement.reset();
      onMessage(`${data.mensaje}. El PDF quedó guardado en este navegador.`);
      await loadData();
    } catch (error) {
      if (storedPdfId) {
        try {
          await removePdf(storedPdfId);
        } catch (cleanupError) {
          console.error('No se pudo limpiar el PDF sin contrato asociado:', cleanupError);
        }
      }
      onMessage(error.message || 'No se pudo guardar el PDF y asociarlo al contrato.');
    } finally {
      setSubmitting(false);
    }
  }

  async function openPdf(contrato) {
    if (!contrato.pdf_url.startsWith(LOCAL_PDF_PREFIX)) {
      window.open(contrato.pdf_url, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      const storedPdf = await readPdf(contrato.pdf_url);
      if (!storedPdf) {
        onMessage('Este PDF no está disponible en el almacenamiento de este navegador.');
        return;
      }
      setPreviewPdf({
        fileName: storedPdf.fileName,
        url: URL.createObjectURL(storedPdf.blob),
      });
    } catch (error) {
      onMessage(error.message || 'No se pudo abrir el PDF guardado en este navegador.');
    }
  }

  return (
    <section className="card" aria-labelledby="contracts-heading">
      <div className="section-heading">
        <div>
          <h2 id="contracts-heading">Contratos y documentos</h2>
          <p>El PDF seleccionado se guarda en el almacenamiento de este navegador y no se sube al servidor.</p>
        </div>
        <button type="button" className="secondary-button" onClick={loadData} disabled={loading}>
          Actualizar
        </button>
      </div>
      <form className="inline-form" onSubmit={handleSubmit}>
        <label htmlFor="contract-client">Cliente</label>
        <select
          id="contract-client"
          value={clienteId}
          onChange={(event) => setClienteId(event.target.value)}
          disabled={loading || clientes.length === 0}
          required
        >
          {clientes.length === 0 ? (
            <option value="">No hay clientes disponibles</option>
          ) : clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.razon_social} (RUT: {cliente.rut})
            </option>
          ))}
        </select>
        <label htmlFor="pdf-file">Archivo PDF</label>
        <input
          id="pdf-file"
          type="file"
          accept="application/pdf,.pdf"
          onChange={(event) => {
            const file = event.target.files?.[0] || null;
            if (file && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
              setPdfFile(null);
              event.target.value = '';
              onMessage('El archivo seleccionado no es un PDF.');
              return;
            }
            setPdfFile(file);
          }}
          required
        />
        <button type="submit" disabled={submitting || loading || clientes.length === 0}>
          {submitting ? 'Guardando…' : 'Asociar documento'}
        </button>
      </form>
      {loading ? <p role="status">Cargando contratos…</p> : contratos.length === 0 ? (
        <p>No hay contratos registrados.</p>
      ) : (
        <div className="table-wrap">
          <table>
            <caption>Contratos de la empresa</caption>
            <thead>
              <tr><th scope="col">ID</th><th scope="col">Cliente</th><th scope="col">Título</th><th scope="col">Monto</th><th scope="col">Documento</th></tr>
            </thead>
            <tbody>
              {contratos.map((contrato) => (
                <tr key={contrato.id}>
                  <td>{contrato.id}</td>
                  <td>{clientes.find((cliente) => cliente.id === contrato.cliente_id)?.razon_social || `Cliente ${contrato.cliente_id}`}</td>
                  <td>{contrato.titulo}</td>
                  <td>{Number(contrato.monto).toLocaleString('es-CL')}</td>
                  <td>{contrato.pdf_url ? (
                    contrato.pdf_url.startsWith(LOCAL_PDF_PREFIX) ? (
                      <button type="button" className="link-button" onClick={() => openPdf(contrato)}>
                        Abrir PDF guardado
                      </button>
                    ) : (
                      <a href={contrato.pdf_url} target="_blank" rel="noreferrer">Abrir PDF</a>
                    )
                  ) : 'Sin documento'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {previewPdf && (
        <section className="pdf-preview" aria-label={`Vista previa de ${previewPdf.fileName}`}>
          <div className="section-heading">
            <h3>{previewPdf.fileName}</h3>
            <button type="button" className="secondary-button" onClick={() => setPreviewPdf(null)}>
              Cerrar vista previa
            </button>
          </div>
          <iframe title={`Vista previa de ${previewPdf.fileName}`} src={previewPdf.url} />
        </section>
      )}
    </section>
  );
}
