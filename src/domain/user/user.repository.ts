import { User } from './user.model';

export interface UserRepository {
  createUser(user: User): Promise<User>;
  getUserById(id: string): Promise<User>;
  getUserByExternalId(externalId: string): Promise<User>;
  updateUser(user: User): Promise<User>;
  deleteUser(id: string): Promise<void>;
}
