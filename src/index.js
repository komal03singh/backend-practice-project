// can do like this too in 2nd approach require('dotenv').config({path:'./env'})
import dotenv from 'dotenv'
import connectDB from './db/main.js'
import {app} from './app.js'
dotenv.config({
    path:'./.env'
});

/*--------------------------> APPROACH TWO <---------------------------- */

connectDB()//after database connection it returns promise so we have to use async await to handle it we use then and catch
.then(()=>{
    app.listen(process.env.PORT||8000,()=>{
        console.log(`Server is running at port : ${process.env.PORT}`)
    })
})
.catch((err)=>{
    console.log("MONGO DB connection failed",err)
})




/*
--------------------------> APPROACH ONE <----------------------------

import mongoose from 'mongoose'
import {DB_NAME} from './constants.js'
import express from 'express'
const app=express()

(async()=>{
    try{
       await  mongoose.coonect(`${process.env.MONGODB_URI}/${DB_NAME}`)
       app.on('error',(error)=>{
        console.log('ERR: ',error);
        throw error
       })

       app.listen(process.env.PORT,()=>{
        console.log(`App is listening on port $
            {process.env.PORT}`);
       })
    }
    catch(error){
        console.log(error)
        throw error


    }
})

*/