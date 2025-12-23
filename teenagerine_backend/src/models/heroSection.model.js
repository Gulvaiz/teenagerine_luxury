const mongoose=require("mongoose");
const heroSectionSchema=new mongoose.Schema({
    title:{
        type:String,
        required:true
    },
    subtitle:{
        type:String,
        required:true
    },
    description:{
    type:String,
    },
    image:{
        type:String,
        required:true
    },
    position:{
        type:Number,
    },
    buttonText:{
        type:String,
        required:true
    },
    buttonLink:{
        type:String,
        required:true
    },
    status:{
        type:String,
        enum:["active","inactive"],
        default:"active"
    }
},{timestamps:true});

const HeroSection=mongoose.model("HeroSection",heroSectionSchema);

module.exports=HeroSection;