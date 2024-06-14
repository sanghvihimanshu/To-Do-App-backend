const mongoose = require('mongoose')

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/himanshu', { useNewUrlParser: true, useUnifiedTopology: true })
    .then (() => {
        console.log('mongodb connect succesfully !');
    }).catch ((e) => {
        console.log('error while connecting to mongodb');
        console.log(e)
    }
)
module.exports = {
    mongoose
}