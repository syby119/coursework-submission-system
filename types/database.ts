export type AppRole = "student" | "admin";

export type Profile = {
  id: string;
  student_number: string | null;
  name: string;
  role: AppRole;
  created_at: string;
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

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        Profile,
        { id: string; student_number?: string | null; name: string; role?: AppRole },
        { student_number?: string | null; name?: string; role?: AppRole }
      >;
      assignments: Table<
        Assignment,
        {
          id?: string;
          title: string;
          description?: string;
          published_at?: string;
          deadline: string;
          created_by: string;
        },
        {
          title?: string;
          description?: string;
          published_at?: string;
          deadline?: string;
        }
      >;
      submissions: Table<
        Submission,
        {
          id?: string;
          assignment_id: string;
          student_id: string;
          storage_path: string;
          original_filename: string;
          file_size: number;
          submitted_at?: string;
          updated_at?: string;
        },
        {
          storage_path?: string;
          original_filename?: string;
          file_size?: number;
          submitted_at?: string;
          updated_at?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: { app_role: AppRole };
    CompositeTypes: Record<string, never>;
  };
};
