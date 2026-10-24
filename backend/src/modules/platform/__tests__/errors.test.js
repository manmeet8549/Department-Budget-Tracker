/**
 * platform/__tests__/errors.test.js
 * Tests: AppError class and errorHandler middleware
 * Written BEFORE implementation (TDD — these fail first)
 */
import { jest } from '@jest/globals';
import { AppError } from '../errors.js';
import { errorHandler } from '../error-handler.js';

describe('AppError', () => {
  it('stores code, message, status and details', () => {
    const err = new AppError('TEST_CODE', 'something went wrong', 422, { field: 'amount' });
    expect(err.code).toBe('TEST_CODE');
    expect(err.message).toBe('something went wrong');
    expect(err.status).toBe(422);
    expect(err.details).toEqual({ field: 'amount' });
    expect(err instanceof Error).toBe(true);
  });

  it('defaults status to 500 and details to {}', () => {
    const err = new AppError('ERR', 'oops');
    expect(err.status).toBe(500);
    expect(err.details).toEqual({});
  });

  it('is an instance of Error', () => {
    const err = new AppError('X', 'y');
    expect(err instanceof Error).toBe(true);
  });
});

describe('errorHandler middleware', () => {
  const makeRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  it('formats AppError correctly as { success:false, error:{code,message,details} }', () => {
    const err = new AppError('INSUFFICIENT_BALANCE', 'Not enough balance', 409, { available: 500 });
    const res = makeRes();
    errorHandler(err, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'INSUFFICIENT_BALANCE', message: 'Not enough balance', details: { available: 500 } },
    });
  });

  it('formats unknown errors as 500 INTERNAL_ERROR', () => {
    const err = new Error('crash');
    const res = makeRes();
    errorHandler(err, {}, res, () => {});
    expect(res.status).toHaveBeenCalledWith(500);
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});
