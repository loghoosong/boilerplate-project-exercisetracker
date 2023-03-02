const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.use(express.urlencoded({ extended: false }));

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(
    () => { console.log('mongoDB connected') },
    (err) => { console.error(err) }
  );

const exercise = new mongoose.Schema({
  username: String,
  description: String,
  duration: Number,
  date: Date,
}, {
  toJSON: {
    transform: function (doc, ret) {
      ret.date = ret.date.toDateString();
      delete ret.__v;
    }
  }
});

const exerciseUser = new mongoose.Schema({
  username: { type: String, required: true },
  exercises: [exercise],
}, {
  toJSON: {
    transform: function (doc, ret) {
      delete ret.__v;
    }
  }
});

const ExerciseModel = mongoose.model('Exercise', exercise);
const UserModel = mongoose.model('User', exerciseUser);

app.post('/api/users', async (req, res) => {
  if (req.body.username == '') {
    console.log('username can not be null!');
    return;
  }

  const user = new UserModel({ username: req.body.username });
  try {
    const doc = await user.save();
    res.json(doc);
  } catch (err) {
    console.error(err);
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const userList = await UserModel.find({}, 'username _id');
    res.json(userList);
  } catch (err) {
    console.error(err);
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const user = await UserModel.findOne({ _id: req.params._id });
    if (user == null) {
      res.json({ 'error': 'user not found!' });
      return;
    }

    const d = req.body.date ? new Date(req.body.date) : new Date();
    if (!(d instanceof Date)) {
      res.json({ 'error': 'bad date!' });
      return;
    }
    const exercise = new ExerciseModel({
      username: user.username,
      description: req.body.description,
      duration: req.body.duration,
      date: d,
    });
    user.exercises.push(exercise);
    const doc = await user.save();
    res.json(doc);
  } catch (err) {
    console.error(err);
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  let { from, to, limit } = req.query;

  try {
    const filter = {
      '_id': req.params._id,
    }
    if (from) filter['exercises.date'].$gte = new Date(from);
    if (to) filter['exercises.date'].$lte = new Date(to);
    if (limit) filter['exercises.date'].$limit = limit;

    const user = await UserModel.findOne(filter);

    const log = user.exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString(),
    }));

    res.json({
      username: user.username,
      count: log.length,
      _id: user._id,
      log: log,
    });
  } catch (err) {
    console.error(err);
  }
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
