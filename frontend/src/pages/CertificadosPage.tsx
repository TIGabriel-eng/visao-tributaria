import { useEffect, useState } from 'react';
import { ApiService } from '../services/api';

interface Certificado {
  id: number;
  codigo: string;
  emitido_em: string;
  curso_titulo: string;
  curso_duracao: string | null;
  aluno_nome: string;
  download_url: string;
}

function abrirCertificado(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function CertificadosPage() {
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ApiService.get('/api/certificados/')
      .then((data) => setCertificados(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: '12px 24px' }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: '1.3125rem', fontWeight: 800, marginBottom: '16px', color: '#191919' }}>Meus Certificados</h1>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-muted)' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
          <p style={{ marginTop: '12px' }}>Carregando certificados...</p>
        </div>
      ) : certificados.length === 0 ? (
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '60px 24px', textAlign: 'center' }}>
          <i className="fa-solid fa-certificate" style={{ fontSize: '3rem', color: 'var(--color-accent)', marginBottom: '16px', display: 'block' }}></i>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', fontWeight: 600, marginBottom: '8px' }}>Nenhum certificado ainda</p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Complete cursos para gerar certificados</p>
        </div>
      ) : (
        <div className="cursos-grid">
          {certificados.map((cert) => (
            <div
              key={cert.id}
              className="curso-card"
              onClick={() => abrirCertificado(cert.download_url)}
            >
              <div className="curso-card__image">
                <div className="cert-thumb">
                  <span className="cert-thumb__badge"><i className="fa-solid fa-award"></i> Certificado</span>
                  <span className="cert-thumb__course">{cert.curso_titulo}</span>
                  <span className="cert-thumb__name">{cert.aluno_nome}</span>
                  <span className="cert-thumb__code">Código: {cert.codigo}</span>
                </div>
                <span className="curso-card__status status-concluido">Concluído</span>
              </div>
              <div className="curso-card__name">{cert.curso_titulo}</div>
              <div className="curso-card__divider"></div>
              <div className="curso-card__meta">
                <span><i className="fa-solid fa-calendar"></i> {new Date(cert.emitido_em).toLocaleDateString('pt-BR')}</span>
                <span className="certificado-link" onClick={(e) => { e.stopPropagation(); abrirCertificado(cert.download_url); }}>
                  <i className="fa-solid fa-download"></i> Baixar
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
