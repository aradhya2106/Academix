// backend/index.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

require('./db'); // DB connection

const PORT = process.env.PORT || 5000;

// ─────────────────────────────────────────
// 1. CORS setup
// ─────────────────────────────────────────
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];

const corsOptions = {
  origin(origin, cb) {
    console.log('🌐 Incoming Origin:', origin || '[postman/curl]');
    const isLocalhost = !!origin && /^https?:\/\/localhost:\d+$/.test(origin);
    if (!origin || allowedOrigins.includes(origin) || isLocalhost) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: 'Content-Type,Authorization',
  optionsSuccessStatus: 204
};

// ─────────────────────────────────────────
// 2. Express setup
// ─────────────────────────────────────────
const app = express();

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(bodyParser.json());
app.use(cookieParser(process.env.COOKIE_SECRET || 'secret-key'));

// Uploads directory
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// ─────────────────────────────────────────
// 3. Import models and middlewares
// ─────────────────────────────────────────
const Assignment = require('./models/assignmentModel');
const Classroom = require('./models/classroomModel');
const Submission = require('./models/submissionModel');
const User = require('./models/userModel');
const authTokenHandler = require('./middlewares/checkAuthToken');
const responseFunction = require('./utils/responseFunction');

// ─────────────────────────────────────────
// 4. Mount other routes
// ─────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const classroomRoutes = require('./routes/classroomRoutes');

app.use('/auth', authRoutes);
app.use('/class', classroomRoutes);

// ─────────────────────────────────────────
// 5. Submission routes (must come before assignment routes to avoid conflicts)
// ─────────────────────────────────────────

// Check if student has submitted an assignment
app.get('/class/assignments/:assignmentId/submission-status', authTokenHandler, async (req, res) => {
  try {
    console.log('📋 Submission status endpoint hit:', req.params.assignmentId);
    const { assignmentId } = req.params;
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      console.log('❌ Assignment not found:', assignmentId);
      return responseFunction(res, 404, 'Assignment not found', null, false);
    }

    const submission = await Submission.findOne({ 
      assignmentId: assignment._id, 
      studentId: req.userId 
    });

    console.log('📋 Submission found:', !!submission);

    if (submission) {
      return responseFunction(res, 200, 'Submission found', {
        submitted: true,
        submittedAt: submission.submittedAt,
        grade: submission.grade,
        feedback: submission.feedback,
        files: submission.files
      }, true);
    } else {
      return responseFunction(res, 200, 'No submission found', {
        submitted: false
      }, true);
    }
  } catch (err) {
    console.error('❌ Submission status error:', err);
    return responseFunction(res, 500, 'Internal server error', err, false);
  }
});

// Get all submissions for an assignment (for teachers)
app.get('/class/assignments/:assignmentId/submissions', authTokenHandler, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) return responseFunction(res, 404, 'Assignment not found', null, false);

    // Check if user is the owner of the classroom
    const classroom = await Classroom.findById(assignment.classId);
    if (!classroom) return responseFunction(res, 404, 'Classroom not found', null, false);
    
    if (String(classroom.owner) !== String(req.userId)) {
      return responseFunction(res, 403, 'Only classroom owners can view submissions', null, false);
    }

    const submissions = await Submission.find({ assignmentId: assignment._id })
      .populate('studentId', 'name email')
      .sort({ submittedAt: -1 });

    return responseFunction(res, 200, 'Submissions fetched successfully', submissions, true);
  } catch (err) {
    return responseFunction(res, 500, 'Internal server error', err, false);
  }
});

// ─────────────────────────────────────────
// 6. Assignment routes (fix for update & delete)
// ─────────────────────────────────────────

// ✅ UPDATE ASSIGNMENT (POST)
app.post('/class/assignments/:assignmentId/update', authTokenHandler, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { title, description, dueDate, rubric } = req.body || {};

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    const classroom = await Classroom.findById(assignment.classId);
    if (!classroom || String(classroom.owner) !== String(req.userId)) {
      return res.status(403).json({ message: 'Only owner can edit assignments' });
    }

    if (title !== undefined) assignment.title = title;
    if (description !== undefined) assignment.description = description;
    if (dueDate !== undefined) assignment.dueDate = dueDate ? new Date(dueDate) : null;
    if (rubric !== undefined) assignment.rubric = rubric;

    await assignment.save();
    return res.status(200).json({ message: 'Assignment updated', data: assignment });
  } catch (err) {
    console.error('Update error:', err);
    return res.status(500).json({ message: 'Internal server error', error: String(err) });
  }
});

// ✅ DELETE ASSIGNMENT (DELETE or POST)
app.all(['/class/assignments/:assignmentId/delete', '/class/assignments/:assignmentId'], authTokenHandler, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

    const classroom = await Classroom.findById(assignment.classId);
    if (!classroom || String(classroom.owner) !== String(req.userId)) {
      return res.status(403).json({ message: 'Only owner can delete assignments' });
    }

    await Assignment.findByIdAndDelete(assignmentId);
    return res.status(200).json({ message: 'Assignment deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    return res.status(500).json({ message: 'Internal server error', error: String(err) });
  }
});

// ─────────────────────────────────────────
// 7. Test routes
// ─────────────────────────────────────────
app.get('/class/test-submission-status', (req, res) => {
  res.json({ message: 'Submission status route is working', timestamp: new Date() });
});

// ─────────────────────────────────────────
// 8. Misc routes
// ─────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/getuserdata', (req, res) => {
  res.send('Harshal Jain , 45 , Male');
});

// ─────────────────────────────────────────
// 9. Start server
// ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🟢 Mastersgang backend running on port ${PORT}`);
});
