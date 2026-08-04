import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';

function AuthGate() {
  const { checkingSession } = useAuth();

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Checking session">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
