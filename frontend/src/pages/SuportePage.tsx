export function SuportePage() {
  return (
    <div style={{ padding: '12px 24px' }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: '1.3125rem', fontWeight: 800, marginBottom: '16px', color: '#191919' }}>Suporte</h1>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px' }}>Precisa de ajuda? Entre em contato com nossa equipe de suporte.</p>
        <a href="mailto:suporte@orcoma.com.br" className="btn-hero" style={{ display: 'inline-flex' }}>Enviar email <i className="fa-solid fa-arrow-right"></i></a>
      </div>
    </div>
  );
}