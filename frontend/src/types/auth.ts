export type User = {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  is_active: boolean;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_at: string;
};

export type AuthResponse = {
  user: User;
  token: TokenResponse;
};

export type SignupInput = {
  email: string;
  password: string;
  name: string;
};

export type LoginInput = {
  email: string;
  password: string;
};
