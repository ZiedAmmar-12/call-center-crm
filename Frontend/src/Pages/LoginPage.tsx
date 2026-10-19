// pages/LoginPage.tsx
import { LoginForm } from '../components/LoginForm';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Role_Home } from '../constants/role';
import type  { RoleId } from '../constants/role';
import logo from "../assets/logo (2).png";
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const success = await login(email, password);

    if (success) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const home = Role_Home[user.roleId as RoleId] || '/';

      navigate(home);
    } else {
      setError('Email ou mot de passe incorrect');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-secondary p-8 text-center">
            <img
              src={logo}
              alt="EBI Call Center"
              className="h-30 mx-auto mb-4 brightness-0 invert"
            />
            <h1 className="text-white/80 text-2xl font-medium">Connexion</h1>
            <p className="text-white/80 text-sm mt-1">Accédez à votre espace CRM</p>
          </div>

          <div className="p-8">
            <LoginForm
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              error={error}
              loading={loading}
              onSubmit={(e: FormEvent<HTMLFormElement>) => {
                void handleSubmit(e);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
