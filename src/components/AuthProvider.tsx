"use client";
import { SessionProvider } from "next-auth/react";

import { FC, ReactNode } from "react";

interface authProviderProps {
  children: ReactNode;
}

const AuthProvider: FC<authProviderProps> = ({ children }) => {
  return (
    <>
      <SessionProvider>{children}</SessionProvider>
    </>
  );
};

export default AuthProvider;
