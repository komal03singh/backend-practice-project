import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/ApiResponse.js";

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

export {
    registerUser,
}
