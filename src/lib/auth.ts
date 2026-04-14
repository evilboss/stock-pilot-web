import Cookies from 'js-cookie';

export function setTokens(accessToken: string, refreshToken: string, userId: string) {
  Cookies.set('accessToken', accessToken, { expires: 1 });
  Cookies.set('refreshToken', refreshToken, { expires: 7 });
  Cookies.set('userId', userId, { expires: 7 });
}

export function clearTokens() {
  Cookies.remove('accessToken');
  Cookies.remove('refreshToken');
  Cookies.remove('userId');
}

export function getAccessToken(): string | undefined {
  return Cookies.get('accessToken');
}

export function isAuthenticated(): boolean {
  return !!Cookies.get('accessToken');
}
