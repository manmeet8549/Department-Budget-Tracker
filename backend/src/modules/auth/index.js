/**
 * auth/index.js
 * PUBLIC API for auth module.
 */
export {
  getUserById,
  getUserScope,
  isActive,
  listApprovers,
  login,
  refresh,
  changePassword,
  createUser,
  listUsers,
  updateUser,
} from './service.js';

export { authRouter } from './routes.js';
export { usersRouter } from './users.routes.js';
