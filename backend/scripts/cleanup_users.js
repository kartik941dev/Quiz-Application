const mongoose = require('mongoose');
const User = require('../src/models/User');
require('dotenv').config({ path: '../.env' }); // Make sure to load env vars if needed

// Ensure you replace this with your actual MongoDB URI if not using .env
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/quizDB';

async function cleanupOldUsers() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB.');

    const users = await User.find({});
    console.log(`Found ${users.length} total users.`);

    let deletedCount = 0;

    for (const user of users) {
      // Check if passwordHash is clearly invalid or plaintext
      // bcrypt hashes are 60 chars and start with $2a$, $2b$, or $2y$
      const isHashed = user.passwordHash && user.passwordHash.startsWith('$2') && user.passwordHash.length === 60;
      
      if (!isHashed) {
        console.log(`Deleting invalid user: ${user.email} (Plaintext/Invalid Hash)`);
        await User.findByIdAndDelete(user._id);
        deletedCount++;
      }
    }

    console.log(`\nCleanup complete! Deleted ${deletedCount} invalid users.`);
    process.exit(0);
  } catch (err) {
    console.error('Error during cleanup:', err);
    process.exit(1);
  }
}

cleanupOldUsers();
