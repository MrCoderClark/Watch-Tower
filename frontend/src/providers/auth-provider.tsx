"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { api, ApiError } from "@/lib/api";
import type { LoginInput, SignupInput, User } from "@/types/auth";

type AuthState =
  | { status: "loading"; user: null; accessToken: null }
  | { status: "unauthenticated"; user: null; accessToken: null }
  | { status: "authenticated"; user: User; accessToken: string };

type AuthContextValue = AuthState & {
  signIn: (input: LoginInput) => Promise<void>;
  signUp: (input: SignupInput) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: "loading",
    user: null,
    accessToken: null,
  });
  const hydrated = useRef(false);

  // On first mount, try to silently refresh using the http-only cookie.
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    api
      .refresh()
      .then((res) =>
        setState({
          status: "authenticated",
          user: res.user,
          accessToken: res.token.access_token,
        }),
      )
      .catch(() =>
        setState({ status: "unauthenticated", user: null, accessToken: null }),
      );
  }, []);

  const signIn = useCallback(async (input: LoginInput) => {
    const res = await api.login(input);
    setState({
      status: "authenticated",
      user: res.user,
      accessToken: res.token.access_token,
    });
  }, []);

  const signUp = useCallback(async (input: SignupInput) => {
    const res = await api.signup(input);
    setState({
      status: "authenticated",
      user: res.user,
      accessToken: res.token.access_token,
    });
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
    }
    setState({ status: "unauthenticated", user: null, accessToken: null });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signIn, signUp, signOut }),
    [state, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
