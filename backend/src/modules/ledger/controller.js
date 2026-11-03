import * as ledgerService from './service.js';

export async function getStatus(req, res, next) {
  try {
    const data = await ledgerService.getStatus();
    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
}

export async function listBlocks(req, res, next) {
  try {
    const result = await ledgerService.listBlocks(req.query);
    res.json({
      success: true,
      data: result.blocks,
      meta: result.meta,
    });
  } catch (err) {
    next(err);
  }
}

export async function anchor(req, res, next) {
  try {
    const result = await ledgerService.anchorPending({ userId: req.user?.id });
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function retryBlock(req, res, next) {
  try {
    const result = await ledgerService.retryBlock(req.params.id, { userId: req.user?.id });
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function verify(req, res, next) {
  try {
    const result = await ledgerService.verifyAll({ userId: req.user?.id });
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function getProof(req, res, next) {
  try {
    const result = await ledgerService.getProof(req.params.auditEntryId);
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

