import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { User, Group } from '../types';

interface AuthContextType {
  user: User | null;
  group: Group | null;
  userRole: 'creator' | 'member' | null;
  token: string | null;
  isLoading: boolean;
  loginUser: (newToken: string, userData: User, groupData?: Group | null, roleData?: 'creator' | 'member' | null) => Promise<void>;
  logout: () => void;
  refreshUserData: () => Promise<{ user: User | null; group: Group | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [userRole, setUserRole] = useState<'creator' | 'member' | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUserData = async () => {
    try {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setUser(null);
        setGroup(null);
        setUserRole(null);
        setIsLoading(false);
        return { user: null, group: null };
      }

      const res = await api.get('/auth/me');
      const loadedUser = res.data.user;
      const loadedGroup = res.data.group || null;
      const loadedRole = res.data.role || null;

      setUser(loadedUser);
      setGroup(loadedGroup);
      setUserRole(loadedRole);

      return { user: loadedUser, group: loadedGroup };
    } catch (err) {
      console.error('Failed to load user session:', err);
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      setGroup(null);
      setUserRole(null);
      return { user: null, group: null };
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUserData();
  }, []);

  const loginUser = async (
    newToken: string,
    userData: User,
    groupData?: Group | null,
    roleData?: 'creator' | 'member' | null
  ) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    if (groupData !== undefined) {
      setGroup(groupData);
      setUserRole(roleData || null);
    }
    await refreshUserData();
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setGroup(null);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        group,
        userRole,
        token,
        isLoading,
        loginUser,
        logout,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
