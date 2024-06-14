const mongoose = require('mongoose');
const { timestamp } = require('rxjs');

const  ListSchema = new mongoose.Schema( {

    
    description : {
        type:String,
        require:true,
        minlength:1,
    },

    timestamp : {
        type:String,
    },

    checked :{
        type:Boolean,
    },
    
    _userId : {
        type : mongoose.Types.ObjectId,
        require :true
    }

})

const List = mongoose.model('List',ListSchema)

module.exports = {List}