import knex from 'knex';
import { Model } from 'objection';
import dotenv from 'dotenv';

dotenv.config();

const knexInstance = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL || {
    host: 'localhost',
    port: 5432,
    user: 'user',
    password: 'password',
    database: 'language_app',
  },
  pool: {
    min: parseInt(process.env.DATABASE_POOL_MIN || '5'),
    max: parseInt(process.env.DATABASE_POOL_MAX || '20'),
  },
});

Model.knex(knexInstance);

export { knexInstance };
