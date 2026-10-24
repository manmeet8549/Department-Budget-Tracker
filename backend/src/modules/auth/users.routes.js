import { Router } from 'express';
import { requireAuth, requireRole, validate } from '../platform/index.js';
import * as authController from './controller.js';
import { createUserSchema, updateUserSchema } from './schema.js';

export const usersRouter = Router();

// Restricted to SUPER_ADMIN
usersRouter.use(requireAuth, requireRole('SUPER_ADMIN'));

usersRouter.get('/', authController.listUsers);
usersRouter.post('/', validate(createUserSchema), authController.createUser);
usersRouter.patch('/:id', validate(updateUserSchema), authController.updateUser);
