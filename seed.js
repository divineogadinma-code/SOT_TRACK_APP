const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Worker = require('./models/Worker');

const mongoURI = "mongodb+srv://divineogadinma2023:IIDhG4uQCqNiBQLN@cluster0.og77s.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const createAdmin = async () => {
    console.log('Connecting to database...');
    try {
        await mongoose.connect(mongoURI);
        console.log('✅ Database connected.');

        const adminUsername = 'admin'; // Choose your admin username

        // Check if admin already exists
        const existingAdmin = await Worker.findOne({ username: adminUsername });
        if (existingAdmin) {
            console.log('👍 Admin user already exists.');
            return;
        }

        // Create admin if it doesn't exist
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('DSOFARM20241978', salt); // CHOOSE a strong password

        const adminUser = new Worker({
            name: "Farm Administrator",
            username: adminUsername,
            password: hashedPassword,
            role: 'admin'
        });

        await adminUser.save();
        console.log('🎉 Admin user created successfully!');

    } catch (error) {
        console.error('❌ Error creating admin:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Database disconnected.');
    }
};

createAdmin();
