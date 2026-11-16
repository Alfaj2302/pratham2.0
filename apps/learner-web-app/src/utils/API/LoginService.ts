// import { get, post } from "./RestClient";
import axios from 'axios';
import { post } from './RestClient';
import { API_ENDPOINTS } from './EndUrls';
import {
  getRecaptchaToken,
  RECAPTCHA_LOGIN_ACTION,
} from '@shared-lib-v2/utils/recaptcha';
import { encryptPassword } from '@shared-lib-v2/utils/passwordEncryption';

interface LoginParams {
  username: string;
  password: string;
}

interface RefreshParams {
  refresh_token: string;
}

export const login = async ({
  username,
  password,
}: LoginParams): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.accountLogin;

  try {
    const captchaToken = await getRecaptchaToken(RECAPTCHA_LOGIN_ACTION);
    const response = await post(apiUrl, {
      username,
      password: await encryptPassword(password),
      captchaToken,
    });
    return response?.data;
  } catch (error) {
    console.error('error in login', error);
    throw error;
  }
};

export const refresh = async ({
  refresh_token,
}: RefreshParams): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.authRefresh;
  try {
    const response = await post(apiUrl, { refresh_token });
    return response?.data;
  } catch (error) {
    console.error('error in login', error);
    throw error;
  }
};
export const logout = async (refreshToken: string): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.authLogout;
  try {
    const response = await post(apiUrl, { refresh_token: refreshToken });
    return response;
  } catch (error) {
    console.error('error in logout', error);
    throw error;
  }
};

export const getUserId = async (): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.userAuth;

  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Authorization token not found');
    }

    const response = await axios.get(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response?.data?.result;
  } catch (error: any) {
    if (error?.response?.status === 401) {
      // Clear all localStorage data
      localStorage.clear();
      // Redirect to login page
      window.location.href = '/login';
      return;
    }
    console.error('Error in fetching user details', error);
    throw error;
  }
};
// The API verifies oldPassword itself, so callers must not log in to check it first
export const resetPassword = async (
  newPassword: any,
  oldPassword?: any,
  username?: string
): Promise<any> => {
  const apiUrl: string = API_ENDPOINTS.resetPassword;
  try {
    const payload: Record<string, any> = {
      newPassword: await encryptPassword(newPassword),
    };
    if (oldPassword) {
      payload.oldPassword = await encryptPassword(oldPassword);
    }
    if (username) {
      payload.username = username;
    }
    const response = await post(apiUrl, payload);
    return response?.data;
  } catch (error) {
    console.error('error in reset', error);
    throw error;
  }
};
