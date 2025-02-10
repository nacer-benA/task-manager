/*
  # Task Management Initial Schema

  1. New Tables
    - `workspaces`
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `created_at` (timestamp)
      - `created_by` (uuid, references auth.users)

    - `workspace_members`
      - `workspace_id` (uuid, references workspaces)
      - `user_id` (uuid, references auth.users)
      - `role` (text)
      - `joined_at` (timestamp)

    - `task_lists`
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, references workspaces)
      - `name` (text)
      - `position` (integer)
      - `created_at` (timestamp)

    - `tasks`
      - `id` (uuid, primary key)
      - `list_id` (uuid, references task_lists)
      - `title` (text)
      - `description` (text)
      - `status` (text)
      - `priority` (text)
      - `position` (integer)
      - `due_date` (timestamp)
      - `assigned_to` (uuid, references auth.users)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for workspace members to access their workspace data
    - Add policies for task creation and updates
*/

-- Create enums for task status and priority
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'done');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member');

-- Create workspaces table
CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users NOT NULL
);

-- Create workspace members table
CREATE TABLE workspace_members (
  workspace_id uuid REFERENCES workspaces ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  role member_role NOT NULL DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

-- Create task lists table
CREATE TABLE task_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create tasks table
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid REFERENCES task_lists ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status task_status NOT NULL DEFAULT 'todo',
  priority task_priority NOT NULL DEFAULT 'medium',
  position integer NOT NULL DEFAULT 0,
  due_date timestamptz,
  assigned_to uuid REFERENCES auth.users,
  created_by uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Workspace policies
CREATE POLICY "Users can view workspaces they are members of"
  ON workspaces FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Workspace members policies
CREATE POLICY "Users can view members of their workspaces"
  ON workspace_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members AS wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace admins can manage members"
  ON workspace_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members AS wm
      WHERE wm.workspace_id = workspace_members.workspace_id
      AND wm.user_id = auth.uid()
      AND wm.role IN ('owner', 'admin')
    )
  );

-- Task lists policies
CREATE POLICY "Users can view task lists in their workspaces"
  ON task_lists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = task_lists.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage task lists in their workspaces"
  ON task_lists
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = task_lists.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- Tasks policies
CREATE POLICY "Users can view tasks in their workspaces"
  ON tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      JOIN task_lists ON task_lists.workspace_id = workspace_members.workspace_id
      WHERE task_lists.id = tasks.list_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage tasks in their workspaces"
  ON tasks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      JOIN task_lists ON task_lists.workspace_id = workspace_members.workspace_id
      WHERE task_lists.id = tasks.list_id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for tasks updated_at
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();