export type UserRole = 'APPLICANT' | 'OFFICER';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at?: string;
}
