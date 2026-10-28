import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ApiService } from '../services/api';
import logoImage from '../assets/images/visão-logo.png';

const descricaoStyle = { color: 'var(--color-text-secondary)', marginBottom: 24, fontSize: 14, lineHeight: 1.6 };

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const renderShell = (card: React.ReactNode) => (
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
        <div className="login-card">{card}</div>
      </div>
    </div>
  );

  if (!token) {
    return renderShell(
      <>
        <h2>Link inválido</h2>
        <p style={descricaoStyle}>
          O link de redefinição de senha é inválido ou está faltando.
          Solicite um novo link na página de login.
        </p>
        <button type="button" onClick={() => navigate('/login')}>
          Voltar ao login
        </button>
      </>
    );
  }

  if (success) {
    return renderShell(
      <>
        <h2>Senha redefinida!</h2>
        <p style={descricaoStyle}>
          Sua senha foi alterada com sucesso. Agora você pode acessar sua conta.
        </p>
        <button type="button" onClick={() => navigate('/login')}>
          Entrar
        </button>
      </>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await ApiService.post('/api/password-reset/confirm/', { token, password });
      setSuccess(true);
    } catch (err: any) {
      const data = err.data;
      if (data?.token) setError(data.token[0]);
      else if (data?.password) setError(data.password[0]);
      else setError(err.message || 'Erro ao redefinir senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return renderShell(
    <>
      <h2>Redefinir Senha</h2>
      <p style={descricaoStyle}>Digite sua nova senha abaixo.</p>
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label>Nova Senha</label>
          <input
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            maxLength={255}
          />
        </div>
        <div className="input-group">
          <label>Confirmar Senha</label>
          <input
            type="password"
            placeholder="Repita a nova senha"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            maxLength={255}
          />
        </div>
        <span className="login-error">{error}</span>
        <button type="submit" disabled={loading}>
          {loading ? 'Redefinindo...' : 'Redefinir Senha'}
        </button>
      </form>
    </>
  );
}
