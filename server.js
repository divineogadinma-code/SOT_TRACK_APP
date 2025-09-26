// 1. Import Packages
const express = require('express');
const mongoose = require('mongoose');
const http = require('http'); // ADDED: Node's built-in HTTP server
const { WebSocketServer } = require('ws'); // ADDED: The WebSocket library
const Worker = require('./models/Worker');
const Task = require('./models/Task'); // Import our new Task model
const AssignedTask = require('./models/AssignedTask');
const Rule = require('./models/Rule');
const PointSetting = require('./models/PointSetting');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Message = require('./models/Message');
const JWT_SECRET = 'your-super-secret-key-that-is-long-and-random';

// 2. Setup Express App
const app = express();
const PORT = 3088;
app.use(express.json({ limit: '10mb' })); // Increased limit for profile pictures
app.use(express.static('public'));

// Create an HTTP server from the Express app
const server = http.createServer(app);

// --- 3. Setup WebSocket Server ---
const wss = new WebSocketServer({ server });

// This function will send a message to all connected clients
const broadcast = (data) => {
    wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};

wss.on('connection', (ws) => {
    console.log('✅ Client connected to WebSocket');
    ws.on('close', () => console.log('❌ Client disconnected'));
});


// 3. Database Connection
const mongoURI = "mongodb+srv://divineogadinma2023:IIDhG4uQCqNiBQLN@cluster0.og77s.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('✅ MongoDB connected successfully!'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

    // MIDDLEWARE to verify JWT Token
const authMiddleware = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Expecting "Bearer TOKEN"

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Add user info (id, role) to the request object
        next(); // Proceed to the next function
    } catch (error) {
        res.status(400).json({ message: 'Invalid token.' });
    }
};

// Middleware to check if the user is an admin
const adminMiddleware = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admins only.' });
    }
    next();
};                                    

/*
=============================================
   API ROUTES
=============================================

*/

// POST: Admin resets all worker points to zero
app.post('/api/workers/reset-all-points', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        // Step 1: Update all documents where the role is 'worker'
        // and set their 'points' field to 0.
        await Worker.updateMany(
            { role: 'worker' }, 
            { $set: { points: 0 } }
        );

        // Step 2: Delete all documents from the 'Task' collection.
        // This will clear the history used for rating calculations.
        await Task.deleteMany({});

        // Broadcast an update to all clients so their views refresh
        broadcast({ type: 'UPDATE_LEADERBOARD' });
        broadcast({ type: 'UPDATE_TASKS' }); // Also notify dashboards to update

        res.json({ message: 'All worker points and task histories have been reset.' });

    } catch (error) {
        console.error("Error resetting points:", error);
        res.status(500).json({ message: 'Server error while resetting points.' });
    }
});

// --- POINT SYSTEM & BONUS API ROUTES ---

// GET: Fetch the current point system settings
app.get('/api/point-settings', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        // Find the settings document, or create it if it doesn't exist
        let settings = await PointSetting.findOne({ key: 'main_settings' });
        if (!settings) {
            settings = new PointSetting();
            await settings.save();
        }
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching point settings.' });
    }
});

// PUT: Update the point system settings
app.put('/api/point-settings', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const updatedSettings = await PointSetting.findOneAndUpdate(
            { key: 'main_settings' },
            req.body,
            { new: true, upsert: true } // 'upsert' creates the document if it doesn't exist
        );
        res.json({ message: 'Settings updated successfully.', settings: updatedSettings });
    } catch (error) {
        res.status(500).json({ message: 'Error updating settings.' });
    }
});

// POST: Award a bonus to a worker
app.post('/api/bonuses', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { workerId, bonusType, points } = req.body;
        if (!workerId || !bonusType || !points) {
            return res.status(400).json({ message: 'Worker, bonus type, and points are required.' });
        }

        // 1. Create a new Task record for the bonus
        const bonusTask = new Task({
            workerId,
            taskName: `Bonus: ${bonusType}`,
            points
        });
        await bonusTask.save();

        // 2. Update the worker's total points
        await Worker.findByIdAndUpdate(workerId, { $inc: { points } });

        // 3. Broadcast updates
        broadcast({ type: 'UPDATE_TASKS', workerId });
        broadcast({ type: 'UPDATE_LEADERBOARD' });

        res.json({ message: `${bonusType} bonus awarded successfully!` });
    } catch (error) {
        res.status(500).json({ message: 'Error awarding bonus.' });
    }
});

