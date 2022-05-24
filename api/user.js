const express = require('express');
const router = express.Router();

// moment to format date
const moment = require('moment')

// Mongodb user model
const user = require('./../models/user');

// Mongodb user Verification model
const userVerification = require('./../models/userVerification');

// email handler
const nodemailer = require('nodemailer');

// unique string
const { v4: uuidv4 } = require('uuid');

// env variables
require('dotenv').config();

// Password handler
const bcrypt = require('bcryptjs');

// Path for static verified page
const path = require('path');

// nodemailer transporter
let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS
    }
})

// Testing nodemailer success
transporter.verify((error, success) => {
    if (error) {
        console.log(error);
    } else {
        console.log("Ready for messages");
        console.log(success);
    }
})

// Allow access to our API
router.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested, Content-Type, Accept, Authorization");
    next()
})

// Signup
router.post('/signup', (req, res) => {
    let { name, email, password, dateOfBirt } = req.body;

    let dateOfBirth = moment(dateOfBirt).format('MM-DD-YYYY')

    name = name.trim();
    email = email.trim();
    password = password.trim();
    dateOfBirth = dateOfBirth.trim();

    // email formatter
    let mailFormat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

    if (name == "" || email == "" || password == "" || dateOfBirth == "") {
        res.json({
            status: "FAILED",
            message: "Empty input fields!"
        })
    } else if (!/^[a-zA-Z ]*$/.test(name)) {
        res.json({
            status: "FAILED",
            message: "Invalid name entered"
        })
    } else if (!(email.match(mailFormat))) {
        res.json({
            status: "FAILED",
            message: "Invalid email entered"
        })
    } else if (!new Date(dateOfBirth).getTime()) {
        res.json({
            status: "FAILED",
            message: "Invalid date of birth entered"
        })
    } else if (password.length < 8) {
        res.json({
            status: "FAILED",
            message: "Password is too short"
        })
    } else {
        // Checks if user already existed
        user.find({email}).then(result => {
            if(result.length) {
                // A user already exists
                res.json({
                    status: "FAILED",
                    message: "User with the provided email already exists"
                })
            } else {
                // Create new user

                // Password handling
                const saltRounds = 10;
                bcrypt.hash(password, saltRounds).then(hashedPassword => {
                    const newUser = new user({
                        name,
                        email,
                        password: hashedPassword,
                        dateOfBirth,
                        verified: false
                    });

                    newUser.save().then(result => {
                        // Handles user verification
                        sendVerificationEmail(result, res);
                    })
                    .catch(err => {
                        res.json({
                            status: "FAILED",
                            message: "An error occured while saving user account!"
                        })
                    })
                })
                .catch(err => {
                    res.json({
                        status: "FAILED",
                        message: "An error occured while hasing password!"
                    })
                })
            }
        }).catch(err => {
            console.log((err));
            res.json({
                status: "FAILED",
                message: "An error occured while checking for existing user!"
            })
        })
    }
})

// Send verification email
const sendVerificationEmail = ({_id, email}, res) => {
    // Url to be used in the email
    const currentUrl = 'http://localhost:27017/';

    const uniqueString = uuidv4() + _id;

    // mail options
    const mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: email,
        subject: "Email Verification",
        html: `<p>Verify your email address to complete the signup and log into your account</p><p>This link <strong>expires in 6 hours</strong>.</p><p>Click <a href=${currentUrl + "user/verify/" + _id + "/" + uniqueString}>here</a> to proceed</p>`,
    };

    // hash the uniqueString
    const saltRounds = 10;
    bcrypt
     .hash(uniqueString, saltRounds)
     .then((hashedUniqueString) => {
        //  create data in userVerification collection
        const newVerification = new userVerification({
            userId: _id,
            uniqueString: hashedUniqueString,
            createdAt: Date.now(),
            expiresAt: Date.now() + 21600000
        });

        newVerification
         .save()
         .then(() => {
             transporter
              .sendMail(mailOptions)
              .then(() => {
                //   Email sent and verification record saved
                res.json({
                    status: "PENDING",
                    message: "Verification link has been sent"
                })
              })
              .catch((error) => {
                  console.log(error);
                res.json({
                    status: "FAILED",
                    message: "Email verification failed"
                })
              })
         })
         .catch((error) => {
            console.log(error);
            res.json({
                status: "FAILED",
                message: "Couldn't save verification email data"
            })
         })
     })
     .catch(() => {
        res.json({
            status: "FAILED",
            message: "An error occured while hashing email data!"
        })
     })
};

