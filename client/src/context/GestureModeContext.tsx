// client/src/context/GestureModeContext.tsx - Global State for 3D Holographic Gesture Mode

import React, { createContext, useContext, useState, useCallback } from 'react';

interface GestureModeContextType {
  isGestureModeActive: boolean;
  openGestureMode: () => void;
  closeGestureMode: () => void;
  toggleGestureMode: () => void;
}

const GestureModeContext = createContext<GestureModeContextType | undefined>(undefined);

export const GestureModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isGestureModeActive, setIsGestureModeActive] = useState(false);

  const openGestureMode = useCallback(() => setIsGestureModeActive(true), []);
  const closeGestureMode = useCallback(() => setIsGestureModeActive(false), []);
  const toggleGestureMode = useCallback(() => setIsGestureModeActive((prev) => !prev), []);

  return (
    <GestureModeContext.Provider
      value={{
        isGestureModeActive,
        openGestureMode,
        closeGestureMode,
        toggleGestureMode,
      }}
    >
      {children}
    </GestureModeContext.Provider>
  );
};

export const useGestureMode = (): GestureModeContextType => {
  const context = useContext(GestureModeContext);
  if (!context) {
    throw new Error('useGestureMode must be used within a GestureModeProvider');
  }
  return context;
};
