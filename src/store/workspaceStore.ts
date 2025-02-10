import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

type Workspace = Database['public']['Tables']['workspaces']['Row'];
type WorkspaceMember = Database['public']['Tables']['workspace_members']['Row'];

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  members: WorkspaceMember[];
  loading: boolean;
  fetchWorkspaces: () => Promise<void>;
  createWorkspace: (name: string, description?: string) => Promise<void>;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  fetchMembers: (workspaceId: string) => Promise<void>;
  addMember: (workspaceId: string, email: string, role?: WorkspaceMember['role']) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  currentWorkspace: null,
  members: [],
  loading: false,
  fetchWorkspaces: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    set({ workspaces: data, loading: false });
  },
  createWorkspace: async (name: string, description?: string) => {
    const { data: workspace, error } = await supabase
      .from('workspaces')
      .insert({ name, description })
      .select()
      .single();

    if (error) throw error;
    set((state) => ({
      workspaces: [workspace, ...state.workspaces],
      currentWorkspace: workspace,
    }));
  },
  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  fetchMembers: async (workspaceId: string) => {
    const { data, error } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    set({ members: data });
  },
  addMember: async (workspaceId: string, email: string, role: WorkspaceMember['role'] = 'member') => {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (userError) throw userError;

    const { error } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspaceId,
        user_id: userData.id,
        role,
      });

    if (error) throw error;
    await get().fetchMembers(workspaceId);
  },
}));