import { useState, FormEvent } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useStore } from '../../stores';
import { AuthLayout } from './auth-layout';

interface SignInProps {
  onSwitchToSignUp: () => void;
}

export function SignIn({ onSwitchToSignUp }: SignInProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const signIn = useStore((s) => s.signIn);
  const authLoading = useStore((s) => s.authLoading);
  const authError = useStore((s) => s.authError);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await signIn(email, password);
  };

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {authError && (
          <p className="text-sm text-destructive" role="alert">{authError}</p>
        )}

        <Button type="submit" className="w-full" disabled={authLoading}>
          {authLoading ? 'Signing in...' : 'Sign in'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <button
            type="button"
            onClick={onSwitchToSignUp}
            className="text-primary underline-offset-4 hover:underline"
          >
            Sign up
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}
