
// Required dependencies:
const logger = require('../config/logger.js')
const jwt = require('jsonwebtoken')
const authStringConstant = require('../constants/strings')
const Hotel = require('../models/hotel')
const httpStatusCode = require('../constants/httpStatusCodes');
const bcrypt = require('bcrypt')
const passwordSchema = require('../validator/passwordValidator')
const emailValidator = require('../validator/emailValidator');
const redisClient = require('../database/redisConnection')
const { decode } = require('punycode');


// Authentication Controller Commands:
const authActions = {
  // Registration function:
  registerNewHotel: async function (req, res) {
    try {
      const { username, password, verifyPassword, description, address,star_rating,free_rooms,booked_rooms } = req.body
      // Email and Password Validator
      const { valid, reason, validators } = await emailValidator(username)
      const isPasswordValid = passwordSchema.validate(password)

      // To check if all the required fields are provided
      if (!username || !password || !verifyPassword || !description || !address|| !star_rating || !free_rooms || !booked_rooms) {
        return res.status(httpStatusCode.CONFLICT).send({
          success: false,
          message: authStringConstant.MISSING_FIELDS,
        });
      }
      // To verify if userName is a valid email id has been provided
      else if (!valid) {
        return res.status(httpStatusCode.CONFLICT).send({
          success: false,
          message: authStringConstant.INVALID_EMAIL,
          reason: validators[reason].reason
        });
      }
      //  If the password doesn't meet the conditions returns error message
      else if (!isPasswordValid) {
        return res.status(httpStatusCode.CONFLICT).send({
          success: false,
          message: authStringConstant.PASSWORD_INVALID,
        });
      }
      // To check if password and verify password match
      else if (password != verifyPassword) {
        return res.status(httpStatusCode.CONFLICT).send({
          success: false,
          message: authStringConstant.PASSWORD_MISMATCH,
        });
      }
      // Perform - Registering a Customer
      else if (valid & isPasswordValid & (password === verifyPassword)) {

        // check if user already exist
        const oldUser = await Hotel.findOne({ username })

        // To check if user already exists
        if (oldUser) {
          return res.status(httpStatusCode.CONFLICT).send({
            success: false,
            message: authStringConstant.USER_EXIST,
          });
        } else {
          // Creates a object based on the user schema
          var newHotel = Hotel({
            username: username,
            email: username,
            password: password,
            description: description,
            address: address,
            star_rating: star_rating,
            free_rooms: free_rooms,
            booked_rooms: booked_rooms
          });
          // Performs the save option the schema
          newHotel.save(function (err, newHotel) {
            if (err) {
              return res.status(httpStatusCode.CONFLICT).send({
                success: false,
                message: authStringConstant.FAILURE_REG,
                error: err.message,
              });
            } else {
              const accessToken = jwt.sign(
                { user_id: newHotel._id, username },
                process.env.ACCESS_TOKEN_KEY,
                {
                  expiresIn: process.env.ACCESS_TOKEN_TIME,
                }
              );

              const refreshToken = jwt.sign(
                { user_id: newHotel._id, username },
                process.env.REFRESH_TOKEN_KEY,
                {
                  expiresIn: process.env.REFRESH_TOKEN_TIME,
                }
              );
              // newHotel.accessToken = accessToken;
              // newHotel.refreshToken = refreshToken;
              // newHotel.save()
              redisClient.get(username.toString(), (err, data) => {
                if (err) {
                  console.log(err)
                } else {
                  redisClient.set(username.toString(), JSON.stringify({ accessToken: accessToken, refreshToken: refreshToken }))
                }
              })
              // send the success response with the token
              return res.status(httpStatusCode.OK).send({
                success: true,
                message: authStringConstant.SUCCESSFUL_REG,
                accessToken: accessToken,
                refreshToken: refreshToken,
              });
            }
          });
        }
      }
      else {
        return res.status(httpStatusCode.GATEWAY_TIMEOUT).send({
          success: false,
          message: authStringConstant.UNKNOWN_ERROR,
        });
      }
    } catch (error) {
      console.log(error.message)
      // send proper response
    }
  }, // Register logic ends here

  // Login existing customer
  loginExistingHotel: async function (req, res) {
    try {
      //Get user input
      const { username, password } = req.body;
      if (!username && !password) {
        res.status(httpStatusCode.BAD_REQUEST).send({
          success: false,
          message: authStringConstant.MISSING_INPUT
        });
      }
      const user = await Hotel.findOne({ username });
      // If user details doesn't exist ask the customer to register
      if (!user) {
        res.status(httpStatusCode.UNAUTHORIZED).send({
          success: false,
          message: authStringConstant.USER_DOES_NOT_EXIST
        });
      }
      // Validate if user exist in our database
      else if (user && (await bcrypt.compare(password, user.password))) {

        const accessToken = jwt.sign(
          { user_id: user._id, username },
          process.env.ACCESS_TOKEN_KEY,
          {
            expiresIn: process.env.ACCESS_TOKEN_TIME,
          }
        );

        const refreshToken = jwt.sign(
          { user_id: user._id, username },
          process.env.REFRESH_TOKEN_KEY,
          {
            expiresIn: process.env.REFRESH_TOKEN_TIME,
          }
        );
        redisClient.get(username.toString(), (err, data) => {
          if (err) {
            console.log(err)
          } else {
            redisClient.set(username.toString(), JSON.stringify({ accessToken: accessToken, refreshToken: refreshToken }))
          }
        })
        res.status(httpStatusCode.OK).send({
          success: true,
          message: authStringConstant.SUCCESSFUL_LOGIN,
          accessToken: accessToken,
          refreshToken: refreshToken,
        });

      }
      // If password doesn't match
      else if (user && !(await bcrypt.compare(password, user.password))) {
        res.status(httpStatusCode.BAD_REQUEST).send({
          success: false,
          message: authStringConstant.INVALID_CREDENTIALS
        });
      }
      else {
        res.status(httpStatusCode.GATEWAY_TIMEOUT).send({
          success: false,
          message: authStringConstant.UNKNOWN_ERROR,
        });
      }
    } catch (error) {
      console.log(error.message);
      // send proper response
    }
  }, // Login logic ends here

};

module.exports = authActions;

