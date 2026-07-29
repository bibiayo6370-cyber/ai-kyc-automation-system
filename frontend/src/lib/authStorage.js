const TOKEN_KEY = "ai_kyc_access_token";
const USER_KEY = "ai_kyc_authenticated_user";

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  const storedUser = localStorage.getItem(USER_KEY);

  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser);
  } catch {
    clearStoredSession();
    return null;
  }
}

export function storeSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}