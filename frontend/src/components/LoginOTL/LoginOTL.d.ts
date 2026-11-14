import type { ReactElement } from "react";

export type LoginOTLMode = "email" | "tel";

export interface LoginOTLSubmit {
  mode: LoginOTLMode;
  identifier: string;
  password: string;
  remember: boolean;
}

export interface LoginOTLProps {
  onSubmit?: (payload: LoginOTLSubmit) => Promise<void> | void;
  onGoogle?: () => Promise<void> | void;
  onForgot?: () => void;
  onForgotSubmit?: (
    email: string,
  ) => Promise<string | void> | string | void;
  onBack?: () => void;
  forgot?: boolean;
  sessionError?: string;
}

export default function LoginOTL(props: LoginOTLProps): ReactElement;
