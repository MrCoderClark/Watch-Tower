import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-wt-text">Sign in</h1>
        <p className="text-sm text-wt-text-muted">
          Welcome back to Watchtower.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
