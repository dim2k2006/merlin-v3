import { SqlQuerySpec, Container, Resource } from '@azure/cosmos';
import { omit } from 'ramda';
import { User } from './user.model';
import { UserRepository } from './user.repository';

interface ConstructorProps {
  container: Container;
}

class UserRepositoryCosmosDb implements UserRepository {
  private readonly container: Container;

  constructor({ container }: ConstructorProps) {
    this.container = container;
  }

  async createUser(user: User): Promise<User> {
    const { resource } = await this.container.items.create(user);

    if (!resource) {
      throw new Error('Failed to create new user in cosmosDB.');
    }

    return this.omitCosmosProperties(resource);
  }

  async getUserById(id: string): Promise<User> {
    const query: SqlQuerySpec = {
      query: `SELECT * from c WHERE c.id = @id`,
      parameters: [
        {
          name: '@id',
          value: id,
        },
      ],
    };

    const { resources: users } = await this.container.items.query<User & Resource>(query).fetchAll();

    const user = users[0];

    if (!user) {
      throw new Error(`Failed to retrieve user from cosmosDB by ID: ${id}`);
    }

    return this.omitCosmosProperties(user);
  }

  async getUserByExternalId(externalId: string): Promise<User> {
    const query: SqlQuerySpec = {
      query: `SELECT * from c WHERE c.externalId = @externalId`,
      parameters: [
        {
          name: '@externalId',
          value: externalId,
        },
      ],
    };

    const { resources: users } = await this.container.items.query<User & Resource>(query).fetchAll();

    const user = users[0];

    if (!user) {
      throw new Error(`Failed to retrieve user from cosmosDB by external ID: ${externalId}`);
    }

    return this.omitCosmosProperties(user);
  }

  async updateUser(user: User): Promise<User> {
    const { resource } = await this.container.items.upsert(user);

    if (!resource) {
      throw new Error('Failed to update user in cosmosDB.');
    }

    return this.omitCosmosProperties(resource as User & Resource);
  }

  async deleteUser(id: string): Promise<void> {
    await this.container.item(id, id).delete();
  }

  private omitCosmosProperties(resource: User & Resource): User {
    return omit(['_rid', '_self', '_etag', '_ts'], resource);
  }
}

export default UserRepositoryCosmosDb;
