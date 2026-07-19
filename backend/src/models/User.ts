import { Model } from 'objection';

export class User extends Model {
  static tableName = 'users';

  id!: string;
  email!: string;
  password_hash!: string;
  current_level!: number;
  locale!: string;
  preferences?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  last_active_at?: string;
  deleted_at?: string;

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['email', 'password_hash'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
        password_hash: { type: 'string' },
        current_level: { type: 'integer', minimum: 0, maximum: 5 },
        locale: { type: 'string' },
        preferences: { type: 'object' },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
        last_active_at: { type: 'string', format: 'date-time' },
        deleted_at: { type: 'string', format: 'date-time' },
      },
    };
  }
}
