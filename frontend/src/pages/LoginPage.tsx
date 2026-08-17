import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/auth';
import { ApiService } from '../services/api';
import logoImage from '../assets/images/visão-logo.png';

export function LoginPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<'login' | 'cadastro'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [cadNome, setCadNome] = useState('');
  const [cadSobrenome, setCadSobrenome] = useState('');
  const [cadEmail, setCadEmail] = useState('');
  const [cadSenha, setCadSenha] = useState('');
  const [cadError, setCadError] = useState('');
  const [cadLoading, setCadLoading] = useState(false);

  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryMsg, setRecoveryMsg] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const [toast, setToast] = useState('');

  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  const recaptchaIds = useRef<{ login: number; cadastro: number }>({ login: -1, cadastro: -1 });

  const renderRecaptcha = () => {
    const w = window as any;
    if (!siteKey || !w.grecaptcha?.render) return;

    (['login', 'cadastro'] as const).forEach((key) => {
      const el = document.getElementById(`recaptcha-${key}`);
      if (!el) return;
      if (recaptchaIds.current[key] >= 0) {
        if (el.childElementCount > 0) return;
        recaptchaIds.current[key] = -1;
      }
      recaptchaIds.current[key] = w.grecaptcha.render(`recaptcha-${key}`, { sitekey: siteKey, theme: 'light', size: 'normal' });
    });
  };

  useEffect(() => {
    const w = window as any;
    if (w.grecaptcha?.render) {
      renderRecaptcha();
    } else {
      const interval = setInterval(() => {
        if ((window as any).grecaptcha?.render) {
          clearInterval(interval);
          renderRecaptcha();
        }
      }, 250);
      return () => clearInterval(interval);
    }
  }, [view]);

  const getRecaptchaToken = (key: 'login' | 'cadastro') => {
    const w = window as any;
    const id = recaptchaIds.current[key];
    if (!siteKey || !w.grecaptcha?.getResponse || id < 0) return '';
    return w.grecaptcha.getResponse(id) as string;
  };

  const resetRecaptcha = (key: 'login' | 'cadastro') => {
    const w = window as any;
    const id = recaptchaIds.current[key];
    if (w.grecaptcha?.reset && id >= 0) w.grecaptcha.reset(id);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const token = getRecaptchaToken('login');
    if (siteKey && !token) {
      setError('Complete o reCAPTCHA para continuar.');
      return;
    }

    setLoading(true);
    try {
      const data = await ApiService.post('/api/token/', { username: email, password, recaptcha_token: token });
      const userData = data.user || {};
      const role = userData.role || 'visitor';
      AuthService.login({
        role,
        email: userData.email || email,
        name: (userData.first_name + ' ' + userData.last_name).trim() || userData.username,
        avatar: userData.avatar_url || '',
      });
      resetRecaptcha('login');
      if (role === 'cliente_orcoma' || role === 'empresario') {
        AuthService.setCurrentAcademy('business');
        navigate('/business');
      } else if (role === 'cliente_equipe' || role === 'colaborador_orcoma') {
        AuthService.setCurrentAcademy('team');
        navigate('/team');
      } else {
        navigate('/team');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar ao servidor. Verifique se o backend está rodando.');
    } finally {
      setLoading(false);
    }
  };

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setCadError('');

    const token = getRecaptchaToken('cadastro');
    if (siteKey && !token) {
      setCadError('Complete o reCAPTCHA para continuar.');
      return;
    }

    if (cadSenha.length < 8) {
      setCadError('A senha deve ter no mínimo 8 caracteres');
      return;
    }
    if (!cadEmail) {
      setCadError('Informe um e-mail válido.');
      return;
    }

    setCadLoading(true);
    try {
      const username = cadEmail.split('@')[0];
      await ApiService.post('/api/register/', {
        username,
        email: cadEmail,
        password: cadSenha,
        first_name: cadNome,
        last_name: cadSobrenome,
        recaptcha_token: token,
      });
      resetRecaptcha('cadastro');
      setView('login');
      setCadNome('');
      setCadSobrenome('');
      setCadEmail('');
      setCadSenha('');
      setToast('Conta criada com sucesso!');
      setTimeout(() => setToast(''), 3000);
    } catch (err: any) {
      const data = err.data;
      if (data?.username) setCadError(data.username[0]);
      else if (data?.email) setCadError(data.email[0]);
      else setCadError('Erro ao criar conta.');
    } finally {
      setCadLoading(false);
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryMsg('');
    setRecoveryLoading(true);
    try {
      await ApiService.post('/api/password-reset/', { email: recoveryEmail });
      setRecoveryMsg('Instruções enviadas para seu e-mail.');
    } catch {
      setRecoveryMsg('Erro ao enviar. Verifique o e-mail informado.');
    } finally {
      setRecoveryLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <img
          src={logoImage}
          alt="Visão Academy"
          className="login-left__logo"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <h1 className="login-left__text">Conhecimento que transforma.</h1>
        <p className="login-left__subtitle">Inovação que impulsiona.</p>
      </div>

      <div className="login-right">
        {view === 'login' && (
          <div className="login-card" id="login-form">
            <h2>Entrar</h2>
            <form onSubmit={handleLogin}>
              <div className="input-group">
                <label>Usuário</label>
                <input
                  type="text"
                  placeholder="Digite seu usuário"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <label>Senha</label>
                <input
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {siteKey && (
                <div className="recaptcha-box">
                  <div id="recaptcha-login" />
                </div>
              )}
              <p className="forgot-password">
                <a href="#" onClick={(e) => { e.preventDefault(); setRecoveryOpen(true); }}>
                  Esqueci a minha senha
                </a>
              </p>
              <span className="login-error">{error}</span>
              <button type="submit" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
              <div className="login-divider"><span>ou</span></div>
              <p className="cadastro-texto">Não possui uma conta?</p>
              <button type="button" className="btn-cadastro" onClick={() => setView('cadastro')}>
                Criar conta
              </button>
            </form>
          </div>
        )}

        {view === 'cadastro' && (
          <div className="login-card" id="cadastro-form">
            <h2>Criar Conta</h2>
            <form onSubmit={handleCadastro}>
              <div className="input-row">
                <div className="input-group">
                  <label>Nome</label>
                  <input
                    type="text"
                    placeholder="Seu nome"
                    value={cadNome}
                    onChange={(e) => setCadNome(e.target.value)}
                    autoComplete="given-name"
                    required
                    maxLength={50}
                  />
                </div>
                <div className="input-group">
                  <label>Sobrenome</label>
                  <input
                    type="text"
                    placeholder="Seu sobrenome"
                    value={cadSobrenome}
                    onChange={(e) => setCadSobrenome(e.target.value)}
                    autoComplete="family-name"
                    required
                    maxLength={100}
                  />
                </div>
              </div>
              <div className="input-group">
                <label>E-mail</label>
                <input
                  type="email"
                  placeholder="Digite seu e-mail"
                  value={cadEmail}
                  onChange={(e) => setCadEmail(e.target.value)}
                  autoComplete="email"
                  required
                  maxLength={255}
                />
              </div>
              <div className="input-group">
                <label>Nova Senha</label>
                <input
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={cadSenha}
                  onChange={(e) => setCadSenha(e.target.value)}
                  autoComplete="new-password"
                  required
                  maxLength={255}
                />
              </div>
              {siteKey && (
                <div className="recaptcha-box">
                  <div id="recaptcha-cadastro" />
                </div>
              )}
              <span className="login-error">{cadError}</span>
              <p className="termos-texto">
                Ao se cadastrar, você aceita nossos{' '}
                <a href="/termos-de-uso" target="_blank" rel="noopener noreferrer">termos de uso</a>{' '}
                e a nossa{' '}
                <a href="/politica-de-privacidade" target="_blank" rel="noopener noreferrer">política de privacidade</a>.
              </p>
              <button type="submit" disabled={cadLoading}>
                {cadLoading ? 'Criando...' : 'Criar Conta'}
              </button>
              <div className="login-divider"><span>ou</span></div>
              <p className="cadastro-texto">Já possui uma conta?</p>
              <button type="button" className="btn-cadastro" onClick={() => setView('login')}>
                Entrar
              </button>
            </form>
          </div>
        )}
      </div>

      {recoveryOpen && (
        <div className="recovery-modal active" onClick={(e) => { if (e.target === e.currentTarget) setRecoveryOpen(false); }}>
          <div className="recovery-box">
            <button className="close-modal" onClick={() => setRecoveryOpen(false)}>&times;</button>
            <h2>Recupere sua senha</h2>
            <p>Informe seu e-mail cadastrado para receber as instruções de redefinição de senha.</p>
            <form onSubmit={handleRecovery}>
              <input
                type="email"
                placeholder="Seu e-mail"
                className="recovery-input"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                required
              />
              <button type="submit" className="recovery-btn" disabled={recoveryLoading}>
                {recoveryLoading ? 'Enviando...' : 'Enviar instruções'}
              </button>
            </form>
            {recoveryMsg && <small>{recoveryMsg}</small>}
          </div>
        </div>
      )}

      {toast && (
        <div className="login-toast" onClick={() => setToast('')}>
          <div className="login-toast__icon">&#10003;</div>
          <p>{toast}</p>
          <button onClick={() => setToast('')}>OK</button>
        </div>
      )}
    </div>
  );
}
