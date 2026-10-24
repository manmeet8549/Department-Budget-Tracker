import { jest } from '@jest/globals';
import { events } from '../../platform/index.js';
import * as auth from '../service.js';
import { prisma } from '../../../config/db.js';

describe('auth module events (user.created, user.disabled)', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('emits user.created when a user is created', async () => {
    const createdListener = jest.fn();
    events.on('user.created', createdListener);

    const email = `event_test_${Date.now()}@college.edu`;
    const user = await auth.createUser(
      { id: 1, role: 'SUPER_ADMIN' },
      { email, password: 'Password@123', name: 'Event User', role: 'STAFF', departmentId: 1 }
    );

    expect(createdListener).toHaveBeenCalledWith({
      userId: user.id,
      email: user.email,
      role: 'STAFF',
      departmentId: 1,
    });
  });

  it('emits user.disabled when a user is disabled', async () => {
    const disabledListener = jest.fn();
    events.on('user.disabled', disabledListener);

    const email = `event_disable_${Date.now()}@college.edu`;
    const user = await auth.createUser(
      { id: 1, role: 'SUPER_ADMIN' },
      { email, password: 'Password@123', name: 'To Disable', role: 'STAFF', departmentId: 1 }
    );

    await auth.updateUser({ id: 1, role: 'SUPER_ADMIN' }, user.id, { isActive: false });

    expect(disabledListener).toHaveBeenCalledWith({
      userId: user.id,
    });
  });
});
