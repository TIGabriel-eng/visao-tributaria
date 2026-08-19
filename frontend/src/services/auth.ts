const auth = typeof window !== 'undefined' ? (window as any).auth : undefined;

const STORAGE_KEYS = {
  loggedIn: 'orcoma_logged_in',
  role: 'orcoma_user_role',
  email: 'orcoma_user_email',
  name: 'orcoma_user_name',
  avatar: 'orcoma_user_avatar',
  legacyAccess: 'access_token',
  legacyRefresh: 'refresh_token',
};

export const AuthService = {
  getUser() {
    if (auth?.getUser) return auth.getUser();
    return {
      role: localStorage.getItem(STORAGE_KEYS.role) || 'visitor',
      email: localStorage.getItem(STORAGE_KEYS.email) || '',
      name: localStorage.getItem(STORAGE_KEYS.name) || '',
      avatar: localStorage.getItem(STORAGE_KEYS.avatar) || '',
    };
  },

  getRole(): string {
    return (auth?.getRole?.() ?? localStorage.getItem(STORAGE_KEYS.role)) || 'visitor';
  },

  getEmail(): string {
    return (auth?.getEmail?.() ?? localStorage.getItem(STORAGE_KEYS.email)) || '';
  },

  getName(): string {
    return (auth?.getName?.() ?? localStorage.getItem(STORAGE_KEYS.name)) || 'Usuário';
  },

  getAvatar(): string {
    return (auth?.getAvatar?.() ?? localStorage.getItem(STORAGE_KEYS.avatar)) || '';
  },

  getCurrentAcademy(): string {
    return (auth?.getCurrentAcademy?.() ?? localStorage.getItem('current_academy')) || 'Academy Business';
  },

  setCurrentAcademy(name: string) {
    auth?.setCurrentAcademy?.(name);
    localStorage.setItem('current_academy', name);
  },

  isLoggedIn(): boolean {
    return auth?.isLoggedIn?.() ?? !!localStorage.getItem(STORAGE_KEYS.loggedIn);
  },

  logout() {
    if (auth?.logout) {
      auth.logout();
    } else {
      const keys = [
        STORAGE_KEYS.loggedIn,
        STORAGE_KEYS.role,
        STORAGE_KEYS.email,
        STORAGE_KEYS.name,
        STORAGE_KEYS.avatar,
        STORAGE_KEYS.legacyAccess,
        STORAGE_KEYS.legacyRefresh,
      ];
      keys.forEach((k) => localStorage.removeItem(k));
    }
  },

  login(userData: any) {
    if (auth?.login) {
      auth.login({}, userData);
    } else {
      localStorage.removeItem(STORAGE_KEYS.legacyAccess);
      localStorage.removeItem(STORAGE_KEYS.legacyRefresh);
      localStorage.setItem(STORAGE_KEYS.loggedIn, '1');
      if (userData.role) localStorage.setItem(STORAGE_KEYS.role, userData.role);
      if (userData.email) localStorage.setItem(STORAGE_KEYS.email, userData.email);
      if (userData.name) localStorage.setItem(STORAGE_KEYS.name, userData.name);
      if (userData.avatar) localStorage.setItem(STORAGE_KEYS.avatar, userData.avatar);
    }
  },

  setUser(data: any) {
    if (auth?.setUser) auth.setUser(data);
    if (data.avatar !== undefined) localStorage.setItem(STORAGE_KEYS.avatar, data.avatar);
    if (data.name !== undefined) localStorage.setItem(STORAGE_KEYS.name, data.name);
    if (data.email !== undefined) localStorage.setItem(STORAGE_KEYS.email, data.email);
    if (data.role !== undefined) localStorage.setItem(STORAGE_KEYS.role, data.role);
  },
};
