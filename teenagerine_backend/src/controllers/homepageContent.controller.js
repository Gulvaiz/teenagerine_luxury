const HomepageContent = require("../models/homepageContent.model");

exports.getAllContent = async (req, res) => {
    try {
        const content = await HomepageContent.find().sort({ sectionName: 1 });
        res.status(200).json(content);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getContentBySection = async (req, res) => {
    try {
        const { sectionName } = req.params;
        const content = await HomepageContent.findOne({ sectionName });
        if (!content) {
            return res.status(404).json({ message: 'Section content not found' });
        }
        res.status(200).json(content);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.updateSectionContent = async (req, res) => {
    try {
        const { sectionName } = req.params;
        const { elements, sectionDisplayName, isActive } = req.body;

        const content = await HomepageContent.findOneAndUpdate(
            { sectionName },
            { 
                elements, 
                sectionDisplayName, 
                isActive,
                sectionName 
            },
            { new: true, upsert: true }
        );

        res.status(200).json(content);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.addContentElement = async (req, res) => {
    try {
        const { sectionName } = req.params;
        const newElement = req.body;

        const content = await HomepageContent.findOneAndUpdate(
            { sectionName },
            { $push: { elements: newElement } },
            { new: true, upsert: true }
        );

        res.status(200).json(content);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.updateContentElement = async (req, res) => {
    try {
        const { sectionName, elementId } = req.params;
        const updatedElement = req.body;

        const content = await HomepageContent.findOneAndUpdate(
            { sectionName, "elements._id": elementId },
            { $set: { "elements.$": updatedElement } },
            { new: true }
        );

        if (!content) {
            return res.status(404).json({ message: 'Content element not found' });
        }

        res.status(200).json(content);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.deleteContentElement = async (req, res) => {
    try {
        const { sectionName, elementId } = req.params;

        const content = await HomepageContent.findOneAndUpdate(
            { sectionName },
            { $pull: { elements: { _id: elementId } } },
            { new: true }
        );

        if (!content) {
            return res.status(404).json({ message: 'Section not found' });
        }

        res.status(200).json(content);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.initializeDefaultContent = async (req, res) => {
    try {
        const defaultSections = [
            {
                sectionName: "hero",
                sectionDisplayName: "Hero Section",
                elements: [
                    { type: "text", key: "title", value: "Luxury Fashion Redefined", metadata: { className: "hero-title" } },
                    { type: "text", key: "subtitle", value: "Discover premium pre-loved luxury items", metadata: { className: "hero-subtitle" } },
                    { type: "button", key: "cta", value: "Shop Now", metadata: { href: "/collections", className: "hero-button" } }
                ]
            },
            {
                sectionName: "categories",
                sectionDisplayName: "Category Showcase",
                elements: [
                    { type: "text", key: "title", value: "Shop by Category", metadata: { className: "section-title" } },
                    { type: "text", key: "subtitle", value: "Explore our curated collections", metadata: { className: "section-subtitle" } }
                ]
            },
            {
                sectionName: "brands",
                sectionDisplayName: "Featured Brands",
                elements: [
                    { type: "text", key: "title", value: "Premium Brands", metadata: { className: "section-title" } },
                    { type: "text", key: "description", value: "Authentic luxury brands you love", metadata: { className: "section-description" } }
                ]
            },
            {
                sectionName: "about",
                sectionDisplayName: "About Section",
                elements: [
                    { type: "text", key: "title", value: "Why Choose Tangerine Luxury?", metadata: { className: "about-title" } },
                    { type: "text", key: "description", value: "We provide authenticated pre-loved luxury items with guaranteed quality.", metadata: { className: "about-description" } },
                    { type: "image", key: "banner", value: "/images/about-banner.jpg", metadata: { alt: "About Tangerine Luxury" } }
                ]
            }
        ];

        for (const section of defaultSections) {
            await HomepageContent.findOneAndUpdate(
                { sectionName: section.sectionName },
                section,
                { upsert: true, new: true }
            );
        }

        const content = await HomepageContent.find().sort({ sectionName: 1 });
        res.status(200).json(content);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};