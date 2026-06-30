const mongoose = require('mongoose');

const mongoUri = 'mongodb+srv://techhimtech_db_user:2FT3KKcYsCI3mjjw@cluster0.eg2xtli.mongodb.net/test';

async function run() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected.');
    
    const db = mongoose.connection.db;
    const users = await db.collection('users').find({}).toArray();
    console.log('Found', users.length, 'users:');
    users.forEach(u => {
      console.log(`- Email: ${u.email}, Name: ${u.firstName} ${u.lastName}, Role/Type: ${u.userType}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
