const User = require('../../models/User');
const { hashPassword } = require('../../utils/password');

const normalizeFilters = (filters = {}) => {
  const page = Number.isInteger(filters.page) && filters.page > 0 ? filters.page : 1;
  const limit = Number.isInteger(filters.limit) && filters.limit > 0 ? filters.limit : 10;
  const skip = (page - 1) * limit;

  const query = {};

  if (filters.search) {
    const searchRegex = new RegExp(filters.search, 'i');
    query.$or = [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex },
    ];
  }

  if (filters.organizationId) query.organizationId = filters.organizationId;
  if (filters.userType || filters.role) query.userType = filters.userType || filters.role;
  if (filters.status) query.status = filters.status;

  return { query, page, limit, skip };
};

const createUser = async (payload = {}, actorId) => {
  const { firstName, lastName, email, password, userType, organizationId, status = 'ACTIVE' } = payload;
  const normalizedFirstName = firstName?.trim() || payload.name?.split(' ')[0]?.trim();
  const normalizedLastName = lastName?.trim() || payload.name?.split(' ').slice(1).join(' ').trim();

  if (!normalizedFirstName || !normalizedLastName || !email || !password) {
    throw new Error('First name, lastName, email, and password are required');
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new Error('User already exists');
  }

  const hashedPassword = await hashPassword(password);

  const user = await User.create({
    firstName: normalizedFirstName,
    lastName: normalizedLastName,
    email: email.toLowerCase(),
    passwordHash: hashedPassword,
    userType: userType || 'CITIZEN',
    organizationId,
    status,
    createdBy: actorId,
  });

  return user;
};

const getUsers = async (filters = {}) => {
  const { query, page, limit, skip } = normalizeFilters(filters);

  const [users, totalCount] = await Promise.all([
    User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-passwordHash')
      .lean(),
    User.countDocuments(query),
  ]);

  return {
    users,
    pagination: {
      total: totalCount,
      page,
      limit,
      pages: Math.ceil(totalCount / limit),
    },
  };
};

const getUserById = async (userId) => {
  const user = await User.findById(userId).select('-passwordHash').lean();
  if (!user) {
    throw new Error('User not found');
  }
  return user;
};

const updateUser = async (userId, updateData = {}, actorId) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { ...updateData, updatedBy: actorId },
    { new: true, runValidators: true }
  ).select('-passwordHash');

  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

const deleteUser = async (userId, actorId) => {
  const user = await User.findByIdAndUpdate(
    userId,
    { status: 'DELETED', updatedBy: actorId },
    { new: true, runValidators: true }
  ).select('-passwordHash');

  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

const hardDeleteUser = async (userId, actorId) => {
  const user = await User.findByIdAndDelete(userId);
  if (!user) {
    throw new Error('User not found');
  }

  return { message: 'User permanently deleted', deletedBy: actorId };
};

const getUserStats = async () => {
  const [totalUsers, activeUsers, suspendedUsers] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ status: 'ACTIVE' }),
    User.countDocuments({ status: 'SUSPENDED' }),
  ]);

  return { totalUsers, activeUsers, suspendedUsers };
};

const searchUsers = async (query, options = {}) => {
  const searchRegex = new RegExp(query, 'i');
  const limit = options.limit || 20;

  return User.find({
    $or: [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex },
    ],
    ...(options.organizationId ? { organizationId: options.organizationId } : {}),
    ...(options.role ? { userType: options.role } : {}),
  })
    .limit(limit)
    .select('-passwordHash')
    .lean();
};

const bulkUpdateUsers = async (userIds = [], updateData = {}, actorId) => {
  const result = await User.updateMany(
    { _id: { $in: userIds } },
    { ...updateData, updatedBy: actorId }
  );

  return { message: 'Users updated successfully', modifiedCount: result.modifiedCount };
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  hardDeleteUser,
  getUserStats,
  searchUsers,
  bulkUpdateUsers,
};
