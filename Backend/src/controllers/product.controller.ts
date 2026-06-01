import { Request, Response } from 'express';
import Product from '../models/product.model';

// @desc    Fetch all products
// @route   GET /api/products
// @access  Public
export const getProducts = async (req: Request, res: Response) => {
  const keyword = req.query.keyword
    ? { name: { $regex: req.query.keyword, $options: 'i' } }
    : {};

  const category = req.query.category
    ? { category: { $regex: req.query.category as string, $options: 'i' } }
    : {};

  const limit = req.query.limit ? parseInt(req.query.limit as string) : 0;

  const products = await Product.find({ ...keyword, ...category }).limit(limit);
  res.json(products);
};

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
export const getProductById = async (req: Request, res: Response) => {
  const product = await Product.findById(req.params.id);
  if (product) {
    res.json(product);
  } else {
    res.status(404).json({ message: 'Product not found' });
  }
};

// @desc    Create a product (admin)
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = async (req: any, res: Response) => {
  const { name, price, image, brand, category, description, countInStock } = req.body;

  const product = new Product({
    name,
    price,
    image,
    brand,
    category,
    description,
    countInStock,
    user: req.user._id,
    rating: 0,
    numReviews: 0,
    reviews: [],
  });

  const createdProduct = await product.save();
  res.status(201).json(createdProduct);
};

// @desc    Update a product (admin)
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = async (req: Request, res: Response) => {
  const { name, price, image, brand, category, description, countInStock } = req.body;

  const product = await Product.findById(req.params.id);

  if (product) {
    product.name = name ?? product.name;
    product.price = price ?? product.price;
    product.image = image ?? product.image;
    product.brand = brand ?? product.brand;
    product.category = category ?? product.category;
    product.description = description ?? product.description;
    product.countInStock = countInStock ?? product.countInStock;

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } else {
    res.status(404).json({ message: 'Product not found' });
  }
};

// @desc    Delete a product (admin)
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = async (req: Request, res: Response) => {
  const product = await Product.findById(req.params.id);

  if (product) {
    await Product.deleteOne({ _id: product._id });
    res.json({ message: 'Product removed' });
  } else {
    res.status(404).json({ message: 'Product not found' });
  }
};
