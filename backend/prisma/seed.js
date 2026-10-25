import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/db.js';

export async function seed() {
  console.log('Seeding master data (financial year, departments, categories) and users...');

  // 1. Seed Financial Year (2026-27, 1 April 2026 to 31 March 2027)
  const fy = await prisma.financialYear.upsert({
    where: { year: '2026-27' },
    update: {
      startDate: new Date('2026-04-01T00:00:00.000Z'),
      endDate: new Date('2027-03-31T23:59:59.999Z'),
      isActive: true,
      status: 'OPEN',
    },
    create: {
      year: '2026-27',
      startDate: new Date('2026-04-01T00:00:00.000Z'),
      endDate: new Date('2027-03-31T23:59:59.999Z'),
      isActive: true,
      status: 'OPEN',
    },
  });

  // Ensure only one active FY (mark any other FY as inactive)
  await prisma.financialYear.updateMany({
    where: { id: { not: fy.id } },
    data: { isActive: false },
  });

  // 2. Seed Parent Departments
  const parentDepartments = [
    { code: 'ET', name: 'Engineering Block' },
    { code: 'PHARMA', name: 'Pharmacy Block' },
    { code: 'HM', name: 'Hotel Management Block' },
    { code: 'MT', name: 'Management and Technology Block' },
  ];

  const deptMap = {};
  for (const dept of parentDepartments) {
    const record = await prisma.department.upsert({
      where: { code: dept.code },
      update: { name: dept.name, isActive: true },
      create: { code: dept.code, name: dept.name, isActive: true },
    });
    deptMap[dept.code] = record.id;
  }

  // Seed Sub-Units under MT
  const subUnits = [
    { code: 'BBA', name: 'Bachelor of Business Administration', parentId: deptMap.MT },
    { code: 'BCOM', name: 'Bachelor of Commerce', parentId: deptMap.MT },
  ];

  for (const sub of subUnits) {
    const record = await prisma.department.upsert({
      where: { code: sub.code },
      update: { name: sub.name, parentId: sub.parentId, isActive: true },
      create: { code: sub.code, name: sub.name, parentId: sub.parentId, isActive: true },
    });
    deptMap[sub.code] = record.id;
  }

  // 3. Seed Categories
  const categories = [
    'Equipment',
    'Consumables',
    'Maintenance',
    'Events and Seminars',
    'Books and Journals',
    'Travel and Tours',
    'Software',
    'Miscellaneous',
  ];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { name },
      update: { isActive: true },
      create: { name, isActive: true },
    });
  }

  // 4. Default Test Password for all seeded users
  const defaultPassword = 'Password@123';
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(defaultPassword, salt);

  // 5. Seed Users
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
      email: 'hod_hm@college.edu',
      name: 'HoD Hotel Management',
      role: 'HOD',
      departmentId: deptMap.HM,
      isActive: true,
    },
    {
      email: 'staff_hm@college.edu',
      name: 'Staff Hotel Management',
      role: 'STAFF',
      departmentId: deptMap.HM,
      isActive: true,
    },
    {
      email: 'hod_mt@college.edu',
      name: 'HoD Management',
      role: 'HOD',
      departmentId: deptMap.MT,
      isActive: true,
    },
    {
      email: 'staff_mt@college.edu',
      name: 'Staff Management',
      role: 'STAFF',
      departmentId: deptMap.MT,
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

  const userMap = {};
  for (const u of users) {
    const record = await prisma.user.upsert({
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
    userMap[u.email] = record.id;
  }

  // Link HoDs to their departments
  if (userMap['hod_et@college.edu']) {
    await prisma.department.update({
      where: { id: deptMap.ET },
      data: { hodUserId: userMap['hod_et@college.edu'] },
    });
  }
  if (userMap['hod_pharma@college.edu']) {
    await prisma.department.update({
      where: { id: deptMap.PHARMA },
      data: { hodUserId: userMap['hod_pharma@college.edu'] },
    });
  }
  if (userMap['hod_hm@college.edu']) {
    await prisma.department.update({
      where: { id: deptMap.HM },
      data: { hodUserId: userMap['hod_hm@college.edu'] },
    });
  }
  if (userMap['hod_mt@college.edu']) {
    await prisma.department.update({
      where: { id: deptMap.MT },
      data: { hodUserId: userMap['hod_mt@college.edu'] },
    });
  }

  console.log('Master data and user seeding completed successfully!');
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
