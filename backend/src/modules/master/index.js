/**
 * master/index.js
 * PUBLIC API for the master module.
 * Other modules must only import from this file.
 */
export {
  getActiveFinancialYear,
  getDepartment,
  listDepartments,
  getCategory,
} from './service.js';

export { masterRouter } from './routes.js';
