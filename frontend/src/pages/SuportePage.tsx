import { useRef, useState } from 'react';
import { ApiService } from '../services/api';

const MAX_ANEXOS = 5;
const MAX_POR_ARQUIVO = 5 * 1024 * 1024;
const MAX_TOTAL = 10 * 1024 * 1024;
const EMOJIS = ['😀', '😊', '😉', '😍', '🙂', '😅', '😂', '🤔', '😢', '😡', '👍', '👏', '🙏', '💪', '🎉', '❤️', '🔥', '✅', '⚠️', '❓'];

function tamanho(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function ComporEmail({ onClose }: { onClose: () => void }) {
  const [assunto, setAssunto] = useState('');
  const [minimizado, setMinimizado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [anexos, setAnexos] = useState<File[]>([]);
  const [formatacao, setFormatacao] = useState(false);
  const [emojis, setEmojis] = useState(false);
  const [linkAberto, setLinkAberto] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const editorRef = useRef<HTMLDivElement>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const fotoRef = useRef<HTMLInputElement>(null);
  const selecaoRef = useRef<Range | null>(null);

  function guardarSelecao() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && editorRef.current?.contains(sel.anchorNode)) {
      selecaoRef.current = sel.getRangeAt(0).cloneRange();
    }
  }

  function restaurarSelecao() {
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (sel && selecaoRef.current) {
      sel.removeAllRanges();
      sel.addRange(selecaoRef.current);
    }
  }

  function comando(cmd: string, valor?: string) {
    restaurarSelecao();
    document.execCommand(cmd, false, valor);
    guardarSelecao();
  }

  function inserirLink() {
    let url = linkUrl.trim();
    if (!url) return;
    if (!/^(https?:\/\/|mailto:)/i.test(url)) url = 'https://' + url;
    restaurarSelecao();
    const sel = window.getSelection();
    if (sel && sel.isCollapsed) {
      const seguro = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
      document.execCommand('insertHTML', false, `<a href="${seguro}">${seguro}</a>&nbsp;`);
    } else {
      document.execCommand('createLink', false, url);
    }
    guardarSelecao();
    setLinkUrl('');
    setLinkAberto(false);
  }

  function inserirEmoji(e: string) {
    restaurarSelecao();
    document.execCommand('insertText', false, e);
    guardarSelecao();
    setEmojis(false);
  }

  function adicionarArquivos(lista: FileList | null, somenteImagens = false) {
    if (!lista) return;
    let atuais = [...anexos];
    for (const f of Array.from(lista)) {
      if (somenteImagens && !f.type.startsWith('image/')) {
        setFeedback({ tipo: 'erro', texto: 'Selecione apenas imagens.' });
        continue;
      }
      if (atuais.length >= MAX_ANEXOS) {
        setFeedback({ tipo: 'erro', texto: `Máximo de ${MAX_ANEXOS} anexos.` });
        break;
      }
      if (f.size > MAX_POR_ARQUIVO) {
        setFeedback({ tipo: 'erro', texto: `${f.name} passa de 5 MB.` });
        continue;
      }
      if (atuais.reduce((t, x) => t + x.size, 0) + f.size > MAX_TOTAL) {
        setFeedback({ tipo: 'erro', texto: 'O total dos anexos passa de 10 MB.' });
        continue;
      }
      atuais = [...atuais, f];
      setFeedback(null);
    }
    setAnexos(atuais);
  }

  async function enviar() {
    const html = editorRef.current?.innerHTML || '';
    const texto = editorRef.current?.innerText.trim() || '';
    if (!assunto.trim() || !texto) {
      setFeedback({ tipo: 'erro', texto: 'Preencha o assunto e a mensagem.' });
      return;
    }
    setEnviando(true);
    setFeedback(null);
    try {
      const form = new FormData();
      form.append('assunto', assunto.trim());
      form.append('mensagem', html);
      anexos.forEach((f) => form.append('anexos', f));
      await ApiService.postForm('/api/suporte/enviar/', form);
      setFeedback({ tipo: 'ok', texto: 'Mensagem enviada com sucesso!' });
      setTimeout(onClose, 1800);
    } catch (err: any) {
      setFeedback({ tipo: 'erro', texto: err?.data?.detail || 'Não foi possível enviar. Tente novamente.' });
    } finally {
      setEnviando(false);
    }
  }

  const campo: React.CSSProperties = {
    width: '100%', border: 'none', outline: 'none', background: 'transparent',
    fontSize: 14, color: '#202124', fontFamily: 'inherit', padding: '10px 0',
  };
  const iconeBtn = (ativo = false): React.CSSProperties => ({
    background: ativo ? '#e8eaed' : 'none', border: 'none', cursor: 'pointer', color: '#444746',
    width: 32, height: 32, borderRadius: 6, fontSize: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  });
  const mantemFoco = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div
      style={{
        position: 'fixed', right: 24, bottom: 0, width: 'min(520px, calc(100vw - 32px))',
        background: '#fff', borderRadius: '10px 10px 0 0', boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
        zIndex: 9999, display: 'flex', flexDirection: 'column', color: '#202124',
      }}
    >
      <div
        style={{ background: '#f2f6fc', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderRadius: '10px 10px 0 0' }}
        onClick={() => setMinimizado((m) => !m)}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: '#1f1f1f' }}>Nova mensagem</span>
        <span style={{ display: 'flex', gap: 14 }} onClick={(e) => e.stopPropagation()}>
          <button onClick={() => setMinimizado((m) => !m)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#444' }} aria-label="Minimizar">
            <i className="fa-solid fa-minus" />
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#444' }} aria-label="Fechar">
            <i className="fa-solid fa-xmark" />
          </button>
        </span>
      </div>

      <div style={{ display: minimizado ? 'none' : 'block' }}>
        <div style={{ padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #e8eaed', gap: 8 }}>
            <span style={{ fontSize: 14, color: '#5f6368' }}>Para</span>
            <span style={{ fontSize: 14, padding: '10px 0', color: '#0b57d0', fontWeight: 500 }}>Suporte Orcoma Academy</span>
          </div>
          <div style={{ borderBottom: '1px solid #e8eaed' }}>
            <input style={campo} placeholder="Assunto" value={assunto} maxLength={150} onChange={(e) => setAssunto(e.target.value)} />
          </div>
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onKeyUp={guardarSelecao}
            onMouseUp={guardarSelecao}
            onBlur={guardarSelecao}
            style={{ ...campo, height: 220, overflowY: 'auto', lineHeight: 1.5, wordBreak: 'break-word' }}
          />
        </div>

        {anexos.length > 0 && (
          <div style={{ padding: '0 16px 8px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {anexos.map((f, i) => (
              <div key={f.name + i} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #dadce0', borderRadius: 8, padding: '4px 8px', fontSize: 12, maxWidth: 230 }}>
                {f.type.startsWith('image/') ? (
                  <img src={URL.createObjectURL(f)} alt="" style={{ width: 26, height: 26, objectFit: 'cover', borderRadius: 4 }} />
                ) : (
                  <i className="fa-solid fa-file" style={{ color: '#5f6368' }} />
                )}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                <span style={{ color: '#5f6368', flexShrink: 0 }}>{tamanho(f.size)}</span>
                <button onClick={() => setAnexos(anexos.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5f6368' }} aria-label="Remover anexo">
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
            ))}
          </div>
        )}

        {formatacao && (
          <div style={{ padding: '0 16px 6px', display: 'flex', gap: 2 }}>
            <button onMouseDown={mantemFoco} onClick={() => comando('bold')} style={iconeBtn()} title="Negrito"><i className="fa-solid fa-bold" /></button>
            <button onMouseDown={mantemFoco} onClick={() => comando('italic')} style={iconeBtn()} title="Itálico"><i className="fa-solid fa-italic" /></button>
            <button onMouseDown={mantemFoco} onClick={() => comando('underline')} style={iconeBtn()} title="Sublinhado"><i className="fa-solid fa-underline" /></button>
            <button onMouseDown={mantemFoco} onClick={() => comando('insertUnorderedList')} style={iconeBtn()} title="Lista com marcadores"><i className="fa-solid fa-list-ul" /></button>
            <button onMouseDown={mantemFoco} onClick={() => comando('insertOrderedList')} style={iconeBtn()} title="Lista numerada"><i className="fa-solid fa-list-ol" /></button>
            <button onMouseDown={mantemFoco} onClick={() => comando('removeFormat')} style={iconeBtn()} title="Limpar formatação"><i className="fa-solid fa-text-slash" /></button>
          </div>
        )}

        {linkAberto && (
          <div style={{ padding: '0 16px 8px', display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              autoFocus
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); inserirLink(); } }}
              placeholder="Cole o link (https://...)"
              style={{ flex: 1, border: '1px solid #dadce0', borderRadius: 6, padding: '6px 10px', fontSize: 13, outline: 'none', color: '#202124' }}
            />
            <button onClick={inserirLink} style={{ background: '#0b57d0', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}>Inserir</button>
          </div>
        )}

        <div style={{ position: 'relative', padding: '8px 16px 12px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={enviar}
            disabled={enviando}
            style={{
              background: '#0b57d0', color: '#fff', border: 'none', borderRadius: 18, padding: '9px 24px', marginRight: 10,
              fontSize: 14, fontWeight: 600, cursor: enviando ? 'default' : 'pointer', opacity: enviando ? 0.7 : 1,
            }}
          >
            {enviando ? 'Enviando...' : 'Enviar'}
          </button>

          <button onMouseDown={mantemFoco} onClick={() => setFormatacao((v) => !v)} style={{ ...iconeBtn(formatacao), fontWeight: 600 }} title="Opções de formatação">Aa</button>
          <button onClick={() => arquivoRef.current?.click()} style={iconeBtn()} title="Anexar arquivos"><i className="fa-solid fa-paperclip" /></button>
          <button onMouseDown={mantemFoco} onClick={() => { guardarSelecao(); setLinkAberto((v) => !v); }} style={iconeBtn(linkAberto)} title="Inserir link"><i className="fa-solid fa-link" /></button>
          <button onMouseDown={mantemFoco} onClick={() => setEmojis((v) => !v)} style={iconeBtn(emojis)} title="Inserir emoji"><i className="fa-regular fa-face-smile" /></button>
          <button onClick={() => fotoRef.current?.click()} style={iconeBtn()} title="Inserir foto"><i className="fa-regular fa-image" /></button>
          <span style={{ flex: 1 }} />
          <button onClick={onClose} style={iconeBtn()} title="Descartar rascunho"><i className="fa-regular fa-trash-can" /></button>

          {emojis && (
            <div style={{ position: 'absolute', bottom: 54, left: 150, background: '#fff', border: '1px solid #dadce0', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', padding: 8, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 2 }}>
              {EMOJIS.map((e) => (
                <button key={e} onMouseDown={mantemFoco} onClick={() => inserirEmoji(e)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: 4, borderRadius: 6 }}>{e}</button>
              ))}
            </div>
          )}

          <input
            ref={arquivoRef}
            type="file"
            multiple
            hidden
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.gif,.webp"
            onChange={(e) => { adicionarArquivos(e.target.files); e.target.value = ''; }}
          />
          <input
            ref={fotoRef}
            type="file"
            multiple
            hidden
            accept="image/*"
            onChange={(e) => { adicionarArquivos(e.target.files, true); e.target.value = ''; }}
          />
        </div>

        {feedback && (
          <div style={{ padding: '0 16px 12px', fontSize: 13, color: feedback.tipo === 'ok' ? '#188038' : '#d93025' }}>{feedback.texto}</div>
        )}
      </div>
    </div>
  );
}

export function SuportePage() {
  const [aberto, setAberto] = useState(false);

  return (
    <div style={{ padding: '12px 24px' }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: '1.3125rem', fontWeight: 800, marginBottom: '16px', color: '#ff9d00' }}>Ajuda / Suporte</h1>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px' }}>Precisa de ajuda ou tem alguma sugestão de melhoria para a nossa plataforma? Entre em contato com nossa equipe de suporte. Teremos prazer em te ajudar!</p>
        <button type="button" onClick={() => setAberto(true)} className="btn-hero" style={{ display: 'inline-flex', cursor: 'pointer' }}>
          Enviar email <i className="fa-solid fa-arrow-right"></i>
        </button>
      </div>
      {aberto && <ComporEmail onClose={() => setAberto(false)} />}
    </div>
  );
}
