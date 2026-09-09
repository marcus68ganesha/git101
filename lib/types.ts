// Hand-written types mirroring the Supabase schema (supabase/migrations).
// Swap for `supabase gen types typescript` output once the schema settles.

export type Student = {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  grade_level: string | null;
  guardian_name: string | null;
  guardian_contact: string | null;
  notes: string | null;
  photo_url: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type StudentInput = {
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  grade_level: string | null;
  guardian_name: string | null;
  guardian_contact: string | null;
  notes: string | null;
};