// GET: A worker's monthly point summary
app.get('/api/monthly-summary/:workerId', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { workerId } = req.params;
        const { month, year } = req.query; // e.g., month=7 (for August), year=2025

        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, parseInt(month) + 1, 1);

        // Find all tasks for the worker within the specified month
        const tasks = await Task.find({
            workerId,
            timestamp: { $gte: startDate, $lt: endDate }
        });

        const totalPoints = tasks.reduce((sum, task) => sum + task.points, 0);
        
        const settings = await PointSetting.findOne({ key: 'main_settings' });
        const monetaryValue = totalPoints * (settings ? settings.conversionRate : 7);

        res.json({
            workerId,
            month: startDate.toLocaleString('default', { month: 'long' }),
            year,
            totalPoints,
            monetaryValue: monetaryValue.toFixed(2) // Format to 2 decimal places
        });

    } catch (error) {
        res.status(500).json({ message: 'Error fetching monthly summary.' });
    }
});


app.post('/api/workers/:id/deduct-points', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { reason, points } = req.body;
        const workerId = req.params.id;

        if (!reason || !points || points <= 0) {
            return res.status(400).json({ message: 'A reason and a positive point value are required.' });
        }

        const pointsToDeduct = -Math.abs(points); // Ensure the points are negative

        // 1. Create a new "Task" record for the penalty
        const penaltyTask = new Task({
            workerId: workerId,
            taskName: `Penalty: ${reason}`,
            points: pointsToDeduct
        });
        await penaltyTask.save();

        // 2. Update the worker's total points
        await Worker.findByIdAndUpdate(workerId, { $inc: { points: pointsToDeduct } });

        // 3. Broadcast updates to everyone
        broadcast({ type: 'UPDATE_TASKS', workerId: workerId });
        broadcast({ type: 'UPDATE_LEADERBOARD' });

        res.json({ message: 'Penalty applied successfully.' });

    } catch (error) {
        console.error("Error applying penalty:", error);
        res.status(500).json({ message: 'Error applying penalty.' });
    }
});


app.get('/api/admin/stats', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        // Use an aggregation pipeline to calculate both stats in one efficient query
        const stats = await Worker.aggregate([
            {
                // Filter out the admin account from the calculation
                $match: { role: { $ne: 'admin' } }
            },
            {
                $group: {
                    _id: null, // Group all remaining documents together
                    totalWorkers: { $sum: 1 }, // Count each worker
                    totalPoints: { $sum: '$points' } // Sum the 'points' field
                }
            }
        ]);

        if (stats.length > 0) {
            res.json(stats[0]); // Return the first (and only) result
        } else {
            // Handle case where there are no workers yet
            res.json({ totalWorkers: 0, totalPoints: 0 });
        }
    } catch (error) {
        console.error("Error fetching admin stats:", error);
        res.status(500).json({ message: 'Error fetching admin stats.' });
    }
});

// GET: A specific worker's performance rating
app.get('/api/workers/:id/rating', authMiddleware, async (req, res) => {
    try {
        const workerId = req.params.id;

        // Get all completed tasks for this worker from the 'Task' collection
        const tasks = await Task.find({ workerId: workerId });

        let positivePoints = 0;
        let negativePoints = 0;

        tasks.forEach(task => {
            if (task.points > 0) {
                positivePoints += task.points;
            } else {
                negativePoints += Math.abs(task.points); // Use absolute value for penalties
            }
        });

        let rating = 5.0; // Default to a perfect rating

        if (positivePoints + negativePoints > 0) {
            // Calculate the ratio of positive points to total points transacted
            const ratio = positivePoints / (positivePoints + negativePoints);
            // Scale the rating from a base of 1.0 up to 5.0
            rating = (ratio * 4.0) + 1.0;
        }

        // Handle edge case where a worker only has penalties
        if (positivePoints === 0 && negativePoints > 0) {
            rating = 1.0;
        }

        // Return the rating rounded to two decimal places
        res.json({ rating: parseFloat(rating.toFixed(2)) });

    } catch (error) {
        console.error("Error calculating rating:", error);
        res.status(500).json({ message: 'Error calculating rating.' });
    }
});


