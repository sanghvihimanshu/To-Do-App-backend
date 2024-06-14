const mongoose = require('mongoose');
const _ = require('lodash');
const jwt = require('jsonwebtoken');
const jwtsecret ="123443211234321ewjvbwewewvk2134242429";
const crypto = require('crypto');
const bcrypt = require('bcryptjs')

const UsersSchema = new mongoose.Schema(
    {
         email : {
            type:String,
            require:true,
            minlength:1 ,
            unique:true
         },

         password : {
            type:String,
            require:true,
            minlength:4
         },

         sessions : [ {
            token : {
                type:String,
                require:true,
                
            },

            expiresAt: {
                type:Number,
                require: true
            }
         }]
   });

UsersSchema.methods.toJSON = function () {
    const user = this;
    const userObject = user.toObject();

    return _.omit(userObject,['password','sessions']);
}

UsersSchema.methods.generateAccessAuthToken= function() {
    const user =this;

    return new Promise((resolve,reject) => {
       jwt.sign({_id:user._id.toHexString()} , jwtsecret , {expiresIn:"15m"} , (err,token) => {
         if(!err) {
            resolve(token);
         }
         else{
            reject();
         }
       })
    }) 
}

UsersSchema.methods.generateRefreshAuthToken = function () {
    return new Promise((resolve,reject) => {
          crypto.randomBytes(64 , (err,buf) => {
             if(!err) {
                let token  = buf.toString('hex');
                resolve(token);
             }
          })
    }) 
}

UsersSchema.statics.getjwtSecret = () => {
    return jwtsecret;
}


UsersSchema.statics.findByIdAndToken = function(_id,token) {
    let user = this ;
    // let _id = user.mongoose.Schema.ObjectId;
    return user.findOne({
         _id,
        'sessions.token':token 
    });
}

// static method for this
UsersSchema.statics.findByCredentials = function(email, password) {
    // console.log(email);
    let user = this;
     return user.findOne({email})
    .then((user) => {
        if(!user) {
            return Promise.reject({message : 'User not found , go to register'});
        }

        return new Promise((resolve, reject) => {
            bcrypt.compare(password , user.password ,(err, res) => {
                if(res) {
                  resolve(user);
                }
                else{
                   reject({message:'Incorrect password'});
                }
            });
        });
    });
}

UsersSchema.statics.hasRefreshTokenExpired = (expiresAt) => {
    let seconds = Date.now() / 1000 ; 
    if(expiresAt > seconds) {return false;}
    else {return true;}
}

UsersSchema.pre('save' , function (next) {
    let user =this;
    let cost = 10 ;

    if(user.isModified('password')) {
        bcrypt.genSalt(cost , (err,salt) => {
            bcrypt.hash(user.password , salt , (err,hash) => {
                user.password =hash ;
                next();
            })
        })
    } else next();
})

UsersSchema.methods.createSession = function () {
    let user = this;

    return user.generateRefreshAuthToken()
    .then((refreshToken)=> {
        return saveSessionToDatabase(user,refreshToken);
    })
    .then((refreshToken) => {
        return refreshToken ;
    })
    .catch((e) => {
        return Promise.reject('failed to save the session to database ' + e);
   })

}

let saveSessionToDatabase = (user,refreshToken)  => {
  
    return new Promise ((resolve,reject) => {
        let expiresAt = generateRefreshTokenExpiryTime();
        
        user.sessions.push( { 'token' : refreshToken , expiresAt } )

        user.save()
        .then(() => {
            return resolve(refreshToken);
        })
        .catch((e) => {
            reject(e);
        })
    })
}


let generateRefreshTokenExpiryTime = () => {
    let daysuntillExpire = 10 ;
    let secondsuntillExpire = (( daysuntillExpire * 24  )* 60 ) *60 ;


    return ((Date.now() /1000) + secondsuntillExpire);
}

const Users = mongoose.model('Users', UsersSchema);
module.exports = {Users}