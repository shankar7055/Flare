import React, { createContext, useContext, useState, ReactNode } from 'react';

export type TriggerConfig = {
  action: 'prioritize' | 'rescue' | 'parse' | 'view';
  taskId?: number;
  payload?: string;
  runId?: number; // for read-only view
  triggerId?: string;
};

interface AgentModalContextType {
  isOpen: boolean;
  triggerConfig: TriggerConfig | null;
  openModal: (config: Omit<TriggerConfig, 'triggerId'>) => void;
  closeModal: () => void;
}

const AgentModalContext = createContext<AgentModalContextType | undefined>(undefined);

export const AgentModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [triggerConfig, setTriggerConfig] = useState<TriggerConfig | null>(null);

  const openModal = (config: Omit<TriggerConfig, 'triggerId'>) => {
    // Generate a unique triggerId so the modal knows this is a fresh invocation
    const triggerId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setTriggerConfig({ ...config, triggerId });
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    // We intentionally don't clear triggerConfig immediately to allow exit animations
    // and keep the content visible while the modal fades out if needed.
  };

  return (
    <AgentModalContext.Provider value={{ isOpen, triggerConfig, openModal, closeModal }}>
      {children}
    </AgentModalContext.Provider>
  );
};

export const useAgentModal = () => {
  const context = useContext(AgentModalContext);
  if (!context) {
    throw new Error('useAgentModal must be used within an AgentModalProvider');
  }
  return context;
};