// Verify email
router.get('/verify/:userId/:uniqueString', (req, res) => {
    let { userId, uniqueString } = req.params;

    userVerification
     .findOne({userId})
     .then((result) => {
         if (result) {
            //  user verification record exist so we process

            const { expiresAt } = result;
            const hashedUniqueString = result.uniqueString;

            // Checks for expired unique string
            if (expiresAt < Date.now()) {
                // record has expired so we delete it
                userVerification
                 .deleteOne({userId})
                 .then(result => {
                     user
                      .deleteOne({_id: userId})
                      .then(() => {
                        let message = "Link has expired. Please sign up again.";
                        res.redirect(`/user/verified/error=true&message=${message}`);
                      })
                      .catch((error) => {
                          console.log(error);
                          let message = "Clearing user with expired unique string failed";
                          res.redirect(`/user/verified/error=true&message=${message}`);
                      })
                 })
                 .catch((error) => {
                     console.log(error);
                     let message = "An error occured while clearing expired user verification record";
                     res.redirect(`/user/verified/error=true&message=${message}`);
                 })
            } else {
                // valid record exists so we validate the user string
                // First compare the hashed unique string

                bcrypt
                 .compare(uniqueString, hashedUniqueString)
                 .then(result => {
                     if (result) {
                        //  strings match

                        user
                         .updateOne({_id: userId}, {verified: true})
                         .then(() => {
                             userVerification
                              .deleteOne({userId})
                              .then(() => {
                                  res.sendFile(path.join(__dirname,'./../views/verified.html'));
                              })
                              .catch((error) => {
                                  console.log(error);
                                  let message = "An error occured while while finalizing successful verification";
                                  res.redirect(`/user/verified/error=true&message=${message}`);
                              })
                         })
                         .catch((error) => {
                             console.log(error);
                             let message = "An error occured while while updating user record to show verified";
                             res.redirect(`/user/verified/error=true&message=${message}`);
                         })

                     } else {
                        //  existing record but incorrect verification details passed.
                        let message = "Invalid email verification link. Check your inbox";
                        res.redirect(`/user/verified/error=true&message=${message}`);
                     }
                 })
                 .catch((error) => {
                     console.log(error);
                     let message = "An error occured while comparing unique strings.";
                     res.redirect(`/user/verified/error=true&message=${message}`);
                 })
            }
         } else {
            //  user verification record doesn't exist
            let message = "Account record doesn't exist or has been verified already. Please sign up or log in";
            res.redirect(`/user/verified/error=true&message=${message}`);
         }
     })
     .catch((error) => {
         console.log(error);
        let message = "An error occured while checking for existing user verification record";
        res.redirect(`/user/verified/error=true&message=${message}`);
     })
});

// Verified page route
router.get('/verified', (req, res) => {
    res.sendFile(path.join(__dirname, './../views/verified.html'));
})

// Login
router.post('/login', (req, res) => {
    let { email, password } = req.body;
    email = email.trim();
    password = password.trim();

    if (email == "" || password == "") {
        res.json({
            status: "FAILED",
            message: "Empty credentials supplied"
        })
    } else {
        // Checks if user exists
        user.findOne({email})
        .then(data => {
            if (data) {
                // User exists

                // check if user is verified
                if (!data.verified) {
                    res.json({
                        status: "FAILED",
                        message: "Email has not been verified. Please check your inbox to verify your email",
                        data: data
                    })
                } else {
                    const hashedPassword = data.password;
                    bcrypt.compare(password, hashedPassword).then(result => {
                        if (result) {
                            // Password matched
                            res.json({
                                status: "SUCCESS",
                                message: "Login successful",
                                data: data
                            })
                        } else {
                            res.json({
                                status: "FAILED",
                                message: "Invalid password"
                            })
                        }
                    })
                    .catch(err => {
                        res.json({
                            status: "FAILED",
                            message: "An error occured in comparing the passwords"
                        })
                    })
                }
            } else {
                res.json({
                    status: "FAILED",
                    message: "Invalid username or password"
                })
            }
        })
        .catch(err => {
            res.json({
                status: "FAILED",
                message: "An error occured while checking for existing user"
            })
        })
    }
})

module.exports = router;