// GET: Fetch all rules (for everyone)
app.get('/api/rules', authMiddleware, async (req, res) => {
    try {
        const rules = await Rule.find({}).sort({ order: 1 }); // Sort by order
        res.json(rules);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching rules.' });
    }
});

// POST: Admin creates a new rule
app.post('/api/rules', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { title, content } = req.body;
        if (!title || !content) {
            return res.status(400).json({ message: 'Title and content are required.' });
        }
        const newRule = new Rule({ title, content });
        await newRule.save();
        res.status(201).json({ message: 'Rule created successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error creating rule.' });
    }
});

// PUT: Admin updates a rule
app.put('/api/rules/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { title, content } = req.body;
        const updatedRule = await Rule.findByIdAndUpdate(
            req.params.id,
            { title, content },
            { new: true }
        );
        if (!updatedRule) return res.status(404).json({ message: 'Rule not found.' });
        res.json({ message: 'Rule updated successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating rule.' });
    }
});

// DELETE: Admin deletes a rule
app.delete('/api/rules/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const deletedRule = await Rule.findByIdAndDelete(req.params.id);
        if (!deletedRule) return res.status(404).json({ message: 'Rule not found.' });
        res.json({ message: 'Rule deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting rule.' });
    }
});

// POST: Admin assigns a new task to a worker
    // In server.js
// In server.js, replace the existing 'assign-task' route

// POST: Admin assigns a new task to a worker OR all workers
app.post('/api/assigned-tasks', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { workerId, taskDescription, points, deadline } = req.body;
        if (!workerId || !taskDescription || !points || !deadline) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        const adminId = req.user.id;

        // THIS IS THE NEW LOGIC
        if (workerId === 'all') {
            // If 'all' is selected, find all non-admin workers
            const workers = await Worker.find({ role: 'worker' });
            
            // Create a task for each worker
            const taskPromises = workers.map(worker => {
                const newAssignedTask = new AssignedTask({
                    adminId,
                    workerId: worker._id,
                    taskDescription,
                    points,
                    deadline
                });
                return newAssignedTask.save();
            });

            await Promise.all(taskPromises);
            
            // Broadcast a general new task event
            broadcast({ type: 'NEW_TASK' });
            res.status(201).json({ message: 'Task assigned to all workers successfully.' });

        } else {
            // Original logic for assigning to a single worker
            const newAssignedTask = new AssignedTask({
                adminId,
                workerId,
                taskDescription,
                points,
                deadline
            });
            await newAssignedTask.save();
            
            // Broadcast a specific new task event
            broadcast({ type: 'NEW_TASK', workerId: workerId });
            res.status(201).json({ message: 'Task assigned successfully.' });
        }
    } catch (error) {
        console.error("Error assigning task:", error);
        res.status(500).json({ message: 'Error assigning task.' });
    }
});


    // GET: Worker fetches their assigned tasks
    app.get('/api/assigned-tasks', authMiddleware, async (req, res) => {
        try {
            const tasks = await AssignedTask.find({ workerId: req.user.id, status: 'pending' })
                .sort({ assignedDate: -1 });
            res.json(tasks);
        } catch (error) {
            console.error("Error fetching assigned tasks:", error);
            res.status(500).json({ message: 'Error fetching assigned tasks.' });
        }
    });

    // PUT: Worker marks an assigned task as complete
    // PUT: Worker submits a task for review
