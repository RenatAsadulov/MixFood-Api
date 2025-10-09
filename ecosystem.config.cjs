module.exports = {
  apps: [
    {
      name: "mixfood-api",
      script: "src/server.js",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
