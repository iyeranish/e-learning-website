var express = require('express');
var app = express();
var mongoose = require('mongoose');
var CourseModel = require('./models/course');
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');
const path = require('path');
const LessonModel = require('./models/lessons');
var passport = require('passport');
var LocalStrategy = require('passport-local');
var User = require('./models/user');

mongoose.connect('mongodb://localhost:27017/e_learning', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false,
});

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, 'public')));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get('/', (req, res) => {
  res.render('landing');
});

app.get('/classes', async function (req, res) {
  const courses = await CourseModel.find();
  res.render('courses/index', { courses });
});

app.get('/classes/new', (req, res) => {
  res.render('courses/new');
});

app.post('/classes', async (req, res) => {
  const course = new CourseModel(req.body.course);
  await course.save();
  res.redirect('/classes');
});

app.get('/classes/:id', async function (req, res) {
  const course = await CourseModel.findById(req.params.id).populate('lessons');
  res.render('courses/show', { course });
});

app.post('/classes/:id/lessons', async (req, res) => {
  const course = await CourseModel.findById(req.params.id).populate('lessons');
  if (!course) {
    res.redirect('/classes');
    return;
  }
  const { previousLesson = null, title, lessonUrl } = req.body.lesson;
  const lesson = LessonModel({ title, lessonUrl });
  await lesson.save();
  let i = 0;
  if (previousLesson) {
    for (let temp of course.lessons) {
      console.log(temp.title);
      if (temp.title === previousLesson) {
        break;
      }
      i += 1;
    }
    console.log(i);
    course.lessons.splice(i + 1, 0, lesson);
    await course.save();
  } else {
    await course.lessons.push(lesson);
    await course.save();
  }

  res.redirect(`/classes/${req.params.id}`);
});

app.delete('/classes/:id/lessons/:lessonId', async (req, res) => {
  const course = await CourseModel.findById(req.params.id);
  if (!course) {
    res.redirect('/classes');
    return;
  }
  await course.lessons.pull({ _id: req.params.lessonId });
  await LessonModel.findByIdAndDelete(req.params.lessonId);
  await course.save();
  res.redirect(`/classes/${req.params.id}`);
});

app.delete('/classes/:id', async (req, res) => {
  await CourseModel.findByIdAndDelete(req.params.id);
  res.redirect('/classes');
});

// AUTHENTICATION ROUTES

app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', function (req, res) {
  User.register(
    new User({ username: req.body.username }),
    req.body.password,
    function (err, user) {
      if (err) {
        res.redirect('/register');
      } else {
        passport.authenticate('local')(req, res, function () {
          res.redirect('/classes');
        });
      }
    }
  );
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post(
  '/login',
  passport.authenticate('local', { failureRedirect: '/login' }),
  function (req, res) {
    res.redirect('/classes');
  }
);

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

app.listen(3000, function () {
  console.log('The website has started');
});
