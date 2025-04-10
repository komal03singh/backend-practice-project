import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from 'jsonwebtoken'
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async(userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        //save refresh token in db
        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})

        return {accessToken,refreshToken}

        
    } catch (error) {
        throw new ApiError(500,"Token generation failed")
        
    }
}

const registerUser=asyncHandler(async(req,res)=>{
    //get user details from frontend
    //validation -not empty fields (is email is okay)
    //check if user alredy exists
    //check if for images,check for avatar
    //upload them to cloudinary,avatar
    //create user object- create entry in db
    //remove password and refresh token field from response
    //check for user creation
    //return response

    //1
    const {fullName,email,password,username}=req.body
    console.log("email",email);

    // can do this approch too but it's lenthy to write
    // if(fullName==="")
    // {
    //     throw new ApiError(400,"Full name is required")
    // }

    //professional approch
    if([fullName,email,password,username].some((field)=>
        field?.trim()===""))
    {
        throw new ApiError(400,"All fields are required")
    }

    const existedUser = await User.findOne({
        //using or operator by using dollar sign
        $or:[{username},{email}]
    })

    if(existedUser){
        throw new ApiError(409,"User already exists")
    }

    const avatarLocalPath=req.files?.avatar[0]?.path;
    //const coverImageLocalPath=req.files?.coverImage[0]?.path;
    
    let coverImageLocalPath;
    if(req.files&&Array.isArray(req.files.coverImage)&&req.files.coverImage.length>0){
        coverImageLocalPath=req.files.coverImage[0].path
    }
    // console.log("BODY:", req.body);
    // console.log("FILES:", req.files);

    if(!avatarLocalPath)
    {
        throw new ApiError(400,"Avatar is required")
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath)
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar)
    {
        throw new ApiError(400,"Avatar upload failed")
    }

    //entry in database

    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url||"",
        email,
        password,
        username:username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    if(!createdUser){
        throw new ApiError(500,"User creation failed")
    }

    return res.status(201).json(new ApiResponse(200,"User created successfully",createdUser))
});

export const loginUser=asyncHandler(async(req,res)=>{
    //req body se - data
    //username ya email se login
    //find the user is it in db
    //password check
    //if everything is okay,return access and refresh token
    //send cookies

    //requesting data from req.body
    const{email,username,password}=req.body
    if(!username && !email){
        throw new ApiError(400,"Username or email is required")
    }

    const user=await User.findOne({
        //these are mongodb operators
        $or:[{username},{email}]
    })

    if(!user){
        throw new ApiError(404,"User not found")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,"Password Incorrect")
    }

    const {refreshToken,accessToken} = await generateAccessAndRefreshToken(user._id)

    //send cookies
    
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")//this step is optional as we call user from db the unwanted fields can come which we removed using this statement

    const options={
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(new ApiResponse(200,
        {
            user:loggedInUser,accessToken,refreshToken
        },
        "Login successful"
    ))

});

export const logoutUser=asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(req.user._id,{
        $unset:
        {
            refreshToken: 1
        }
    },
    {
        new:true
    })

    const options={
        httpOnly:true,
        secure:true
    }

    return  res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"Logout successful"))
})

export const refreshAccessToken=asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken||req.body.refreshToken

    if(incomingRefreshToken){
        throw new ApiError(401,"Unauthorized Request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
        )
    
        const user = await User.findById(decodedToken?._id)
    
            if (!user) {
                throw new ApiError(401,"Invalid refresh token")
                
            }
    
            if(incomingRefreshToken!==user.refreshToken){
                throw new ApiError(401,"Refresh token is expired or used")
            }
    
            const options={
                httpOnly:true,
                secure:true
    
            }
    
            const{accessToken,newRefreshToken} = await generateAccessAndRefreshToken(user._id)
    
            return res
            .status(200)
            .ccokie("accessToken",accessToken,options)
            .cookie("refreshToken",newRefreshToken,options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,refreshToken:newRefreshToken},
                        "Access token refreshed"
                )
            )
    
    } catch (error) {
        throw new ApiError(401,error?.message||"Invalid refresh Token")
        
    }

})

export const changeCurrentPassword = asyncHandler(async(req,res) => {
    const {oldPassword,newPassword} =req.body

    const user = await User.findById(req.user?._id)
        const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

        if(!isPasswordCorrect){
            throw new ApiError(400, "Invalid Password")
        }

        user.password = newPassword
        await user.save({validateBeforeSave:false})

        return res
        .status(200)
        .json(new ApiResponse(200,{},"Password change successfully"))
})

export const getCurrentUser=asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(200,req.user,"Current user fatched successfully")
})

export const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName,email}=req.body

    if(!fullName || !email){
        throw new ApiError(400,"all feilds are required")
    }
    
    UserfindByIdAndUpdate(
        req.user?._id,
        {
            //mongo db operator
            $set:
            {
                fullName,
                email,

            }
        },
        {new:true} //returns updated info
    ).select{"-password"}

    return res
    .status(200)
    .json(new ApiResponse(200,req.user,"Account details updated successfully"))
})

export const updateUserAvatar = asyncHandler(async(req,res)=>{

    const avatarLocalPath = req.file?.path
    
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading in avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:
            {
                avatar:avatar.url
            }
        },
        {
            new:true
        }

    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,req.user,"Avatar updated successfully"))

})

export const updateUserCoverImage = asyncHandler(async(req,res)=>{

    const coverImageLocalPath = req.file?.path
    
    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover Image is required")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400,"Error while uploading in cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:
            {
                coverImage:coverImage.url
            }
        },
        {
            new:true
        }

    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200,user,"Cover image updated successfully"))

})

export {
    registerUser,
}
