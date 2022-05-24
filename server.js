// mongodb
require('./config/db');

// express
const app = require('express')();

// port
const port = 27017;

// routes
const userRouter = require('./api/user')

// For accepting post form data
const bodyParser = require('express').json;
app.use(bodyParser());

app.use('/user', userRouter)

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
})