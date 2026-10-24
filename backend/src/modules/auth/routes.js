import { Router } from 'express';
import { requireAuth, validate } from '../platform/index.js';
import * as authController from './controller.js';
import { loginSchema, changePasswordSchema } from './schema.js';

export const authRouter = Router();

authRouter.post('/login', validate(loginSchema), authController.login);
authRouter.post('/refresh', authController.refresh);
authRouter.post('/logout', requireAuth, authController.logout);
authRouter.post('/change-password', requireAuth, validate(changePasswordSchema), authController.changePassword);
authRouter.get('/me', requireAuth, authController.getMe);
