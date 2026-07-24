import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-wt-text">Create account</h1>
        <p className="text-sm text-wt-text-muted">
          Get set up in under a minute.
        </p>
      </div>
      <SignupForm />
    </div>
  );
}
