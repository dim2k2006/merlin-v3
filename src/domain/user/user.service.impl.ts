import { v4 as uuidV4 } from 'uuid';
import { User } from './user.model';
import { UserRepository } from './user.repository';
import { UserService, CreateUserInput } from './user.service';

type ConstructorInput = {
  userRepository: UserRepository;
};

class UserServiceImpl implements UserService {
  private readonly userRepository: UserRepository;

  constructor({ userRepository }: ConstructorInput) {
    this.userRepository = userRepository;
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const user = {
      id: input.id ?? uuidV4(),
      externalId: input.externalId,
      firstName: input.firstName,
      lastName: input.lastName,
      createdAt: new Date().toISOString(),
    };

    return this.userRepository.createUser(user);
  }

  async getUserById(id: string): Promise<User> {
    return this.userRepository.getUserById(id);
  }

  async getUserByExternalId(externalId: string): Promise<User> {
    return this.userRepository.getUserByExternalId(externalId);
  }

  async getUserByIdOrExternalId(idOrExternalId: string): Promise<User> {
    const user = (await this.getUserByIdSave(idOrExternalId)) || (await this.getUserByExternalIdSave(idOrExternalId));

    if (!user) {
      throw new Error(`Failed to find user with id or externalId: ${idOrExternalId}`);
    }

    return user;
  }

  async isUserExist(idOrExternalId: string): Promise<boolean> {
    const user = (await this.getUserByIdSave(idOrExternalId)) || (await this.getUserByExternalIdSave(idOrExternalId));

    return !!user;
  }

  async updateUser(user: User): Promise<User> {
    return this.userRepository.updateUser(user);
  }

  async deleteUser(id: string): Promise<void> {
    return this.userRepository.deleteUser(id);
  }

  private async getUserByIdSave(id: string): Promise<User | null> {
    try {
      return await this.getUserById(id);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return null;
    }
  }

  private async getUserByExternalIdSave(externalId: string): Promise<User | null> {
    try {
      return await this.getUserByExternalId(externalId);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return null;
    }
  }
}

export default UserServiceImpl;
