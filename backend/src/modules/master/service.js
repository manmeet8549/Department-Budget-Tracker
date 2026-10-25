import { prisma } from '../../config/db.js';
import { AppError } from '../platform/errors.js';
import * as audit from '../audit/index.js';

// ==========================================
// Financial Years
// ==========================================

export async function createFinancialYear(data, userId) {
  const existing = await prisma.financialYear.findUnique({
    where: { year: data.year },
  });
  if (existing) {
    throw new AppError('DUPLICATE_FINANCIAL_YEAR', `Financial year ${data.year} already exists`, 409);
  }

  return prisma.$transaction(async (tx) => {
    if (data.isActive) {
      await tx.financialYear.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    const created = await tx.financialYear.create({
      data: {
        year: data.year,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        status: data.status ?? 'OPEN',
        isActive: Boolean(data.isActive),
      },
    });

    await audit.log(tx, {
      userId,
      action: 'FINANCIAL_YEAR_CREATE',
      table: 'financial_years',
      recordId: created.id,
      newValue: created,
    });

    return created;
  });
}

export async function listFinancialYears() {
  return prisma.financialYear.findMany({
    orderBy: { startDate: 'desc' },
  });
}

export async function getActiveFinancialYear() {
  return prisma.financialYear.findFirst({
    where: { isActive: true },
  });
}

export async function getFinancialYear(id) {
  const fyId = Number(id);
  const fy = await prisma.financialYear.findUnique({
    where: { id: fyId },
  });
  if (!fy) {
    throw new AppError('NOT_FOUND', `Financial year with id ${id} not found`, 404);
  }
  return fy;
}

export async function setActiveFinancialYear(id, userId) {
  const fyId = Number(id);
  const fy = await prisma.financialYear.findUnique({
    where: { id: fyId },
  });
  if (!fy) {
    throw new AppError('NOT_FOUND', `Financial year with id ${id} not found`, 404);
  }

  return prisma.$transaction(async (tx) => {
    // Set all others to false
    await tx.financialYear.updateMany({
      where: { id: { not: fyId } },
      data: { isActive: false },
    });

    const updated = await tx.financialYear.update({
      where: { id: fyId },
      data: { isActive: true },
    });

    await audit.log(tx, {
      userId,
      action: 'FINANCIAL_YEAR_ACTIVATE',
      table: 'financial_years',
      recordId: fyId,
      oldValue: { isActive: fy.isActive },
      newValue: { isActive: true },
    });

    return updated;
  });
}

export async function updateFinancialYear(id, data, userId) {
  const fyId = Number(id);
  const fy = await prisma.financialYear.findUnique({
    where: { id: fyId },
  });
  if (!fy) {
    throw new AppError('NOT_FOUND', `Financial year with id ${id} not found`, 404);
  }

  if (data.year && data.year !== fy.year) {
    const existing = await prisma.financialYear.findUnique({
      where: { year: data.year },
    });
    if (existing) {
      throw new AppError('DUPLICATE_FINANCIAL_YEAR', `Financial year ${data.year} already exists`, 409);
    }
  }

  return prisma.$transaction(async (tx) => {
    if (data.isActive) {
      await tx.financialYear.updateMany({
        where: { id: { not: fyId } },
        data: { isActive: false },
      });
    }

    const updateData = {};
    if (data.year !== undefined) updateData.year = data.year;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
    if (data.status !== undefined) updateData.status = data.status;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await tx.financialYear.update({
      where: { id: fyId },
      data: updateData,
    });

    await audit.log(tx, {
      userId,
      action: 'FINANCIAL_YEAR_UPDATE',
      table: 'financial_years',
      recordId: fyId,
      oldValue: fy,
      newValue: updated,
    });

    return updated;
  });
}

// ==========================================
// Departments
// ==========================================

export async function createDepartment(data, userId) {
  const existing = await prisma.department.findUnique({
    where: { code: data.code },
  });
  if (existing) {
    throw new AppError('DUPLICATE_DEPARTMENT_CODE', `Department code ${data.code} already exists`, 409);
  }

  return prisma.$transaction(async (tx) => {
    const created = await tx.department.create({
      data: {
        code: data.code,
        name: data.name,
        parentId: data.parentId ? Number(data.parentId) : null,
        hodUserId: data.hodUserId ? Number(data.hodUserId) : null,
        isActive: true,
      },
      include: {
        parent: true,
        hodUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await audit.log(tx, {
      userId,
      action: 'DEPARTMENT_CREATE',
      table: 'departments',
      recordId: created.id,
      newValue: created,
    });

    return created;
  });
}

export async function listDepartments({ includeInactive = false } = {}) {
  return prisma.department.findMany({
    where: includeInactive ? {} : { isActive: true },
    include: {
      parent: true,
      subUnits: true,
      hodUser: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { code: 'asc' },
  });
}

export async function getDepartment(id) {
  const dept = await prisma.department.findUnique({
    where: { id: Number(id) },
    include: {
      parent: true,
      subUnits: true,
      hodUser: {
        select: { id: true, name: true, email: true },
      },
    },
  });
  if (!dept) {
    throw new AppError('NOT_FOUND', `Department with id ${id} not found`, 404);
  }
  return dept;
}

export async function updateDepartment(id, data, userId) {
  const deptId = Number(id);
  const dept = await prisma.department.findUnique({
    where: { id: deptId },
  });
  if (!dept) {
    throw new AppError('NOT_FOUND', `Department with id ${id} not found`, 404);
  }

  if (data.code && data.code !== dept.code) {
    const existing = await prisma.department.findUnique({
      where: { code: data.code },
    });
    if (existing) {
      throw new AppError('DUPLICATE_DEPARTMENT_CODE', `Department code ${data.code} already exists`, 409);
    }
  }

  return prisma.$transaction(async (tx) => {
    const updateData = {};
    if (data.code !== undefined) updateData.code = data.code;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.parentId !== undefined) updateData.parentId = data.parentId ? Number(data.parentId) : null;
    if (data.hodUserId !== undefined) updateData.hodUserId = data.hodUserId ? Number(data.hodUserId) : null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await tx.department.update({
      where: { id: deptId },
      data: updateData,
      include: {
        parent: true,
        subUnits: true,
        hodUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await audit.log(tx, {
      userId,
      action: 'DEPARTMENT_UPDATE',
      table: 'departments',
      recordId: deptId,
      oldValue: dept,
      newValue: updated,
    });

    return updated;
  });
}

export async function deleteDepartment(id, userId) {
  const deptId = Number(id);
  const dept = await prisma.department.findUnique({
    where: { id: deptId },
  });
  if (!dept) {
    throw new AppError('NOT_FOUND', `Department with id ${id} not found`, 404);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.department.update({
      where: { id: deptId },
      data: { isActive: false },
    });

    await audit.log(tx, {
      userId,
      action: 'DEPARTMENT_DELETE',
      table: 'departments',
      recordId: deptId,
      oldValue: { isActive: dept.isActive },
      newValue: { isActive: false },
    });

    return updated;
  });
}

// ==========================================
// Categories
// ==========================================

export async function createCategory(data, userId) {
  const existing = await prisma.category.findUnique({
    where: { name: data.name },
  });
  if (existing) {
    throw new AppError('DUPLICATE_CATEGORY_NAME', `Category ${data.name} already exists`, 409);
  }

  return prisma.$transaction(async (tx) => {
    const created = await tx.category.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        isActive: true,
      },
    });

    await audit.log(tx, {
      userId,
      action: 'CATEGORY_CREATE',
      table: 'categories',
      recordId: created.id,
      newValue: created,
    });

    return created;
  });
}

export async function listCategories({ includeInactive = false } = {}) {
  return prisma.category.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { name: 'asc' },
  });
}

export async function getCategory(id) {
  const cat = await prisma.category.findUnique({
    where: { id: Number(id) },
  });
  if (!cat) {
    throw new AppError('NOT_FOUND', `Category with id ${id} not found`, 404);
  }
  return cat;
}

export async function updateCategory(id, data, userId) {
  const catId = Number(id);
  const cat = await prisma.category.findUnique({
    where: { id: catId },
  });
  if (!cat) {
    throw new AppError('NOT_FOUND', `Category with id ${id} not found`, 404);
  }

  if (data.name && data.name !== cat.name) {
    const existing = await prisma.category.findUnique({
      where: { name: data.name },
    });
    if (existing) {
      throw new AppError('DUPLICATE_CATEGORY_NAME', `Category ${data.name} already exists`, 409);
    }
  }

  return prisma.$transaction(async (tx) => {
    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updated = await tx.category.update({
      where: { id: catId },
      data: updateData,
    });

    await audit.log(tx, {
      userId,
      action: 'CATEGORY_UPDATE',
      table: 'categories',
      recordId: catId,
      oldValue: cat,
      newValue: updated,
    });

    return updated;
  });
}

export async function deleteCategory(id, userId) {
  const catId = Number(id);
  const cat = await prisma.category.findUnique({
    where: { id: catId },
  });
  if (!cat) {
    throw new AppError('NOT_FOUND', `Category with id ${id} not found`, 404);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.category.update({
      where: { id: catId },
      data: { isActive: false },
    });

    await audit.log(tx, {
      userId,
      action: 'CATEGORY_DELETE',
      table: 'categories',
      recordId: catId,
      oldValue: { isActive: cat.isActive },
      newValue: { isActive: false },
    });

    return updated;
  });
}
