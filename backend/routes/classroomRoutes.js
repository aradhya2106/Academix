const express = require('express');
const path = require('path');
const multer = require('multer');
const nodemailer = require('nodemailer');
const Classroom = require('../models/classroomModel');
const User = require('../models/userModel');
const Post = require('../models/postModel');
const ClassroomJoin = require('../models/classroomJoinModel');
const Assignment = require('../models/assignmentModel');
const Submission = require('../models/submissionModel');
const responseFunction = require('../utils/responseFunction');
const authTokenHandler = require('../middlewares/checkAuthToken');

const router = express.Router();

// ----------------------
// File Upload Setup
// ----------------------
const uploadsDir = path.join(__dirname, '..', 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  }
});
const upload = multer({ storage });

// ----------------------
// Email Utility
// ----------------------
const mailer = async (receiverEmail, code) => {
  let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.COMPANY_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  const info = await transporter.sendMail({
    from: "Team MastersGang",
    to: receiverEmail,
    subject: "OTP for MastersGang",
    html: `<b>Your OTP is ${code}</b>`,
  });

  console.log("Message sent: %s", info.messageId);
  return !!info.messageId;
};

// ----------------------
// Classroom Routes
// ----------------------
// Generate unique join code
const generateJoinCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

router.post('/create', authTokenHandler, async (req, res) => {
  const { name, description } = req.body;
  if (!name) return responseFunction(res, 400, 'Classroom name is required', null, false);

  try {
    // Check if user is a teacher
    const user = await User.findById(req.userId);
    if (!user) return responseFunction(res, 404, 'User not found', null, false);
    if (user.role !== 'teacher') {
      return responseFunction(res, 403, 'Only teachers can create classrooms', null, false);
    }

    // Generate unique join code
    let joinCode;
    let isUnique = false;
    while (!isUnique) {
      joinCode = generateJoinCode();
      const existingClassroom = await Classroom.findOne({ joinCode });
      if (!existingClassroom) {
        isUnique = true;
      }
    }

    const newClassroom = new Classroom({
      name,
      description,
      joinCode,
      owner: req.userId,
    });
    await newClassroom.save();
    return responseFunction(res, 201, 'Classroom created successfully', newClassroom, true);
  } catch (err) {
    return responseFunction(res, 500, 'Internal server error', err, false);
  }
});

router.get('/classroomscreatedbyme', authTokenHandler, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return responseFunction(res, 404, 'User not found', null, false);
    
    // Only teachers can access created classrooms
    if (user.role !== 'teacher') {
      return responseFunction(res, 403, 'Only teachers can access created classrooms', null, false);
    }

    const classrooms = await Classroom.find({ owner: req.userId });
    return responseFunction(res, 200, 'Classrooms fetched successfully', classrooms, true);
  } catch (err) {
    return responseFunction(res, 500, 'Internal server error', err, false);
  }
});

router.get('/getclassbyid/:classid', authTokenHandler, async (req, res) => {
  const { classid } = req.params;
  try {
    const classroom = await Classroom.findById(classid).populate('posts');
    if (!classroom) return responseFunction(res, 404, 'Classroom not found', null, false);
    return responseFunction(res, 200, 'Classroom fetched successfully', classroom, true);
  } catch (err) {
    return responseFunction(res, 500, 'Internal server error', err, false);
  }
});

