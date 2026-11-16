const baseurl = process.env.NEXT_PUBLIC_MIDDLEWARE_URL;

const API_ENDPOINTS = {


  accountLogin: `${baseurl}/account/login`,
  authRefresh: `${baseurl}/user/auth/refresh`,
  authLogout: `${baseurl}/account/auth/logout`,
  userAuth: `${baseurl}/user/auth`,
  resetPassword: `${baseurl}/user/reset-password`,
  forgotPassword: `${baseurl}/user/forgot-password`,
  passwordResetLink: `${baseurl}/user/password-reset-link`,
  program: `${baseurl}/tenant/read`,

};

export default API_ENDPOINTS;
