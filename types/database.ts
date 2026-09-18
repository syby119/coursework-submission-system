export type AppRole = "student" | "admin";

export type User = {
  id: string;
  student_number: string;
  name: string;
  role: AppRole;
  created_at: string;
  updated_at: string;
};

export type Assignment = {
  id: string;
  title: string;
  description: string;
  published_at: string;
  deadline: string;
  created_at: string;
  updated_at: string;
  created_by: string;
};

export type Submission = {
  id: string;
  assignment_id: string;
  student_id: string;
  storage_path: string;
  original_filename: string;
  file_size: number;
  submitted_at: string;
  updated_at: string;
};
