require("dotenv").config();

const express = require('express');
const bodyParser = require('body-parser');
const cors= require('cors');
const app = express();
const { List } = require('./src/db/models/list.model');
const { Users } = require('./src/db/models/users.model');
const mongoose = require('./src/db/mongoose');
const { timestamp } = require('rxjs');
const jwt = require('jsonwebtoken');
const port =process.env.PORT || 8080;


app.use(express.json())
app.use(bodyParser.json());
app.use(cors({
   origin: 'https://todo-shv.netlify.app',
   optionsSuccessStatus: 200
 }));

app.use(function (req, res, next) {
   res.header("Access-Control-Allow-Origin", "*");
   res.header("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS, PUT, PATCH, DELETE");
   res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-access-token, x-refresh-token, _id");

   res.header(
       'Access-Control-Expose-Headers',
       'x-access-token, x-refresh-token'
   );
   next();
});




let authenticate = (req,res,next) => {

   let token = req.header('x-access-token');
   jwt.verify(token , Users.getjwtSecret(),(err,decoded) => {
      if(err) {
         res.status(401).send(err);
      }
      else {
         req.user_id = decoded._id;
         next();
      }
   });
}

let verifySession = (req, res, next) => {
   
   let refreshToken = req.header('x-refresh-token');
   let _id = req.header('_id');

   Users.findByIdAndToken(_id, refreshToken).then((user) => {
       if (!user) {
          return Promise.reject({
               'error': 'User not found. Make sure that the refresh token and user id are correct'
           });
       }

       req.user_id = user._id;
       req.userObject = user;
       req.refreshToken = refreshToken;

       let isSessionValid = false;

       user.sessions.forEach((session) => {
        
           if (session.token === refreshToken) {
           
               if (!Users.hasRefreshTokenExpired(session.expiresAt)) {
                  console.log('3');
                  isSessionValid = true;
               }
           }
       });

       if (isSessionValid) {
         console.log('session is valid')
          next();
       } else {
         console.log('session is invalid')
            return Promise.reject({
               'error': 'Refresh token has expired or the session is invalid'
           })
       }

   })
   .catch((e) => {
      console.log('ok ')
       res.status(401).send(e);//unauthorized
   })
}




app.get('/lists' , authenticate,(req,res) => {
    List.find({
      _userId : req.user_id
    })
   .then((lists) => {
        res.send(lists)
    })
})

app.post('/lists' , authenticate,(req,res) => {
   let description = req.body.description;
   let checked = req.body.checked;
   let timestamp = req.body.timestamp;

   let newList = new List( {
       description,
       checked,
       timestamp,
       _userId:req.user_id
   })
   newList.save()
   .then((listDoc) => {
      res.send(listDoc);
   })
})

app.patch('/lists/:id' ,authenticate ,  (req,res) => {
    List.findOneAndUpdate({_id:req.params.id, _userId:req.user_id} , {$set:req.body})
    .then((updatededList) => {
      // console.log(updatededList);
       if(!updatededList) {
         return res.sendStatus(404).send();
       }
       res.send(updatededList);
    })  
    .catch ((e)  => {
      res.sendStatus(e);
    });
});



app.delete('/lists/:id' , authenticate ,  (req,res) => {
   List.findByIdAndDelete ( {_id : req.params.id} , {_userId : req.user_id})
   
   .then((deleted) => {
      res.send(deleted)
   })
}) 
//  register user
app.post('/user' , (req,res) => {

   let body =req.body ;
   let newuser  =  new Users(body);

   newuser.save().then(() => {
      return newuser.createSession()
   })
   .then((refreshToken) => {
      return newuser.generateAccessAuthToken()
      .then( (accessToken) =>{
         return {accessToken,refreshToken}
      })
   })
   .then((authTokens) => {
      res
          .header('x-refresh-token' , authTokens.refreshToken)
          .header('x-access-token' ,  authTokens.accessToken)
          .send(newuser);
   })
   .catch((error) => {
      res.status(400).send({error:'Email alerady exists'});
   });
})
   

//login 

app.post('/user/login' , (req,res) => {
   let email = req.body.email;
   let password = req.body.password;

   Users.findByCredentials(email, password)
   .then((user) => {
      // console.log(user);
      return user.createSession()
      .then((refreshToken) => {
         return user.generateAccessAuthToken().then( (accessToken) => {
            return {accessToken,refreshToken}
         });
      }).then((authTokens) => {
         res
            .header('x-refresh-token' , authTokens.refreshToken)
            .header('x-access-token' ,  authTokens.accessToken)
            .send(user);
      })
   })
   .catch((error) => {
      if (error.message === 'User not found , go to register') {
         res.status(404).send({ error: error.message });
     } else if (error.message === 'Incorrect password') {
         res.status(400).send({ error: error.message });
     } else {
         res.status(500).send({ error: 'Something is wrong' });
     }
   }) 
  
});

//get the access token
app.get('/user/me/access-token', verifySession, (req, res) => {
  
   req.userObject.generateAccessAuthToken().then((accessToken) => {
       res.header('x-access-token', accessToken).send({ accessToken });
   }).catch((e) => {
       res.status(400).send(e);
   });
})

app.listen(process.env.PORT || port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});   
