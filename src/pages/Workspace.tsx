import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useTaskStore } from '../store/taskStore';
import TaskList from '../components/TaskList';
import { Plus } from 'lucide-react';

export default function Workspace() {
  const { id } = useParams<{ id: string }>();
  const { currentWorkspace, setCurrentWorkspace, workspaces } = useWorkspaceStore();
  const { lists, tasks, loading, fetchLists, createList, reorderTask } = useTaskStore();

  useEffect(() => {
    if (id) {
      const workspace = workspaces.find((w) => w.id === id);
      if (workspace) {
        setCurrentWorkspace(workspace);
        fetchLists(workspace.id);
      }
    }
  }, [id, workspaces, setCurrentWorkspace, fetchLists]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const taskId = active.id as string;
      const [sourceListId, targetListId] = [
        active.data.current?.sortable.containerId,
        over.data.current?.sortable.containerId,
      ];

      if (sourceListId && targetListId) {
        const targetList = tasks[targetListId];
        const newPosition = targetList.length;
        reorderTask(taskId, targetListId, newPosition);
      }
    }
  };

  const handleCreateList = async () => {
    if (currentWorkspace) {
      const name = prompt('Enter list name:');
      if (name) {
        await createList(currentWorkspace.id, name);
      }
    }
  };

  if (loading || !currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{currentWorkspace.name}</h1>
          <button
            onClick={handleCreateList}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add List
          </button>
        </div>
        {currentWorkspace.description && (
          <p className="mt-1 text-sm text-gray-500">{currentWorkspace.description}</p>
        )}
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex space-x-4 overflow-x-auto pb-4">
          <SortableContext items={lists.map((list) => list.id)} strategy={horizontalListSortingStrategy}>
            {lists.map((list) => (
              <TaskList
                key={list.id}
                list={list}
                tasks={tasks[list.id] || []}
              />
            ))}
          </SortableContext>
        </div>
      </DndContext>
    </div>
  );
}