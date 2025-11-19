const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema({
    assignmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assignment',
        required: true,
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Classroom',
        required: true,
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    textAnswer: {
        type: String,
        default: ''
    },
    files: [{
        filename: String,
        url: String,
        mimetype: String,
        size: Number
    }],
    submittedAt: {
        type: Date,
        default: Date.now
    },
    grade: {
        type: Number,
        default: null
    },
    feedback: {
        type: String,
        default: ''
    }
}, { timestamps: true });

const Submission = mongoose.model('Submission', SubmissionSchema);

module.exports = Submission;


