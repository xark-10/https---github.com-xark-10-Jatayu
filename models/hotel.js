//TODO: Add JOI to the user schema and add validation to the firstName and lastName other required fields and perform validate before saving to avoid SQL Injection.
// https://www.npmjs.com/package/joi

// Required dependencies
const mongoose = require("mongoose")
const { Logger } = require("logger")
const bcrypt = require('bcrypt')
require('dotenv').config()
const saltValue = 12

  // User Schema definition
  var hotelSchema = new mongoose.Schema(
    {
      username:{
        type: String,
        lowercase: true,
        trim: true,
        require: true,
        unique: true,
        minlength: 6,
      },
      email: {
        type: String,
        lowercase: true,
        trim: true,
        require: true,
        unique: true,
        minlength: 6,
      },
      password: {
        type: String,
        require: true,
      },
      accessToken: {
        type: String
      },
      refreshToken: {
        type: String
      },
      description: {
        type: String,
        require: true,
      },
      address: {
        type: String,
        require: true,
      },
    star_rating: {
        type: String,
        require: true,
      },
    free_rooms:{
        type: Number,
        require: true,
    },
    booked_rooms:{
        type: Number,
        require: true,
    }
},

    { collection: "Hotels" }
  );


  hotelSchema.pre('save', function (next) {
  var user = this;
  if (this.isModified('password') || this.isNew) {
    bcrypt.genSalt(saltValue, function (err, salt) {
      if (err) {
        return next(err)
      }
      bcrypt.hash(user.password, salt, function (err, hash) {
        if (err) {
          return next(err)
        }
        user.password = hash;
        next()
      })
    })
  } else {
    return next()
    //logger.error('error', `User Model - Returning User`)
  }
})

module.exports = mongoose.model("Hotel", hotelSchema);