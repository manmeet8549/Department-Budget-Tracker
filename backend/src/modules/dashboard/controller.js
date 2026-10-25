/**
 * modules/dashboard/controller.js
 * HTTP controllers for dashboard module.
 */
import * as dashboardService from './service.js';

export async function getDashboardSummary(req, res, next) {
  try {
    const data = await dashboardService.getDashboardSummary(req.user, req.query);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}
