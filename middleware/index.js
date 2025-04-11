const express = require("express");
const helmet = require("helmet");

module.exports = (app) => {
  app.use(helmet());
  app.use(express.json());
};
