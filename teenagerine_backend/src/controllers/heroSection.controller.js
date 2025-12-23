const HeroSection= require("../models/heroSection.model");
exports.createHeroSection = async (req, res) => {
    try {
        const heroSection = new HeroSection(req.body);
        const savedHeroSection = await heroSection.save();
        res.status(201).json(savedHeroSection);
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
};

exports.getAllHeroSections = async (req, res) => {
    try {
        const {limit}=req.query;
        const intLimit=parseInt(limit)||2;
        const heroSections = await HeroSection.find().limit(intLimit);
        res.status(200).json(heroSections);
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
};

exports.getHeroSectionById = async (req, res) => {
    try {
        const heroSection = await HeroSection.findById(req.params.id);
        if (!heroSection) {
            return res.status(404).json({ message: 'Hero Section not found' });
        }
        res.status(200).json(heroSection);
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
};

exports.updateHeroSection = async (req, res) => {
    try {
        const heroSection = await HeroSection.findByIdAndUpdate
(req.params.id, req.body, { new: true });
        if (!heroSection) {
            return res.status(404).json({ message: 'Hero Section not found' });
        }
        res.status(200).json(heroSection);
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }       
}
;

exports.deleteHeroSection = async (req, res) => {
    try {
        const heroSection = await HeroSection.findByIdAndDelete(req.params.id);
        if (!heroSection) {
            return res.status(404).json({ message: 'Hero Section not found' });
        }
        res.status(204).json({ message: 'Hero Section deleted successfully' });
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
};