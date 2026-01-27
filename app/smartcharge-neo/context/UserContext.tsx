import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, getCurrentUser, BackendUser } from '../services/api';

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string;
}

interface UserContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string) => Promise<boolean>;
  register: (email: string, name: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (data: Partial<UserProfile>) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'smartcharge_user';

function parseNameToParts(fullName: string | null): { firstName: string; lastName: string } {
  if (!fullName) {
    return { firstName: 'User', lastName: '' };
  }
  const parts = fullName.trim().split(' ');
  return {
    firstName: parts[0] || 'User',
    lastName: parts.slice(1).join(' ') || '',
  };
}

function backendUserToProfile(backendUser: BackendUser): UserProfile {
  const { firstName, lastName } = parseNameToParts(backendUser.name);
  return {
    id: backendUser.id,
    firstName,
    lastName,
    email: backendUser.email,
    avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${firstName}${lastName}`,
  };
}

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化: 从 localStorage 恢复用户状态
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = localStorage.getItem(USER_STORAGE_KEY);
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser) as UserProfile;
          // 验证用户是否仍有效
          const backendUser = await getCurrentUser(parsedUser.id);
          if (backendUser) {
            setUser(backendUserToProfile(backendUser));
          } else {
            localStorage.removeItem(USER_STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error('Failed to restore user session:', error);
        localStorage.removeItem(USER_STORAGE_KEY);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (email: string): Promise<boolean> => {
    try {
      const backendUser = await loginUser(email);
      const profile = backendUserToProfile(backendUser);
      setUser(profile);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  }, []);

  const register = useCallback(async (email: string, name: string): Promise<boolean> => {
    try {
      const backendUser = await registerUser(email, name);
      const profile = backendUserToProfile(backendUser);
      setUser(profile);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
  }, []);

  const updateUser = useCallback((data: Partial<UserProfile>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        updateUser
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
