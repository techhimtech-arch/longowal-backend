jest.mock('../src/models/User', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  updateMany: jest.fn(),
}));

jest.mock('../src/utils/password', () => ({
  hashPassword: jest.fn().mockResolvedValue('hashed-password'),
}));

const User = require('../src/models/User');
const { hashPassword } = require('../src/utils/password');
const usersService = require('../src/modules/users/users.service');

describe('users service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exposes getUsers for the users controller', () => {
    expect(typeof usersService.getUsers).toBe('function');
  });

  it('supports creating a user from a single name field', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({ _id: 'user-1', email: 'test@example.com' });

    await usersService.createUser({
      name: 'John Doe',
      email: 'test@example.com',
      password: 'Pass1234!',
      userType: 'CITIZEN',
    });

    expect(hashPassword).toHaveBeenCalledWith('Pass1234!');
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
      firstName: 'John',
      lastName: 'Doe',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
    }));
  });
});