router.post('/addpost', authTokenHandler, async (req, res) => {
  const { title, description, classId } = req.body;
  try {
    const classroom = await Classroom.findById(classId);
    if (!classroom) return res.status(404).json({ message: 'Classroom not found' });

    // Check if user is the owner of the classroom
    if (String(classroom.owner) !== String(req.userId)) {
      return res.status(403).json({ message: 'Only classroom owners can create posts' });
    }

    const newPost = new Post({
      title,
      description,
      classId,
      createdBy: req.userId,
    });
    await newPost.save();
    classroom.posts.push(newPost._id);
    await classroom.save();

    res.status(201).json({ message: 'Post created successfully', post: newPost });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// ----------------------
// Search Classrooms
// ----------------------
router.get('/classrooms/search', async (req, res) => {
  try {
    const term = req.query.term;
    if (!term) return responseFunction(res, 400, 'Search term is required', null, false);

    const results = await Classroom.find({ name: { $regex: new RegExp(term, 'i') } });
    if (results.length === 0) return responseFunction(res, 404, 'Classroom not found', null, false);

    responseFunction(res, 200, 'Search results', results, true);
  } catch (error) {
    responseFunction(res, 500, 'Internal server error', error, false);
  }
});

// ----------------------
// Join & Verify OTP
// ----------------------
router.post('/request-to-join', async (req, res) => {
  const { classroomId, studentEmail } = req.body;
  if (!classroomId || !studentEmail)
    return responseFunction(res, 400, 'Classroom ID and student email are required', null, false);

  try {
    const classroom = await Classroom.findById(classroomId);
    if (!classroom) return responseFunction(res, 404, 'Classroom not found', null, false);

    const classOwner = await User.findById(classroom.owner);
    if (!classOwner) return responseFunction(res, 404, 'Class owner not found', null, false);

    const code = Math.floor(100000 + Math.random() * 900000);
    const isSent = await mailer(classOwner.email, code);
    if (!isSent) return responseFunction(res, 500, 'Failed to send OTP', null, false);

    const newClassroomJoin = new ClassroomJoin({
      classroomId,
      studentEmail,
      code,
      classOwnerEmail: classOwner.email
    });
    await newClassroomJoin.save();

    return responseFunction(res, 200, 'OTP sent to the class owner', null, true);
  } catch (err) {
    return responseFunction(res, 500, 'Internal server error', err, false);
  }
});

// Join classroom using join code (new simplified method)
router.post('/join-by-code', authTokenHandler, async (req, res) => {
  const { joinCode } = req.body;
  if (!joinCode) return responseFunction(res, 400, 'Join code is required', null, false);

  try {
    // Get current user
    const user = await User.findById(req.userId);
    if (!user) return responseFunction(res, 404, 'User not found', null, false);
    if (user.role !== 'student') {
      return responseFunction(res, 403, 'Only students can join classrooms', null, false);
    }

    // Find classroom by join code
    const classroom = await Classroom.findOne({ joinCode: joinCode.toUpperCase() });
    if (!classroom) return responseFunction(res, 404, 'Invalid join code', null, false);

    // Check if student is already enrolled
    if (classroom.students.includes(user.email)) {
      return responseFunction(res, 400, 'You are already enrolled in this classroom', null, false);
    }

    // Add student to classroom
    classroom.students.push(user.email);
    await classroom.save();

    return responseFunction(res, 200, 'Successfully joined the classroom', classroom, true);
  } catch (err) {
    return responseFunction(res, 500, 'Internal server error', err, false);
  }
});

router.post('/verify-otp', authTokenHandler, async (req, res) => {
  const { classroomId, studentEmail, otp } = req.body;
  if (!classroomId || !studentEmail || !otp)
    return responseFunction(res, 400, 'Classroom ID, student email, and OTP are required', null, false);

  try {
    const joinRequest = await ClassroomJoin.findOne({ classroomId, studentEmail, code: otp });
    if (!joinRequest) return responseFunction(res, 400, 'Invalid OTP or join request not found', null, false);

    const classroom = await Classroom.findById(classroomId);
    if (!classroom) return responseFunction(res, 404, 'Classroom not found', null, false);

    if (!classroom.students.includes(studentEmail)) {
      classroom.students.push(studentEmail);
      await classroom.save();
    }
    await ClassroomJoin.deleteOne({ _id: joinRequest._id });

    return responseFunction(res, 200, 'Successfully joined the class', null, true);
  } catch (err) {
    return responseFunction(res, 500, 'Internal server error', err, false);
  }
});

router.get('/classroomsforstudent', authTokenHandler, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return responseFunction(res, 404, 'User not found', null, false);
    
    // Only students can access enrolled classrooms
    if (user.role !== 'student') {
      return responseFunction(res, 403, 'Only students can access enrolled classrooms', null, false);
    }

    const classrooms = await Classroom.find({ students: user.email });
    if (classrooms.length === 0) return responseFunction(res, 404, 'No classrooms found', null, false);
    return responseFunction(res, 200, 'Classrooms fetched successfully', classrooms, true);
  } catch (err) {
    return responseFunction(res, 500, 'Internal server error', err, false);
  }
});

// ----------------------
// Assignment Routes
// ----------------------

// Get all assignments
router.get('/:classId/assignments', authTokenHandler, async (req, res) => {
  try {
    const { classId } = req.params;
    const classroom = await Classroom.findById(classId);
    if (!classroom) return responseFunction(res, 404, 'Classroom not found', null, false);

    const list = await Assignment.find({ classId }).sort({ createdAt: -1 });
    return responseFunction(res, 200, 'Assignments fetched', list, true);
  } catch (err) {
    return responseFunction(res, 500, 'Internal server error', err, false);
  }
});

// Create new assignment
router.post('/assignments', authTokenHandler, async (req, res) => {
  try {
    const { classId, title, description, dueDate, rubric } = req.body;
    if (!classId || !title)
      return responseFunction(res, 400, 'classId and title are required', null, false);

    const classroom = await Classroom.findById(classId);
    if (!classroom) return responseFunction(res, 404, 'Classroom not found', null, false);

    if (String(classroom.owner) !== String(req.userId))
      return responseFunction(res, 403, 'Only owner can create assignments', null, false);

    const assignment = new Assignment({
      classId,
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      rubric: rubric || null,
    });

    await assignment.save();
    return responseFunction(res, 201, 'Assignment created', assignment, true);
  } catch (err) {
    return responseFunction(res, 500, 'Internal server error', err, false);
  }
});

// Update or Delete Assignment (unified handling)
const updateAssignment = async (req, res) => {
  const { assignmentId } = req.params;
  const { title, description, dueDate, rubric } = req.body;
  try {
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) return responseFunction(res, 404, 'Assignment not found', null, false);
    const classroom = await Classroom.findById(assignment.classId);
    if (!classroom || String(classroom.owner) !== String(req.userId))
      return responseFunction(res, 403, 'Only owner can edit assignments', null, false);

    if (title !== undefined) assignment.title = title;
    if (description !== undefined) assignment.description = description;
    if (dueDate !== undefined) assignment.dueDate = dueDate ? new Date(dueDate) : null;
    if (rubric !== undefined) assignment.rubric = rubric;

    await assignment.save();
    return responseFunction(res, 200, 'Assignment updated', assignment, true);
  } catch (err) {
    return responseFunction(res, 500, 'Internal server error', err, false);
  }
};

