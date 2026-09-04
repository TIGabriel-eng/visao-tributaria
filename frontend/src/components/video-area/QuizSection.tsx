import { useMemo, useState } from 'react';
import { ApiService } from '../../services/api';
import type { AlunoQuiz, QuizResultado } from '../../types';

interface QuizSectionProps {
  videoId?: number | string;
  cursoId?: number | string;
  mode?: 'video' | 'prova';
  quiz: AlunoQuiz | null;
  onSubmitted?: (resultado: QuizResultado) => void;
  onPassed?: () => void;
  onFailed?: () => void;
  onAbort?: () => void;
}

export function QuizSection({ mode = 'video', quiz, onSubmitted, onPassed, onFailed, onAbort }: QuizSectionProps) {
  const [respostas, setRespostas] = useState<Record<number, number>>({});
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<QuizResultado | null>(null);
  const [showModal, setShowModal] = useState(false);

  const perguntas = useMemo(() => quiz?.perguntas || [], [quiz]);
  const isProva = mode === 'prova';

  const respondidas = perguntas.filter((p) => typeof respostas[p.id] === 'number').length;
  const progressoPct = perguntas.length > 0 ? Math.round((respondidas / perguntas.length) * 100) : 0;
  const todasRespondidas = perguntas.length > 0 && respondidas === perguntas.length;

  const handleSelect = (perguntaId: number, alternativaId: number) => {
    if (enviando || resultado) return;
    setRespostas((prev) => ({ ...prev, [perguntaId]: alternativaId }));
  };

  const handleSubmit = async () => {
    if (!quiz || !todasRespondidas || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      const payload = perguntas.map((p) => ({
        pergunta_id: p.id,
        alternativa_id: respostas[p.id],
      }));
      const data: QuizResultado = await ApiService.submitQuiz(quiz.id, payload);
      setResultado(data);
      if (onSubmitted) onSubmitted(data);
      setShowModal(true);
    } catch (err: any) {
      setErro(err?.message || 'Não foi possível enviar suas respostas. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    if (resultado) {
      if (resultado.aprovado && onPassed) {
        onPassed();
      } else if (!resultado.aprovado) {
        if (onFailed) onFailed();
        else if (onAbort) onAbort();
      }
    }
  };

  if (!quiz) return null;

  return (
    <>
      <section className="va-quiz" aria-label={isProva ? 'Prova final' : 'Quiz da aula'}>
        <div className="va-quiz__header">
          <div className="va-quiz__heading">
            <div className="va-quiz__icon"><i className="fa-solid fa-list-check" /></div>
            <div>
              <h3 className="va-quiz__title">{quiz.titulo}</h3>
              {quiz.descricao && <p className="va-quiz__desc">{quiz.descricao}</p>}
            </div>
          </div>
          {!resultado && (
            <div className="va-quiz__progress">
              <div className="va-quiz__progress-track">
                <div className="va-quiz__progress-fill" style={{ width: progressoPct + '%' }} />
              </div>
              <span className="va-quiz__progress-label">{respondidas} de {perguntas.length} respondidas</span>
            </div>
          )}
        </div>

        {resultado ? (
          <div className={'va-quiz-result' + (resultado.aprovado ? ' pass' : ' fail')}>
            <div className="va-quiz-result__ring" style={{ '--pct': (resultado.nota * 360) + 'deg' } as React.CSSProperties}>
              <div className="va-quiz-result__icon">
                {resultado.aprovado ? (
                  <i className="fa-solid fa-check" />
                ) : (
                  <i className="fa-solid fa-xmark" />
                )}
              </div>
              <span className="va-quiz-result__pct">{Math.round(resultado.nota * 100)}%</span>
            </div>
            <p className="va-quiz-result__score">{resultado.acertos} de {resultado.total} corretas</p>
            <p className="va-quiz-result__msg">
              {resultado.aprovado
                ? (isProva
                    ? 'Parabéns! Você passou na prova final. Seu curso está concluído.'
                    : 'Parabéns, você acertou!')
                : (isProva
                    ? 'Você ainda não atingiu a nota mínima na prova final. Revise o curso e tente novamente.'
                    : 'Que pena, você errou. Assista novamente o vídeo e tente novamente!')}
            </p>
          </div>
        ) : (
          <>
            <div className="va-quiz__list">
              {perguntas.map((pergunta, idx) => (
                <div key={pergunta.id} className="va-quiz-question">
                  <div className="va-quiz-question__head">
                    <span className="va-quiz-question__n">{idx + 1}</span>
                    <p className="va-quiz-question__text">{pergunta.enunciado}</p>
                  </div>
                  <div className="va-quiz-question__options">
                    {pergunta.alternativas.map((alt) => {
                      const selected = respostas[pergunta.id] === alt.id;
                      return (
                        <button
                          key={alt.id}
                          type="button"
                          className={'va-quiz-option' + (selected ? ' selected' : '')}
                          onClick={() => handleSelect(pergunta.id, alt.id)}
                        >
                          <span className="va-quiz-option__radio">{selected ? '●' : ''}</span>
                          <span className="va-quiz-option__text">{alt.texto}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {erro && <p className="va-quiz__erro">{erro}</p>}

            <button
              type="button"
              className="va-btn-accent va-quiz__submit"
              disabled={!todasRespondidas || enviando}
              onClick={handleSubmit}
            >
              {enviando ? 'Enviando...' : todasRespondidas ? 'Enviar respostas' : 'Responda todas as perguntas'}
            </button>
          </>
        )}
      </section>

      {showModal && resultado && (
        <div
          className={'va-quiz-feedback-modal' + (resultado.aprovado ? ' pass' : ' fail')}
          role="dialog"
          aria-modal="true"
          aria-label={resultado.aprovado ? 'Resposta correta' : 'Resposta incorreta'}
        >
          <div className="va-quiz-feedback-modal__card">
            <div className="va-quiz-feedback-modal__icon">
              <i className={resultado.aprovado ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark'} />
            </div>
            <h3 className="va-quiz-feedback-modal__title">
              {resultado.aprovado ? 'Parabéns, você acertou!' : 'Que pena, você errou!'}
            </h3>
            <p className="va-quiz-feedback-modal__text">
              {resultado.aprovado
                ? `Você acertou ${resultado.acertos} de ${resultado.total} neste quiz.`
                : 'Assista novamente o vídeo e tente novamente!'}
            </p>
            <button type="button" className="va-quiz-feedback-modal__btn" onClick={handleModalClose}>
              {resultado.aprovado ? 'Continuar' : 'Assistir novamente'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
