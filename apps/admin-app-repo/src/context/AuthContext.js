// context/AuthContext.js
import {
  clearSecureRefreshToken,
  getSecureRefreshToken,
} from '@shared-lib-v2/utils/secureTokenStorage';

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { login } from "../services/LoginService";
import { logout } from "../services/LoginService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          const userData = localStorage.getItem("token");
          setUser(userData);
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const loginFun = async (username, password) => {
    const userData = await login({
      username: username,
      password: password,
    });
    setUser(userData?.result?.access_token);
  };

  const logoutFun = async () => {
    try {
      const refreshToken = await getSecureRefreshToken();
      if (refreshToken) {
        await logout(refreshToken);
      }
    } catch (error) {
      console.log(error);
    }
    localStorage.removeItem("token");
    clearSecureRefreshToken();

    router.replace("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginFun, logoutFun }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
