const mongoose = require('mongoose');
const schema = mongoose.Schema;

const userVerificationSchema = new schema({
    userId: String,
    uniqueString: String,
    createdAt: Date,
    expiresAt: Date
});

const userVerification = mongoose.model('userVerification', userVerificationSchema);

module.exports = userVerification;