import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/db.js';

export async function seed() {
  console.log('Seeding initial departments and users...');

  // 1. Seed Placeholder Departments (will be expanded in Iteration 2)
  const departments = [
    { code: 'ET', name: 'Engineering Block' },
    { code: 'PHARMA', name: 'Pharmacy Block' },
    { code: 'HM', name: 'Hotel Management Block' },
    { code: 'MT', name: 'MT Block' },
  ];

  const deptMap = {};
  for (const dept of departments) {
    const record = await prisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name },
      create: { code: dept.code, name: dept.name },
    });
    deptMap[dept.code] = record.id;
  }

  // 2. Default Test Password for all seeded users
  const defaultPassword = 'Password@123';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(defaultPassword, salt);

  // 3. Seed One User Per Role
  const users = [
    {
      email: 'superadmin@college.edu',
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      departmentId: null,
      isActive: true,
    },
    {
      email: 'management@college.edu',
      name: 'Management Approver',
      role: 'MANAGEMENT',
      departmentId: null,
      isActive: true,
    },
    {
      email: 'finance@college.edu',
      name: 'Finance Officer',
      role: 'FINANCE',
      departmentId: null,
      isActive: true,
    },
    {
      email: 'hod_et@college.edu',
      name: 'HoD Engineering',
      role: 'HOD',
      departmentId: deptMap.ET,
      isActive: true,
    },
    {
      email: 'hod_pharma@college.edu',
      name: 'HoD Pharmacy',
      role: 'HOD',
      departmentId: deptMap.PHARMA,
      isActive: true,
    },
    {
      email: 'staff_et@college.edu',
      name: 'Staff Engineering',
      role: 'STAFF',
      departmentId: deptMap.ET,
      isActive: true,
    },
    {
      email: 'auditor@college.edu',
      name: 'External Auditor',
      role: 'AUDITOR',
      departmentId: null,
      isActive: true,
    },
    {
      email: 'disabled_user@college.edu',
      name: 'Disabled User',
      role: 'STAFF',
      departmentId: deptMap.ET,
      isActive: false,
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        departmentId: u.departmentId,
        isActive: u.isActive,
        passwordHash,
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        departmentId: u.departmentId,
        isActive: u.isActive,
        passwordHash,
      },
    });
  }

  console.log('Seeding completed successfully!');
}

// Allow direct CLI execution
if (process.argv[1]?.endsWith('seed.js')) {
  seed()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
