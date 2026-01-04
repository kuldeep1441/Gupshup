"use client";

import Button from "@/components/common/Button";
import { FC, useState } from "react";
import { signIn } from "next-auth/react";
import { toast } from "react-hot-toast";

const Page: FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  async function loginWithGoogle() {
    setIsLoading(true);
    try {
      await signIn("google");
    } catch (error) {
      // display error message to user
      toast.error("Something went wrong with your login.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Unified Card Container */}
      <div className="w-full max-w-md relative z-10">
        <div className="relative group">
          {/* Gradient border effect */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-500"></div>
          
          {/* Main card */}
          <div className="relative bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 p-8 sm:p-12 animate-slide-up">
            <div className="flex flex-col items-center space-y-8">
              {/* Logo Section */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                    <img
                      src="/gupshup-logo.png"
                      alt="Gupshup Logo"
                      className="w-[60%] h-auto mx-auto object-contain transition-transform duration-300 hover:scale-110"
                    />
                </div>
                
                {/* Header Text */}
                <div className="text-center space-y-2">
                  <p className="text-base sm:text-lg text-gray-600 font-medium">
                    Sign in to your account to continue
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="w-full">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                </div>
              </div>

              {/* Login Button Section */}
              <div className="w-full space-y-6">
                <Button
                  isLoading={isLoading}
                  type="button"
                  className="w-full h-14 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] bg-white text-gray-800 border-[1px] border-gray-200 hover:border-gray-300 hover:bg-gray-50 group/button"
                  onClick={loginWithGoogle}>
                  {isLoading ? null : (
                    <svg
                      className="mr-3 h-5 w-5 transition-transform duration-300 group-hover/button:scale-110"
                      aria-hidden="true"
                      focusable="false"
                      data-prefix="fab"
                      data-icon="google"
                      role="img"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                      <path d="M1 1h22v22H1z" fill="none" />
                    </svg>
                  )}
                  Continue with Google
                </Button>

                {/* Security Badge */}
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <svg
                    className="w-4 h-4 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <span className="font-medium">Secure authentication</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
