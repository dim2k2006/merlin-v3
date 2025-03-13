import { User } from './user.model';

export interface UserService {
  createUser(user: CreateUserInput): Promise<User>;
  getUserById(id: string): Promise<User>;
  getUserByExternalId(externalId: string): Promise<User>;
  getUserByIdOrExternalId(idOrExternalId: string): Promise<User>;
  isUserExist(idOrExternalId: string): Promise<boolean>;
  updateUser(user: User): Promise<User>;
  deleteUser(id: string): Promise<void>;
}

export type CreateUserInput = {
  id?: string;
  externalId: string;
  firstName: string;
  lastName: string;
};
