const Menu = require("../models/menu.model");
exports.getManus = async (req, res) => {
  try {
    const menus = await Menu.find();
    if (!menus) {
      res.status(404).json("menus not found");
    }
    res.status(200).json(menu);
  } catch (error) {
    res.status(500).json(error);
  }
};

exports.addMenu = async (req, res) => {
  try {
    const data = req.body;
    if (!data) {
      res.status(404).json("Fields can not be empty or null");
    }
    const addedMenu = await Menu.create({
      data,
    });
    if (!addedMenu) {
      res.status(404).json("Field to add new menu");
    }
    res.status(201).json(addedMenu);
  } catch (error) {
    res.status(500).json(error);
  }
};
