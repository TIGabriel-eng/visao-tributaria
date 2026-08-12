import { useEffect, useState } from 'react';
import { ConsentService } from '../services/consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(!ConsentService.hasChoice());
  }, []);

  if (!visible) return null;

  const accept = () => {
    ConsentService.set('accepted');
    setVisible(false);
  };

  const reject = () => {
    ConsentService.set('rejected');
    setVisible(false);
  };

  return (
    <div className="cookie-consent" role="dialog" aria-live="polite" aria-label="Aviso de cookies">
      <div className="cookie-consent__content">
        <p>
          Este site usa cookies para garantir o funcionamento da plataforma e melhorar sua experiência.
          Os vídeos hospedados no YouTube só são carregados após a sua autorização.
        </p>
        <div className="cookie-consent__actions">
          <button type="button" className="cookie-consent__accept" onClick={accept}>
            Aceitar todos
          </button>
          <button type="button" className="cookie-consent__reject" onClick={reject}>
            Somente essenciais
          </button>
        </div>
      </div>
    </div>
  );
}
