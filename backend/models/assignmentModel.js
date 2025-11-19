const mongoose = require('mongoose');

const AssignmentSchema = new mongoose.Schema({
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Classroom',
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    dueDate: {
        type: Date,
    },
    rubric: {
        type: Object,   // flexible rubric structure
        default: null,
    },
    attachments: [{
        filename: String,
        url: String,        // served from /uploads
        mimetype: String,
        size: Number
    }]
}, { timestamps: true });

const Assignment = mongoose.model('Assignment', AssignmentSchema);

module.exports = Assignment;


