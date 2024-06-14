const mongoose = require('mongoose')

mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONOGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
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