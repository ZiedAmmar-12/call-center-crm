import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import ebiLogo from '../../assets/Logo de centre d\'appels EBI.png';

const RECENT_EMAILS_KEY = 'crm_recent_emails';

function getRecentEmails(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_EMAILS_KEY) || '[]'); }
  catch { return []; }
}

function saveRecentEmail(email: string) {
  const list = getRecentEmails().filter(e => e !== email);
  localStorage.setItem(RECENT_EMAILS_KEY, JSON.stringify([email, ...list].slice(0, 6)));
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [recentEmails, setRecentEmails] = useState<string[]>([]);
  const [ghostText, setGhostText] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const ghostRef = useRef<HTMLSpanElement>(null); // eslint-disable-line @typescript-eslint/no-unused-vars
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
    const saved = getRecentEmails();
    setRecentEmails(saved);
    if (saved.length > 0) setEmail(saved[0]);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    if (result === 'pending_first_login') {
      saveRecentEmail(email);
      navigate(`/first-login?email=${encodeURIComponent(email)}`);
    } else if (result === 'must_change_password') {
      saveRecentEmail(email);
      navigate(`/change-password?email=${encodeURIComponent(email)}`);
    } else if (result === 'success') {
      saveRecentEmail(email);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const role = user.role?.toLowerCase();
      const type = user.typeConfirmatrice?.toUpperCase();
      if (role === 'superadmin') navigate('/superadmin/dashboard');
      else if (role === 'admin') navigate('/admin/dashboard');
      else if (role === 'confirmatrice') {
        if (type === 'CONF2') navigate('/confirmation2/dashboard');
        else if (type === 'CONFCLIENT') navigate('/confirmation-client/dashboard');
        else navigate('/confirmation1/dashboard');
      } else if (role === 'agent') navigate('/agent/dashboard');
      else if (role === 'qualite') navigate('/qualite/dashboard');
      else if (role === 'commercial') navigate('/commercial/dashboard');
      else if (role === 'tech' || role === 'technique') navigate('/technique/dashboard');
      else navigate('/admin/dashboard');
    } else {
      setError('Email ou mot de passe incorrect');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-12px); }
        }
        @keyframes floatReverse {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50%       { transform: translateY(12px) rotate(180deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%       { opacity: 0.7; transform: scale(1.08); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes drift {
          0%   { transform: translate(0, 0) rotate(0deg); }
          33%  { transform: translate(20px, -15px) rotate(120deg); }
          66%  { transform: translate(-10px, 10px) rotate(240deg); }
          100% { transform: translate(0, 0) rotate(360deg); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes gridMove {
          0%   { background-position: 0 0; }
          100% { background-position: 40px 40px; }
        }

        .right-panel {
          position: relative;
          background: linear-gradient(135deg, #090d1a 0%, #0e0a1c 40%, #140828 70%, #0c1018 100%);
          overflow: hidden;
        }
        .right-panel::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(139,92,246,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139,92,246,0.05) 1px, transparent 1px);
          background-size: 40px 40px;
          animation: gridMove 6s linear infinite;
          pointer-events: none;
        }
        .right-panel::after {
          content: '';
          position: absolute;
          top: 35%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 600px;
          height: 600px;
          background: radial-gradient(ellipse, rgba(139,92,246,0.1) 0%, transparent 65%);
          pointer-events: none;
        }

        .glass-card {
          background: rgba(255,255,255,0.035);
          backdrop-filter: blur(28px);
          -webkit-backdrop-filter: blur(28px);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 22px;
          box-shadow:
            0 0 0 1px rgba(139,92,246,0.08),
            0 30px 80px rgba(0,0,0,0.55),
            inset 0 1px 0 rgba(255,255,255,0.05);
        }

        .login-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 500;
          color: rgba(255,255,255,0.5);
          margin-bottom: 0.45rem;
          letter-spacing: 0.025em;
        }

        .login-input {
          width: 100%;
          padding: 0.82rem 1rem 0.82rem 2.75rem;
          border: 1.5px solid rgba(255,255,255,0.07);
          border-radius: 10px;
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.9);
          font-size: 0.9rem;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.25s, box-shadow 0.25s, background 0.25s;
        }
        .login-input:focus {
          border-color: rgba(139,92,246,0.55);
          background: rgba(139,92,246,0.06);
          box-shadow: 0 0 0 3px rgba(139,92,246,0.13), 0 0 24px rgba(139,92,246,0.08);
        }
        .login-input::placeholder { color: rgba(255,255,255,0.18); }
        .login-input:-webkit-autofill,
        .login-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #0e0a1c inset !important;
          -webkit-text-fill-color: rgba(255,255,255,0.9) !important;
          border-color: rgba(139,92,246,0.4) !important;
        }

        .submit-btn {
          width: 100%;
          padding: 0.92rem;
          border: none;
          border-radius: 10px;
          font-size: 0.95rem;
          font-weight: 600;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          position: relative;
          overflow: hidden;
          background: linear-gradient(90deg, #6d28d9 0%, #9333ea 50%, #7c3aed 100%);
          background-size: 200% auto;
          box-shadow: 0 4px 28px rgba(139,92,246,0.4), 0 1px 0 rgba(255,255,255,0.08) inset;
          transition: transform 0.15s, box-shadow 0.2s, background-position 0.4s;
          letter-spacing: 0.02em;
        }
        .submit-btn::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -75%;
          width: 50%;
          height: 200%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
          transform: skewX(-20deg);
          transition: left 0.6s;
        }
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          background-position: right center;
          box-shadow: 0 8px 36px rgba(139,92,246,0.55), 0 1px 0 rgba(255,255,255,0.08) inset;
        }
        .submit-btn:hover:not(:disabled)::after {
          left: 125%;
        }
        .submit-btn:active:not(:disabled) {
          transform: scale(0.98) translateY(0);
          box-shadow: 0 2px 14px rgba(139,92,246,0.3);
        }
        .submit-btn:disabled { opacity: 0.55; cursor: not-allowed; box-shadow: none; }

        .forgot-btn {
          font-size: 0.79rem;
          color: rgba(167,139,250,0.7);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          transition: color 0.2s;
        }
        .forgot-btn:hover { color: rgba(167,139,250,1); text-decoration: underline; }

        .icon-wrapper {
          position: absolute;
          left: 0.875rem;
          top: 50%;
          transform: translateY(-50%);
          z-index: 2;
          transition: color 0.25s;
          width: 16px;
          height: 16px;
        }
        .icon-focused { color: rgba(167,139,250,0.75); }
        .icon-default { color: rgba(255,255,255,0.22); }

        .error-box {
          background: rgba(239,68,68,0.07);
          border: 1px solid rgba(239,68,68,0.22);
          color: rgba(252,165,165,0.9);
          padding: 0.7rem 1rem;
          border-radius: 10px;
          font-size: 0.83rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(70px);
          pointer-events: none;
        }
        .orb-1 {
          width: 320px; height: 320px;
          background: rgba(109,40,217,0.2);
          top: -80px; right: -80px;
          animation: pulse-glow 7s ease-in-out infinite;
        }
        .orb-2 {
          width: 220px; height: 220px;
          background: rgba(37,99,235,0.13);
          bottom: 60px; left: -60px;
          animation: pulse-glow 9s ease-in-out infinite 2.5s;
        }
        .orb-3 {
          width: 160px; height: 160px;
          background: rgba(147,51,234,0.15);
          bottom: 28%; right: 12%;
          animation: pulse-glow 6s ease-in-out infinite 1.2s;
        }

        .geo-shape { position: absolute; pointer-events: none; }
        .geo-1 {
          width: 56px; height: 56px;
          border: 1.5px solid rgba(139,92,246,0.3);
          border-radius: 10px;
          top: 14%; right: 10%;
          animation: drift 16s linear infinite;
          opacity: 0.5;
        }
        .geo-2 {
          width: 32px; height: 32px;
          border: 1.5px solid rgba(99,102,241,0.35);
          border-radius: 50%;
          top: 62%; right: 18%;
          animation: drift 20s linear infinite reverse;
          opacity: 0.45;
        }
        .geo-3 {
          width: 18px; height: 18px;
          border: 1.5px solid rgba(167,139,250,0.4);
          border-radius: 4px;
          bottom: 22%; right: 7%;
          animation: floatReverse 11s ease-in-out infinite;
          opacity: 0.4;
        }
        .geo-4 {
          width: 0; height: 0;
          border-left: 18px solid transparent;
          border-right: 18px solid transparent;
          border-bottom: 30px solid rgba(139,92,246,0.15);
          top: 42%; left: 7%;
          animation: drift 22s linear infinite 3s;
        }

        .dot-particle {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          background: rgba(167,139,250,0.7);
        }
        .dot-1 { width: 3px; height: 3px; top: 22%; left: 12%; animation: float 5.5s ease-in-out infinite; }
        .dot-2 { width: 2px; height: 2px; top: 58%; right: 22%; animation: float 7s ease-in-out infinite 1s; }
        .dot-3 { width: 4px; height: 4px; bottom: 32%; left: 18%; animation: float 6.5s ease-in-out infinite 2s; }
        .dot-4 { width: 2px; height: 2px; top: 72%; right: 32%; animation: float 8.5s ease-in-out infinite 0.5s; }
        .dot-5 { width: 3px; height: 3px; top: 38%; left: 5%; animation: float 9s ease-in-out infinite 1.5s; }

        .field-wrapper { animation: fadeSlideIn 0.5s ease both; }
        .field-1 { animation-delay: 0.25s; }
        .field-2 { animation-delay: 0.35s; }
        .field-3 { animation-delay: 0.45s; }
      `}</style>

      {/* ── PANNEAU GAUCHE — branding gradient ──────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12 relative overflow-hidden bg-gradient-to-br from-primary to-secondary">
        <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '360px', height: '360px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', animation: 'float 7s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '80px', left: '-80px', width: '280px', height: '280px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', animation: 'float 9s ease-in-out infinite 1s' }} />
        <div style={{ position: 'absolute', top: '40%', right: '10%', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', background: 'white', borderRadius: '12px', padding: '8px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            <img src={ebiLogo} alt="EBI Call Center" style={{ height: '36px', display: 'block' }} />
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(24px)', transition: 'all 0.8s ease 0.1s' }}>
          <h2 style={{ color: 'white', fontSize: '2.2rem', fontWeight: 700, lineHeight: 1.25, marginBottom: '1rem' }}>
            Bienvenue sur<br />votre espace CRM
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem', lineHeight: 1.65, maxWidth: '340px' }}>
            Gérez vos appels, rendez-vous et performances en temps réel depuis une seule plateforme.
          </p>
          <div style={{ display: 'flex', gap: '2.5rem', marginTop: '3rem' }}>
            {[{ val: '98%', label: 'Satisfaction' }, { val: '24/7', label: 'Disponible' }, { val: 'IA', label: 'Intégrée' }].map(({ val, label }) => (
              <div key={label}>
                <div style={{ color: 'white', fontSize: '1.6rem', fontWeight: 700 }}>{val}</div>
                <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.78rem', marginTop: '2px' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem', position: 'relative', zIndex: 1 }}>
          © 2026 EBI Call Center — Tous droits réservés
        </div>
      </div>

      {/* ── PANNEAU DROIT — formulaire dynamique ─────────────────────────────── */}
      <div className="right-panel flex-1 flex items-center justify-center p-6 lg:p-14">

        {/* Orbs */}
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        {/* Formes géométriques flottantes */}
        <div className="geo-shape geo-1" />
        <div className="geo-shape geo-2" />
        <div className="geo-shape geo-3" />
        <div className="geo-shape geo-4" />

        {/* Particules */}
        <div className="dot-particle dot-1" />
        <div className="dot-particle dot-2" />
        <div className="dot-particle dot-3" />
        <div className="dot-particle dot-4" />
        <div className="dot-particle dot-5" />

        {/* Carte glassmorphism */}
        <div
          className="glass-card"
          style={{
            width: '100%',
            maxWidth: '420px',
            padding: '2.5rem 2.75rem',
            position: 'relative',
            zIndex: 1,
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
            transition: 'all 0.75s cubic-bezier(0.16,1,0.3,1) 0.15s',
          }}
        >
          {/* Logo mobile */}
          <div className="flex lg:hidden justify-center mb-8">
            <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', borderRadius: '12px', padding: '8px 14px', border: '1px solid rgba(255,255,255,0.12)' }}>
              <img src={ebiLogo} alt="EBI" style={{ height: '34px', display: 'block' }} />
            </div>
          </div>

          {/* En-tête */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
              <Sparkles style={{ width: '14px', height: '14px', color: 'rgba(167,139,250,0.75)' }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.12em', color: 'rgba(167,139,250,0.65)', textTransform: 'uppercase' }}>
                Espace sécurisé
              </span>
            </div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 700, color: 'white', marginBottom: '0.35rem', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
              Connexion
            </h1>
            <p style={{ fontSize: '0.86rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.55 }}>
              Entrez vos identifiants pour accéder à votre espace
            </p>
          </div>

          {/* Séparateur */}
          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.35), transparent)', marginBottom: '1.75rem' }} />

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

            {error && (
              <div className="error-box">
                <span>⚠️</span> {error}
              </div>
            )}

            {/* Email */}
            <div className="field-wrapper field-1">
              <label className="login-label">Adresse email</label>
              <div style={{ position: 'relative' }}>
                <Mail className={`icon-wrapper ${emailFocused ? 'icon-focused' : 'icon-default'}`} />

                {ghostText && (
                  <div style={{
                    position: 'absolute', left: 0, top: 0, right: 0, bottom: 0,
                    display: 'flex', alignItems: 'center',
                    paddingLeft: '2.75rem', paddingRight: '1rem',
                    fontSize: '0.9rem', pointerEvents: 'none', zIndex: 1,
                    whiteSpace: 'nowrap', overflow: 'hidden',
                  }}>
                    <span style={{ visibility: 'hidden' }}>{email}</span>
                    <span ref={ghostRef} style={{ color: 'rgba(255,255,255,0.2)' }}>{ghostText}</span>
                  </div>
                )}

                <input
                  ref={emailInputRef}
                  type="text"
                  className="login-input"
                  value={email}
                  style={{ background: 'transparent', position: 'relative', zIndex: 2 }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => { setEmailFocused(false); setGhostText(''); }}
                  onChange={e => {
                    const val = e.target.value;
                    setEmail(val);
                    if (val.length > 0) {
                      const match = recentEmails.find(r => r.toLowerCase().startsWith(val.toLowerCase()));
                      setGhostText(match ? match.slice(val.length) : '');
                    } else {
                      setGhostText('');
                    }
                  }}
                  onKeyDown={e => {
                    if ((e.key === 'Tab' || e.key === 'ArrowRight') && ghostText) {
                      e.preventDefault();
                      setEmail(email + ghostText);
                      setGhostText('');
                    }
                    if (e.key === 'Escape') setGhostText('');
                  }}
                  placeholder={email ? '' : 'votre@email.com'}
                  required
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="field-wrapper field-2">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                <label className="login-label" style={{ marginBottom: 0 }}>Mot de passe</label>
                <button type="button" className="forgot-btn" onClick={() => navigate('/forgot-password')}>
                  Mot de passe oublié ?
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock className={`icon-wrapper ${passwordFocused ? 'icon-focused' : 'icon-default'}`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="login-input"
                  style={{ paddingRight: '3rem' }}
                  value={password}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(255,255,255,0.28)', display: 'flex', transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(167,139,250,0.85)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.28)')}
                >
                  {showPassword ? <EyeOff style={{ width: '16px', height: '16px' }} /> : <Eye style={{ width: '16px', height: '16px' }} />}
                </button>
              </div>
            </div>

            {/* Bouton submit */}
            <div className="field-wrapper field-3" style={{ marginTop: '0.15rem' }}>
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? (
                  <>
                    <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                    Connexion en cours...
                  </>
                ) : (
                  <>Se connecter <ArrowRight style={{ width: '16px', height: '16px' }} /></>
                )}
              </button>
            </div>
          </form>

          {/* Footer */}
          <p style={{ fontSize: '0.7rem', textAlign: 'center', marginTop: '1.75rem', color: 'rgba(255,255,255,0.18)', letterSpacing: '0.03em' }}>
            EBI Call Center © 2026 — Tous droits réservés
          </p>
        </div>
      </div>
    </div>
  );
}
