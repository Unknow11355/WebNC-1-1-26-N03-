import { AppError } from '../errors/app-error.js';

function parseId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0)
    throw new AppError(400, 'VALIDATION_ERROR', 'category_id không hợp lệ');
  return id;
}

function parseName(value) {
  const name = String(value ?? '').trim();
  if (name.length < 2 || name.length > 100)
    throw new AppError(400, 'VALIDATION_ERROR', 'Tên danh mục không hợp lệ');
  return name;
}

export function createCategoryService({ repository }) {
  if (!repository) throw new TypeError('Category service requires repository');
  return {
    list() {
      return repository.list();
    },
    async getById(rawId) {
      const categoryId = parseId(rawId);
      const category = await repository.findById(categoryId);
      if (!category) throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy danh mục');
      return category;
    },
    create(input) {
      return repository.create({ categoryName: parseName(input?.category_name) });
    },
    async update(rawId, input) {
      const categoryId = parseId(rawId);
      if (!(await repository.findById(categoryId)))
        throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy danh mục');
      return repository.update(categoryId, { categoryName: parseName(input?.category_name) });
    },
    async remove(rawId) {
      const categoryId = parseId(rawId);
      if (!(await repository.findById(categoryId)))
        throw new AppError(404, 'NOT_FOUND', 'Không tìm thấy danh mục');
      try {
        await repository.remove(categoryId);
      } catch (error) {
        if (error?.code === 'ER_ROW_IS_REFERENCED_2') {
          throw new AppError(409, 'CONFLICT', 'Danh mục đang được sản phẩm tham chiếu');
        }
        throw error;
      }
    },
  };
}
