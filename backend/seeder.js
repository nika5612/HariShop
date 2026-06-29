import mongoose from 'mongoose'
import dotenv from 'dotenv'
import colors from 'colors'
import users from './data/users.js'
import products from './data/products.js'
import User from './models/userModel.js'
import Product from './models/productModel.js'
import Order from './models/orderModel.js'
import Settings from './models/settingsModel.js'
import connectDB from './config/db.js'

dotenv.config({ path: '.env' })

connectDB()

const importData = async () => {
  try {
    await Order.deleteMany()
    await Product.deleteMany()
    await User.deleteMany()
    await Settings.deleteMany()

    const createdUsers = await User.insertMany(users)

    const adminUser = createdUsers[0]._id

    const sampleProducts = products.map((product) => {
      return { ...product, user: adminUser }
    })

    await Product.insertMany(sampleProducts)

    // Seed default warehouse for shipping
    await Settings.findOneAndUpdate(
      { key: 'warehouse' },
      { 
        key: 'warehouse',
        warehouseAddress: {
          fullName: 'HariShop Admin',
          phone: '0339959893',
          province: 'Tây Ninh',
          provinceCode: '72',
          district: 'Thành phố Tây Ninh',
          districtCode: '684',
          ward: 'Tân Lân',
          wardCode: '1731',
          detail: '56 ấp nhà thờ, xã Tân Lân',
        }
      },
      { upsert: true, new: true }
    )

    console.log('Data Imported! Including default warehouse.'.green.inverse)
    process.exit()
  } catch (error) {
    console.error(`${error}`.red.inverse)
    process.exit(1)
  }
}

const destroyData = async () => {
  try {
    await Order.deleteMany()
    await Product.deleteMany()
    await User.deleteMany()
    await Settings.deleteMany()

    console.log('Data Destroyed!'.red.inverse)
    process.exit()
  } catch (error) {
    console.error(`${error}`.red.inverse)
    process.exit(1)
  }
}

if (process.argv[2] === '-d') {
  destroyData()
} else {
  importData()
}
