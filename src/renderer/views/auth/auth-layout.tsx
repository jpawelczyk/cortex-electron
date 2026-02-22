import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Cortex</h1>
          <p className="text-sm text-muted-foreground">Your personal operating system</p>
        </div>
        {children}
      </div>
    </div>
  );
}
