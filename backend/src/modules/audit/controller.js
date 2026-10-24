import * as auditService from './service.js';

export async function getAuditLogs(req, res, next) {
  try {
    const result = await auditService.search(req.query);
    res.json({
      success: true,
      data: result.logs,
      meta: result.meta,
    });
  } catch (err) {
    next(err);
  }
}
