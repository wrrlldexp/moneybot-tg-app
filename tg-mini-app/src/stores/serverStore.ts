/**
 * Active server selection — persists which trading server is selected.
 */

import { create } from "zustand";

interface ServerState {
  activeServerId: number | null;
  setActiveServer: (id: number) => void;
  clearServer: () => void;
}

export const useServerStore = create<ServerState>((set) => ({
  activeServerId: null,
  setActiveServer: (id) => set({ activeServerId: id }),
  clearServer: () => set({ activeServerId: null }),
}));
