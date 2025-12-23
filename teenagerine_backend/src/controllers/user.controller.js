const User = require("../models/user.model");

exports.getUserCurrent = async (req, res) => {
  try {
    const userId = req.user._id;
    const userData = await User.findById(userId);
    res.status(200).json({ status: "success", user: userData });
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.UpdateCurrentUser = async (req, res) => {
  try {
    const data = req.body;
    const userId = req.user._id;
    const updatedUser = await User.findByIdAndUpdate(userId, data, {
      new: true,
    });
    if (!updatedUser) {
      return res
        .status(404)
        .json({ status: "fail", message: "User not found" });
    }
    res.status(200).json({ status: "success", user: updatedUser });
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.getAllUser = async (req, res) => {
  try {
    const { keyword, sort = "created_desc", page = 1, limit = 10 } = req.query;
    const sortOptions = {
      created_asc: { createdAt: 1 },
      created_desc: { createdAt: -1 },
    };
    const query = keyword ? { name: { $regex: keyword, $options: "i" } } : {};
    const skip = (Number(page) - 1) * Number(limit);
    const sortBy = sortOptions[sort] || sortOptions["created_desc"];
    const userData = await User.find().sort(sortBy).skip(skip).limit();
    const total=await User.countDocuments(query);
    const totalPages=Math.ceil(total/limit);
    res.status(200).json({
      status: "success",
      data: userData,
      total,
      page: Number(page),
      totalPages,
      limit: Number(limit),
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.createUser=async (req,res)=>{
  try {
    const {name,email,password}=req.body;
    if(!name|| !email || !password){
      return res.status(400).json({status:"fail", message:"Please provide all fields"});
    }
    const user=await User.create({name,email,password});
    if(!user){
      return res.status(400).json({status:"fail", message:"User not created"});
    }
    res.status(201).json({status:"success",user});
  } catch (error) {
    res.status(500).json({status:"error",message:error.message});
  }
}

exports.deleteUser=async(req,res)=>{
  try {
     if(!req.params.id){
       res.status(404).json("User Id not found")
     }
     const user=await User.findByIdAndDelete(req.params.id);
     if(!user){
      res.status(404).json("User does not exists");
     }
    res.status(204).json("Successfully deleted")
  } catch (error) {
    res.status(500).json({status:"error",message:error.message});
  }
}