// In server.js
// PUT: Worker submits a task for review
app.put('/api/assigned-tasks/:id/submit', authMiddleware, async (req, res) => {
    try {
        const task = await AssignedTask.findOneAndUpdate(
            { _id: req.params.id, workerId: req.user.id },
            // Set status to review AND record the submission time
            { status: 'review', submittedDate: new Date() },
            { new: true }
        );
        if (!task) return res.status(404).json({ message: 'Task not found.' });

        broadcast({ type: 'TASK_SUBMITTED' });
        res.json({ message: 'Task submitted for review.' });
    } catch (error) {
        res.status(500).json({ message: 'Error submitting task.' });
    }
});

// GET: Admin fetches all tasks that are pending review
app.get('/api/assigned-tasks/review', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const tasks = await AssignedTask.find({ status: 'review' })
            .populate('workerId', 'name') // Get the worker's name
            .sort({ assignedDate: 1 });
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching tasks for review.' });
    }
});

// POST: Admin approves a completed task
// In server.js
// POST: Admin approves a completed task
app.post('/api/assigned-tasks/:id/approve', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const task = await AssignedTask.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found.' });

        const now = new Date();
        let pointsToAward = task.points;
        let message = 'Task approved and points awarded!';

        // THIS IS THE NEW LOGIC
        if (now > task.deadline) {
            // Deadline has passed
            const penalty = Math.round(task.points / 2);
            pointsToAward = -penalty; // Apply penalty instead of awarding points
            message = `Task was submitted past the deadline. A penalty of ${penalty} points has been applied.`;
        }

        // 1. Update task status to completed
        task.status = 'completed';
        task.completedDate = now;
        await task.save();

        // 2. Create the permanent record in the 'Task' history
        const completedTask = new Task({
            workerId: task.workerId,
            taskName: `${task.taskDescription} ${now > task.deadline ? '(Late)' : ''}`,
            points: pointsToAward // Log the actual points awarded/deducted
        });
        await completedTask.save();

        // 3. Update the worker's total points
        await Worker.findByIdAndUpdate(task.workerId, { $inc: { points: pointsToAward } });

        // 4. Broadcast updates to everyone
        broadcast({ type: 'UPDATE_TASKS', workerId: task.workerId.toString() });
        broadcast({ type: 'UPDATE_LEADERBOARD' });
        res.json({ message: message }); // Send the dynamic message back
    } catch (error) {
        res.status(500).json({ message: 'Error approving task.' });
    }
});

// POST: Admin rejects a completed task
app.post('/api/assigned-tasks/:id/reject', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const task = await AssignedTask.findByIdAndUpdate(
            req.params.id,
            { status: 'pending' }, // Set status back to pending
            { new: true }
        );
        if (!task) return res.status(404).json({ message: 'Task not found.' });

        // Notify the specific worker that their task was rejected
        broadcast({ type: 'TASK_REJECTED', workerId: task.workerId.toString() });
        res.json({ message: 'Task rejected and returned to worker.' });
    } catch (error) {
        res.status(500).json({ message: 'Error rejecting task.' });
    }
});
// GET: The number of tasks pending review for the admin badge
app.get('/api/assigned-tasks/review/count', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const reviewCount = await AssignedTask.countDocuments({ status: 'review' });
        res.json({ count: reviewCount });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching review count.' });
    }
});

    
// GET: Aggregated task data for advanced reporting
app.get('/api/reports/task-summary', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const taskSummary = await Task.aggregate([
            {
                $group: {
                    _id: '$taskName', // Group documents by the taskName field
                    count: { $sum: 1 }, // Count how many times each task appears
                    totalPoints: { $sum: '$points' } // Sum the points for each task
                }
            },
            {
                $sort: { count: -1 } // Sort by the most frequent tasks
            }
        ]);
        res.json(taskSummary);
    } catch (error) {
        console.error('Error fetching task summary report:', error);
        res.status(500).json({ message: 'Server error while generating report.' });
    }
});

// POST: Admin sends a new message
app.post('/api/messages', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { recipientId, content } = req.body;
        const senderId = req.user.id; // Admin's ID from token

        if (!recipientId || !content) {
            return res.status(400).json({ message: 'Recipient and content are required.' });
        }

        const newMessage = new Message({
            senderId,
            recipientId,
            content
        });

        await newMessage.save();
        // ADDED: Broadcast a message update
        broadcast({ type: 'UPDATE_MESSAGES' });
        res.status(201).json({ message: 'Message sent successfully.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while sending message.' });
    }
});

