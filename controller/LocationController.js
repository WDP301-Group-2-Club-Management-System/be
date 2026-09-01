const service = require("../services/LocationService");

const create = async (req, res) => {
  try {
    const item = await service.createOne(req.body);
    res.status(201).json({ message: "Created successfully", data: item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getAll = async (req, res) => {
  try {
    const items = await service.getAll();
    res.status(200).json({ data: items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getById = async (req, res) => {
  try {
    const item = await service.getById(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.status(200).json({ data: item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const update = async (req, res) => {
  try {
    const item = await service.updateById(req.params.id, req.body);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.status(200).json({ message: "Updated successfully", data: item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const item = await service.deleteById(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { create, getAll, getById, update, remove };
