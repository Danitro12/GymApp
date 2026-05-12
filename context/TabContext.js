import React, { createContext, useContext, useRef } from 'react';

const TabContext = createContext({ switchTab: () => { } });
export function TabProvider({ children }) {
  // Will be overwritten by TabNavigator after mount
  const switchTabRef = useRef(() => { });
  const value = {
    // Call with a tab name string: 'Home' | 'Routines' | 'History' | 'Muscles' | 'Settings'
    switchTab: (tabName) => switchTabRef.current(tabName),
    // Allows TabNavigator to register the actual switch function
    registerSwitch: (fn) => { switchTabRef.current = fn; },
  };
  return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
}
export function useTab() {
  return useContext(TabContext);
}