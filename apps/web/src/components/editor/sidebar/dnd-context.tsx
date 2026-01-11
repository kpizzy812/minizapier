'use client';

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { NodeTypeKey } from '../nodes';

interface DnDContextType {
  type: NodeTypeKey | null;
  setType: Dispatch<SetStateAction<NodeTypeKey | null>>;
}

const DnDContext = createContext<DnDContextType | null>(null);

export function DnDProvider({ children }: { children: ReactNode }) {
  const [type, setType] = useState<NodeTypeKey | null>(null);

  return (
    <DnDContext.Provider value={{ type, setType }}>
      {children}
    </DnDContext.Provider>
  );
}

export function useDnD(): [NodeTypeKey | null, Dispatch<SetStateAction<NodeTypeKey | null>>] {
  const context = useContext(DnDContext);

  if (!context) {
    throw new Error('useDnD must be used within a DnDProvider');
  }

  return [context.type, context.setType];
}
