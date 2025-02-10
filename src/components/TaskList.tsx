import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MoreVertical, Plus } from 'lucide-react';
import { useTaskStore } from '../store/taskStore';
import Task from './Task';
import type { Database } from '../types/supabase';

type TaskList = Database['public']['Tables']['task_lists']['Row'];
type Task = Database['public']['Tables']['tasks']['Row'];

interface TaskListProps {
  list: TaskList;
  tasks: Task[];
}

export default function TaskList({ list, tasks }: TaskListProps) {
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const { createTask } = useTaskStore();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: list.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskTitle.trim()) {
      await createTask({
        list_id: list.id,
        title: newTaskTitle,
        position: tasks.length,
        created_by: '', // Will be set by RLS
      });
      setNewTaskTitle('');
      setShowNewTask(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex-shrink-0 w-80 bg-gray-50 rounded-lg shadow"
    >
      <div className="p-4 flex items-center justify-between border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">{list.name}</h3>
        <button className="text-gray-500 hover:text-gray-700">
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {tasks.map((task) => (
          <Task key={task.id} task={task} />
        ))}

        {showNewTask ? (
          <form onSubmit={handleCreateTask} className="space-y-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Task title"
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowNewTask(false)}
                className="px-3 py-1 text-sm text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700"
              >
                Add
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowNewTask(true)}
            className="w-full px-3 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md flex items-center justify-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </button>
        )}
      </div>
    </div>
  );
}