const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const shortid = require('shortid')
const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MONGO_URI)

require('dotenv').config()

app.use(cors())
app.use(bodyParser.unlencoded({extended:false}))
app.use(bodyParser.json())

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});
app.get('/api/users',(req,res) => {
  
})
var Schema = mongoose.Schema;

var UserSchema = new Schema({
  username: {type: String, required: true},
  _id: {type: String, required: true},
  exercises: [{
    _id: false,
    description: {type: String, required: true},
    duration: {type: Number, required: true},
    date: {type: Date, required: true}
  }]
});

var User = mongoose.model("User", UserSchema);

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

app.post("/api/exercise/new-user", function(req, res) {

  var username = req.body.username;


  // Check if username is taken
  User.find({username: username}, (err, data) => {
    if (err)
      res.json({err: "invalid username"});
    else if (data === undefined || data.length == 0) {
      var newUser = new User({username: username, _id: shortid.generate(), exercises: []});

      newUser.save( (err, user)  => {
        if (err)
          res.json({err: err});
        else
          res.json({username: user.username, _id: user._id, exercises: user.exercises});
      })
    }
    else {
      res.send("username already taken");
    }
  });
});

app.post("/api/exercise/add", function(req, res) {
  var {userId, description, duration, date} = req.body

  var exercise = {
        description: description,
        duration: duration,
        date: date
      }

    User.findByIdAndUpdate({_id: userId}, { $push: {exercises: exercise}}, {new: true}, function (err, data) {
      if (err) {
        res.json({err: err})
      }
      else if (data == null) {
        res.send("userid not found");
      } else {
        res.json(data);
      }
    })
});

app.get("/api/exercise/log/:userid/:from?/:to?/:limit?", function(req, res) {
  let {userid, from, to, limit} = req.params;

  var fromDate = new Date(from)
  var toDate = new Date(to)

  // Search for User, filter out desired data
  User.findOne({_id: userid}, (err, data) => {
    if (err){
      res.json({err: err})
    } else if (data == null){
      res.json({err: "user not found"});
    } else {
    var exercises = data.exercises;

    // Check Successful Query with From and To First

    if (toDate instanceof Date && !isNaN(toDate))
      exercises = exercises.filter( (item) => (item.date >= fromDate && item.date <= toDate))
    else if (fromDate instanceof Date && !isNaN(fromDate))
      exercises = exercises.filter( (item) => (item.date >= fromDate))

    if (!isNaN(limit) && exercises.length > limit)
      exercises = exercises.slice(0, limit);

    res.json({exercises: exercises});

    }
  })
});