// In server.js

// GET: Worker fetches their messages (now filters deleted messages)
app.get('/api/messages', authMiddleware, async (req, res) => {
    try {
        const workerId = req.user.id;
        const messages = await Message.find({
            $or: [{ recipientId: workerId }, { recipientId: 'all' }],
            deletedBy: { $ne: workerId } // Where user's ID is NOT in the deletedBy array
        }).sort({ timestamp: -1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: 'Server error while fetching messages.' });
    }
});
// GET: The number of unread messages for the logged-in user
app.get('/api/messages/unread-count', authMiddleware, async (req, res) => {
    try {
        const workerId = req.user.id;
        const unreadCount = await Message.countDocuments({
            $or: [{ recipientId: workerId }, { recipientId: 'all' }],
            readBy: { $ne: workerId }, // Where user's ID is NOT in the readBy array
            deletedBy: { $ne: workerId } // And not deleted by the user
        });
        res.json({ count: unreadCount });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching unread count.' });
    }
});

// POST: Mark messages as read for the logged-in user
app.post('/api/messages/mark-read', authMiddleware, async (req, res) => {
    try {
        const workerId = req.user.id;
        await Message.updateMany(
            { 
                $or: [{ recipientId: workerId }, { recipientId: 'all' }],
                readBy: { $ne: workerId } 
            },
            { $addToSet: { readBy: workerId } } // Add user's ID to the readBy array
        );
        res.json({ message: 'Messages marked as read.' });
    } catch (error) {
        res.status(500).json({ message: 'Error marking messages as read.' });
    }
});

// DELETE: A user "deletes" a message from their view
app.delete('/api/messages/:id', authMiddleware, async (req, res) => {
    try {
        const workerId = req.user.id;
        const messageId = req.params.id;
        await Message.updateOne(
            { _id: messageId },
            { $addToSet: { deletedBy: workerId } } // Add user's ID to the deletedBy array
        );
        res.json({ message: 'Message deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting message.' });
    }
});
// GET: Fetch all workers sorted by points for the leaderboard - SECURED
app.get('/api/leaderboard', authMiddleware, async (req, res) => {
    try {
        // Find all workers, sort by points descending (-1), and select only needed fields
        const leaderboard = await Worker.find({}, 'name points').sort({ points: -1 });
        res.json(leaderboard);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching leaderboard data' });
    }
});
// PUT: Change a user's password
app.put('/api/users/change-password', authMiddleware, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user.id; // Get user ID from the token

        if (!oldPassword || !newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
        }

        const worker = await Worker.findById(userId);
        if (!worker) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const isMatch = await bcrypt.compare(oldPassword, worker.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Incorrect old password.' });
        }

        const salt = await bcrypt.genSalt(10);
        worker.password = await bcrypt.hash(newPassword, salt);
        await worker.save();

        res.json({ message: 'Password changed successfully.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while changing password.' });
    }
});
// PUT: Update a user's profile picture
app.put('/api/users/profile-picture', authMiddleware, async (req, res) => {
    try {
        const { imageData } = req.body;
        const userId = req.user.id;

        if (!imageData) {
            return res.status(400).json({ message: 'No image data provided.' });
        }

        const updatedWorker = await Worker.findByIdAndUpdate(
            userId,
            { profilePicture: imageData },
            { new: true }
        );

        if (!updatedWorker) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.json({ message: 'Profile picture updated successfully.', profilePicture: updatedWorker.profilePicture });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error while updating picture.' });
    }
});

