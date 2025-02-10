import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, User } from 'lucide-react';
import type { Database } from '../types/supabase';

type Task = Database['public']['Tables']['tasks']['Row'];

interface TaskProps {
  task: Task;
}

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

export default function Task({ task }: TaskProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-move hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            priorityColors[task.priority]
          }`}
        >
          {task.priority}
        </span>
      </div>

      {task.description && (
        <p className="mt-1 text-sm text-gray-500">{task.description}</p>
      )}

      <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
        {task.due_date && (
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            {new Date(task.due_date).toLocaleDateString()}
          </div>
        )}
        {task.assigned_to && (
          <div className="flex items-center">
            <User className="h-4 w-4 mr-1" />
            Assigned
          </div>
        )}
      </div>
    </div>
  );
}