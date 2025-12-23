const HomepageSection = require("../models/homepageSection.model");

exports.getAllSections = async (req, res) => {
    try {
        const sections = await HomepageSection.find().sort({ order: 1 });
        res.status(200).json(sections);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.toggleSectionActive = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        
        const section = await HomepageSection.findByIdAndUpdate(
            id,
            { isActive },
            { new: true }
        );
        
        if (!section) {
            return res.status(404).json({ message: 'Section not found' });
        }
        
        res.status(200).json(section);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.updateSectionOrder = async (req, res) => {
    try {
        const { sections } = req.body;
        
        const updatePromises = sections.map(section => 
            HomepageSection.findByIdAndUpdate(
                section._id,
                { order: section.order, isActive: section.isActive },
                { new: true }
            )
        );
        
        await Promise.all(updatePromises);
        const updatedSections = await HomepageSection.find().sort({ order: 1 });
        
        res.status(200).json(updatedSections);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.initializeSections = async (req, res) => {
    try {
        const defaultSections = [
            { name: "hero", displayName: "Hero Slider", component: "HeroSlider", order: 1 },
            { name: "sale", displayName: "Sale Products", component: "SaleProductsSlider", order: 2 },
            { name: "categories", displayName: "Category Showcase", component: "CategoryShowcase", order: 3 },
            { name: "brands", displayName: "Brands Slider", component: "BrandsSlider", order: 4 },
            { name: "sellwithus", displayName: "Sell With Us", component: "SellWithUs", order: 5 },
            { name: "services", displayName: "Services Section", component: "ServicesSection", order: 6 },
            { name: "instagram", displayName: "Instagram Section", component: "InstagramSection", order: 7 },
            { name: "prestigious", displayName: "Prestigious Brands", component: "PrestigiousBrands", order: 8 },
            { name: "about", displayName: "About Section", component: "AboutSection", order: 9 }
        ];

        for (const section of defaultSections) {
            await HomepageSection.findOneAndUpdate(
                { name: section.name },
                section,
                { upsert: true, new: true }
            );
        }

        const sections = await HomepageSection.find().sort({ order: 1 });
        res.status(200).json(sections);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};