// POST: Register a new user
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, username, password, role } = req.body;

        // Security Check: Prevent public admin registration
        if (role && role === 'admin') {
            return res.status(403).json({ message: "Admin registration is not allowed." });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newWorker = new Worker({
            name,
            username,
            password: hashedPassword,
            role: 'worker' // Force role to worker
        });

        const savedWorker = await newWorker.save();
        res.status(201).json({ message: 'User registered successfully', userId: savedWorker._id });

    } catch (error) {
        if (error.code === 11000) { // Handle duplicate username error
            return res.status(400).json({ message: 'Username already exists.' });
        }
        console.error(error);
        res.status(500).json({ message: 'Error registering user' });
    }
});

// POST: Login a user
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const worker = await Worker.findOne({ username });
        if (!worker) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, worker.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const token = jwt.sign({ id: worker._id, role: worker.role }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, role: worker.role, userId: worker._id });

    } catch (error) {
        res.status(500).json({ message: 'Error logging in' });
    }
});

// GET: Fetch all workers (for the admin panel)
app.get('/api/workers',authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const workers = await Worker.find();
        res.json(workers);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching workers' });
    }
});
// ADD THIS ENTIRE BLOCK
// GET: Fetch a SINGLE worker by their ID
app.get('/api/workers/:id', authMiddleware,async (req, res) => {
    try {
        const worker = await Worker.findById(req.params.id);
        if (!worker) {
            return res.status(404).json({ message: 'Worker not found' });
        }
        res.json(worker);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching worker' });
    }
});
// PUT: Update a worker's details
app.put('/api/workers/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { name, username } = req.body;
        const workerId = req.params.id;

        // Prepare the updates, ensuring we don't save empty fields
        const updates = {};
        if (name) updates.name = name;
        if (username) updates.username = username;

        const updatedWorker = await Worker.findByIdAndUpdate(
            workerId,
            updates,
            { new: true } // This option returns the updated document
        );

        if (!updatedWorker) {
            return res.status(404).json({ message: 'Worker not found' });
        }

        res.json(updatedWorker);

    } catch (error) {
        // Handle potential duplicate username error
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Username already exists.' });
        }
        console.error(error);
        res.status(500).json({ message: 'Error updating worker' });
    }
});
// DELETE: Remove a worker and all their tasks
app.delete('/api/workers/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const workerId = req.params.id;

        // Find and delete the worker document
        const deletedWorker = await Worker.findByIdAndDelete(workerId);

        if (!deletedWorker) {
            return res.status(404).json({ message: 'Worker not found' });
        }

        // Also delete all tasks associated with this worker to keep the database clean
        await Task.deleteMany({ workerId: workerId });

        res.json({ message: 'Worker and all associated tasks deleted successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting worker' });
    }
});
// GET: All raw task data for CSV export - CORRECTED to be more robust
app.get('/api/tasks/all', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const allTasks = await Task.find({})
            .sort({ timestamp: -1 })
            .populate('workerId', 'name'); // Fetches worker's name if they exist

        res.json(allTasks);
    } catch (error) {
        console.error('Error fetching all tasks for export:', error);
        res.status(500).json({ message: 'Server error while fetching tasks for export.' });
    }
});

// GET: Fetch task history for a specific worker (for worker portal)
app.get('/api/tasks/:workerId', async (req, res) => {
    try {
        const tasks = await Task.find({ workerId: req.params.workerId }).sort({ timestamp: -1 }); // Get newest first
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching tasks' });
    }
});

// POST: Log a new task for a worker (the new core function)
app.post('/api/tasks',authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { workerId, taskName, points } = req.body;

        // 1. Create and save the new task record
        const newTask = new Task({
            workerId,
            taskName,
            points
        });
        await newTask.save();

        // 2. Find the worker and add the points to their total
        const updatedWorker = await Worker.findByIdAndUpdate(
            workerId,
            { $inc: { points: points } },
            { new: true }
        );

        // ADDED: Broadcast an update to all clients
        broadcast({ type: 'UPDATE_TASKS' });
        broadcast({ type: 'UPDATE_LEADERBOARD' });  
        if (!updatedWorker) {
            return res.status(404).json({ message: 'Worker not found' });
        }


        // 3. Send back a success message
        res.status(201).json({ message: 'Task logged successfully', worker: updatedWorker });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error logging task' });
    }
});


// 4. Start the server
server.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});