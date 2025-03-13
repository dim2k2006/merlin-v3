import { createClient } from '@supabase/supabase-js';
import { Database } from '../../types/database.types';
import { User } from './user.model';
import { UserRepository } from './user.repository';

type ConstructorInput = {
  supabaseUrl: string;
  supabaseKey: string;
};

class UserRepositorySupabase implements UserRepository {
  private supabase: ReturnType<typeof createClient<Database>>;

  constructor({ supabaseUrl, supabaseKey }: ConstructorInput) {
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey);
  }

  async createUser(user: User): Promise<User> {
    const { data, error } = await this.supabase
      .from('users')
      .insert({
        id: user.id,
        external_id: user.externalId,
        firstName: user.firstName,
        lastName: user.lastName,
        created_at: user.createdAt,
      })
      .select();

    if (error) {
      throw error;
    }

    return this.transformUser(data[0]);
  }

  async getUserById(id: string): Promise<User> {
    const { data, error } = await this.supabase.from('users').select().eq('id', id);

    if (error) {
      throw error;
    }

    if (data.length === 0) {
      throw new Error(`Failed to find user with ID: ${id}`);
    }

    return this.transformUser(data[0]);
  }

  async getUserByExternalId(externalId: string): Promise<User> {
    const { data, error } = await this.supabase.from('users').select().eq('external_id', externalId);

    if (error) {
      throw error;
    }

    if (data.length === 0) {
      throw new Error(`Failed to find user with external ID: ${externalId}`);
    }

    return this.transformUser(data[0]);
  }

  async updateUser(user: User): Promise<User> {
    const { data, error } = await this.supabase
      .from('users')
      .update({
        external_id: user.externalId,
        firstName: user.firstName,
        lastName: user.lastName,
      })
      .eq('id', user.id)
      .select();

    if (error) {
      throw error;
    }

    return this.transformUser(data[0]);
  }

  async deleteUser(id: string): Promise<void> {
    const { error } = await this.supabase.from('users').delete().eq('id', id);

    if (error) {
      throw error;
    }
  }

  private transformUser(user: Database['public']['Tables']['users']['Row']): User {
    return {
      id: user.id,
      externalId: user.external_id ?? '',
      firstName: user.firstName,
      lastName: user.lastName ?? '',
      createdAt: user.created_at,
    };
  }
}

export default UserRepositorySupabase;
