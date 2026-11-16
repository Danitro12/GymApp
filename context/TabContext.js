import React, { createContext, useContext, useMemo, useRef } from 'react';

const TabContext = createContext({ switchTab: () => { }, registerSwitch: () => { } });

export function TabProvider({ children }) {
  // TabNavigator registra aquí la función real al montarse.
  const switchTabRef = useRef(() => { });
  const value = useMemo(() => ({
    // Nombre de pestaña: 'Home' | 'Routines' | 'Exercises' | 'Muscles' | 'Settings'
    switchTab: (tabName) => switchTabRef.current(tabName),
    registerSwitch: (fn) => { switchTabRef.current = fn; },
  }), []);
  return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
}

export function useTab() {
  return useContext(TabContext);
}
