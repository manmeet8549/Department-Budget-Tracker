/**
 * ApprovalPolicy Interface & Default Implementation (v1)
 *
 * Rules:
 * - A STAFF request is approved by the HOD of the same department.
 * - A HOD request is approved by any FINANCE user.
 * - The requester can NEVER approve their own request.
 */
export class ApprovalPolicy {
  /**
   * Determine the required approver specification for the next approval step.
   * @param {Object} expense - The expense record { id, departmentId, amount, createdBy, ... }
   * @param {Object} requester - The user who raised/created the request { id, role, departmentId }
   * @returns {Promise<{ stepNo: number, role: string, departmentId?: number } | null>}
   */
  async nextApprover(expense, requester) { // eslint-disable-line no-unused-vars
    throw new Error('nextApprover must be implemented by concrete ApprovalPolicy');
  }

  /**
   * Evaluates if a given user is authorized to approve this expense step.
   * @param {Object} expense 
   * @param {Object} requester 
   * @param {Object} approverCandidate 
   * @returns {Promise<boolean>}
   */
  async isAllowedApprover(expense, requester, approverCandidate) { // eslint-disable-line no-unused-vars
    throw new Error('isAllowedApprover must be implemented by concrete ApprovalPolicy');
  }
}

export class DefaultApprovalPolicy extends ApprovalPolicy {
  async nextApprover(expense, requester) {
    if (!requester || !expense) {
      return null;
    }

    if (requester.role === 'STAFF') {
      return {
        stepNo: 1,
        role: 'HOD',
        departmentId: expense.departmentId,
      };
    }

    if (requester.role === 'HOD') {
      return {
        stepNo: 1,
        role: 'FINANCE',
      };
    }

    return null;
  }

  async isAllowedApprover(expense, requester, approverCandidate) {
    if (!expense || !requester || !approverCandidate) return false;

    // Requester can never approve own request
    if (approverCandidate.id === expense.createdBy || approverCandidate.id === requester.id) {
      return false;
    }

    const next = await this.nextApprover(expense, requester);
    if (!next) return false;

    if (next.role === 'HOD') {
      return approverCandidate.role === 'HOD' && approverCandidate.departmentId === next.departmentId;
    }

    if (next.role === 'FINANCE') {
      return approverCandidate.role === 'FINANCE';
    }

    return false;
  }
}

export const defaultApprovalPolicy = new DefaultApprovalPolicy();
