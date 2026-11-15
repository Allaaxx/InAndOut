import { Button } from '@client/components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/components/ui/Card';
import { Input, Label } from '@client/components/ui/Input';
import type { LoginRequestDTO } from '@shared/dtos';
import type React from 'react';
import { useState } from 'react';

export interface LoginPageProps {
  onLogin: (credentials: LoginRequestDTO) => Promise<void>;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await onLogin({
        email: email.trim(),
        password,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Falha ao autenticar professor.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Acesso do Professor — InAndOut</CardTitle>
          <CardDescription>
            Autentique-se com seu e-mail institucional e senha para acessar o
            sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="login-email">E-mail Institucional</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="prof@linsdorego.edu.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="login-password">Senha</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p role="alert" className="text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Autenticando...' : 'Entrar no Terminal'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
