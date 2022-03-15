 if(process.env.NODE_ENV !== "production") {
     require('dotenv').config(); 
}

const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const ejsMate = require('ejs-mate');
const ExpressError = require('./utils/ExpressError');
const catchAsync = require('./utils/catchAsync');
const session = require('express-session');
const flash = require('connect-flash'); 
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');
const {isLoggedIn} = require('./middleware');

const voluemsRoutes = require('./routes/volumes.js');//Router 
const userRoutes = require('./routes/users.js');

const MongoStore = require('connect-mongo');
const { db } = require('./models/user');
  
const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/fracTank'

mongoose.connect(dbUrl)  
    .then(() => {
        console.log("Mongo Connection Open")
    })
    .catch((e) => {
        console.log("Oh No, Mongo Error Dude") 
        console.log(e)
    })

const secret = process.env.SECRET || "words";
const store = new MongoStore({
    mongoUrl: dbUrl,
    touchAfter: 24 * 60 * 60,
    crypto: {
        secret: secret 
    }
}) 


//Session and flash
const sessionConfig = { 
    store: store,
    name: 'session',
    secret: secret,
    resave: false,
    saveUninitialized: true,
        cookie: {
            httpOnly: true,
            expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
            maxAge: 1000 * 60 * 60 * 24 * 7
        }
}
app.use(session(sessionConfig));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()))
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    return next(); 
})

app.engine('ejs', ejsMate); 
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({extended: true}));
app.use(methodOverride('_method')); 
app.use('/volumes', voluemsRoutes);//Router
app.use('/', userRoutes);//Router

//Home Page
app.get('/home', isLoggedIn, (req, res) => {   
    res.render('home'); 
})

app.get('/', (req, res) => {
    res.render('landing'); 
})

//Middleware
//for url we dont recognize - will respond if no matches - can use this in our below error handle
app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404));
})

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err
    if(!err.message) err.message = "Oh No, Error"
    res.status(statusCode).render('error', { err });//pass entire error to template
})

const port = process.env.PORT || 3000
app.listen(port, () => {
    console.log(`Serving on port ${port}`);
})   