// Supports POST, PUT, PATCH
router.post('/assignments/:assignmentId/update', authTokenHandler, updateAssignment);
router.put('/assignments/:assignmentId', authTokenHandler, updateAssignment);
router.patch('/assignments/:assignmentId', authTokenHandler, updateAssignment);

// Delete routes
router.delete('/assignments/:assignmentId', authTokenHandler, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) return responseFunction(res, 404, 'Assignment not found', null, false);

    const classroom = await Classroom.findById(assignment.classId);
    if (!classroom || String(classroom.owner) !== String(req.userId))
      return responseFunction(res, 403, 'Only owner can delete assignments', null, false);

    await Assignment.deleteOne({ _id: assignmentId });
    return responseFunction(res, 200, 'Assignment deleted', null, true);
  } catch (err) {
    return responseFunction(res, 500, 'Internal server error', err, false);
  }
});

// Support POST /delete for frontend environments
router.post('/assignments/:assignmentId/delete', authTokenHandler, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) return responseFunction(res, 404, 'Assignment not found', null, false);

    const classroom = await Classroom.findById(assignment.classId);
    if (!classroom || String(classroom.owner) !== String(req.userId))
      return responseFunction(res, 403, 'Only owner can delete assignments', null, false);

    await Assignment.deleteOne({ _id: assignmentId });
    return responseFunction(res, 200, 'Assignment deleted', null, true);
  } catch (err) {
    return responseFunction(res, 500, 'Internal server error', err, false);
  }
});

// ----------------------
// Submissions
// ----------------------
router.post('/assignments/:assignmentId/submit', authTokenHandler, upload.array('file', 5), async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { textAnswer } = req.body;
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) return responseFunction(res, 404, 'Assignment not found', null, false);

    if (assignment.dueDate && new Date() > new Date(assignment.dueDate))
      return responseFunction(res, 400, 'Deadline has passed', null, false);

    // Check if student already submitted
    const existingSubmission = await Submission.findOne({ 
      assignmentId: assignment._id, 
      studentId: req.userId 
    });
    if (existingSubmission) {
      return responseFunction(res, 400, 'You have already submitted this assignment', null, false);
    }

    const files = (req.files || []).map(f => ({
      filename: f.filename,
      url: `/uploads/${f.filename}`,
      mimetype: f.mimetype,
      size: f.size
    }));

    const submission = new Submission({
      assignmentId: assignment._id,
      classId: assignment.classId,
      studentId: req.userId,
      textAnswer: textAnswer || '',
      files
    });
    await submission.save();
    return responseFunction(res, 201, 'Submission received', submission, true);
  } catch (err) {
    return responseFunction(res, 500, 'Internal server error', err, false);
  }
});

// Note: Submission status routes moved to main index.js to avoid routing conflicts

module.exports = router;
