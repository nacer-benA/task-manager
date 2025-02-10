import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/supabase';

type TaskList = Database['public']['Tables']['task_lists']['Row'];
type Task = Database['public']['Tables']['tasks']['Row'];

interface TaskState {
  lists: TaskList[];
  tasks: Record<string, Task[]>;
  loading: boolean;
  fetchLists: (workspaceId: string) => Promise<void>;
  createList: (workspaceId: string, name: string) => Promise<void>;
  fetchTasks: (listId: string) => Promise<void>;
  createTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  reorderTask: (taskId: string, listId: string, newPosition: number) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  lists: [],
  tasks: {},
  loading: false,
  fetchLists: async (workspaceId: string) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('task_lists')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('position');

    if (error) throw error;
    set({ lists: data, loading: false });

    // Fetch tasks for each list
    await Promise.all(data.map((list) => get().fetchTasks(list.id)));
  },
  createList: async (workspaceId: string, name: string) => {
    const position = get().lists.length;
    const { data: list, error } = await supabase
      .from('task_lists')
      .insert({ workspace_id: workspaceId, name, position })
      .select()
      .single();

    if (error) throw error;
    set((state) => ({ lists: [...state.lists, list] }));
  },
  fetchTasks: async (listId: string) => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('list_id', listId)
      .order('position');

    if (error) throw error;
    set((state) => ({
      tasks: {
        ...state.tasks,
        [listId]: data,
      },
    }));
  },
  createTask: async (task) => {
    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert(task)
      .select()
      .single();

    if (error) throw error;
    set((state) => ({
      tasks: {
        ...state.tasks,
        [task.list_id]: [...(state.tasks[task.list_id] || []), newTask],
      },
    }));
  },
  updateTask: async (taskId: string, updates) => {
    const { data: updatedTask, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    set((state) => ({
      tasks: {
        ...state.tasks,
        [updatedTask.list_id]: state.tasks[updatedTask.list_id].map((task) =>
          task.id === taskId ? updatedTask : task
        ),
      },
    }));
  },
  reorderTask: async (taskId: string, listId: string, newPosition: number) => {
    const { error } = await supabase
      .from('tasks')
      .update({ position: newPosition, list_id: listId })
      .eq('id', taskId);

    if (error) throw error;
    await get().fetchTasks(listId);
  },
}));