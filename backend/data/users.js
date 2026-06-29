import bcrypt from 'bcryptjs'

const users = [
  {
    name: 'Admin User',
    email: 'admin@example.com',
    password: bcrypt.hashSync('123456', 10),
    isAdmin: true,
  },
  {
    name: 'Hai',
    email: 'hai@example.com',
    password: bcrypt.hashSync('123456', 10),
  },
  {
    name: 'Hai Ne',
    email: 'haine@example.com',
    password: bcrypt.hashSync('123456', 10),
  },
]

export default users
