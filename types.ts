
export enum Role {
  USER = 'user',
  MODEL = 'model',
}

export interface Source {
  uri: string;
  title: string;
  snippet?: string;
}

export interface Message {
  role: Role;
  content: string;
  sources?: Source[];
  feedback?: 'up' | 'down';
}
