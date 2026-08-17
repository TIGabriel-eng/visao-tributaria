import { useState, useCallback } from 'react';
import type { Review } from '../../types';

interface RatingSystemProps {
  reviews: Review[];
  averageStars: number;
  totalReviews: number;
  onPostReview: (nota: number, comentario: string) => void;
  isPosting?: boolean;
}

function corDoNome(nome: string): string {
  let hash = 0;
  for (let i = 0; i < nome.length; i++) {
    hash = nome.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['#f59e0b', '#c6853a', '#ef4444', '#10b981', '#8b5cf6', '#ec4899', '#8a4d23', '#84cc16'];
  return colors[Math.abs(hash) % colors.length];
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return Math.floor(diff / 60) + ' min atrás';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h atrás';
  if (diff < 2592000) return Math.floor(diff / 86400) + 'd atrás';
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

export function RatingSystem({ reviews, averageStars, totalReviews, onPostReview, isPosting }: RatingSystemProps) {
  const [composerRating, setComposerRating] = useState(0);
  const [composerText, setComposerText] = useState('');

  const handleSubmit = useCallback(() => {
    if (!composerText.trim() || composerRating === 0) return;
    onPostReview(composerRating, composerText.trim());
    setComposerText('');
    setComposerRating(0);
  }, [composerText, composerRating, onPostReview]);

  return (
    <div className="va-rating">
      <div className="va-rating__summary">
        <div className="va-rating__stars-display">
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={'va-star' + (i <= Math.round(averageStars) ? ' lit' : '')}>★</span>
          ))}
        </div>
        <span className="va-rating__label">
          <strong>{totalReviews > 0 ? averageStars.toFixed(1) : '—'}/5</strong>
          {totalReviews > 0 && <span> ({totalReviews} {totalReviews === 1 ? 'avaliação' : 'avaliações'})</span>}
        </span>
      </div>

      <div className="va-review-composer">
        <div className="va-review-composer__stars">
          {[1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className={'va-star clickable' + (i <= composerRating ? ' lit' : '')}
              onClick={() => setComposerRating(i)}
              role="button"
              tabIndex={0}
              aria-label={i + ' estrela' + (i > 1 ? 's' : '')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setComposerRating(i); } }}
            >
              ★
            </span>
          ))}
        </div>
        <textarea
          className="va-review-composer__textarea"
          value={composerText}
          onChange={(e) => setComposerText(e.target.value)}
          placeholder="Escreva seu comentário e avaliação sobre este módulo..."
          maxLength={2000}
          rows={3}
        />
        <div className="va-review-composer__footer">
          <button
            className="va-btn-accent"
            onClick={handleSubmit}
            disabled={!composerText.trim() || composerRating === 0 || isPosting}
          >
            {isPosting ? 'Enviando...' : 'Postar avaliação'}
          </button>
        </div>
      </div>

      <div className="va-reviews-list">
        {reviews.length === 0 ? (
          <div className="va-reviews-empty">
            <i className="fa-regular fa-comment-dots" style={{ fontSize: '2rem', opacity: 0.3 }} />
            <p>Ninguém avaliou ainda!</p>
          </div>
        ) : (
          reviews.map((r, idx) => (
            <div key={r.id || idx} className="va-review-card">
              <div className="va-review-card__header">
                {r.usuario_avatar ? (
                  <img src={r.usuario_avatar} alt={r.usuario_nome || 'Avatar'} className="va-review-card__avatar" />
                ) : (
                  <div
                    className="va-review-card__avatar va-review-card__avatar--initial"
                    style={{ background: corDoNome(r.usuario_nome || '?') }}
                  >
                    {(r.usuario_nome || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="va-review-card__info">
                  <span className="va-review-card__name">{r.usuario_nome || 'Usuário'}</span>
                  <span className="va-review-card__date">{timeAgo(r.created_at)}</span>
                </div>
                <div className="va-review-card__stars">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className={'va-star' + (i <= r.nota ? ' lit' : '')}>★</span>
                  ))}
                </div>
              </div>
              <p className="va-review-card__comment">{r.comentario}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
