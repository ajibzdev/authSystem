const mongoose = require('mongoose');
const schema = mongoose.Schema;

const userSchema = new schema({
    name: String,
    email: String,
    password: String,
    dataOfBirth: Date,
    verified: Boolean
});

const user = mongoose.model('users', userSchema);

module.exports = user;