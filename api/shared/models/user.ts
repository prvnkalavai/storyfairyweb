
export interface User {
  id: string;
  userId: string;
  email: string;
  credits: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserDTO {
  userId: string;
  email: string;
  credits: number;
}