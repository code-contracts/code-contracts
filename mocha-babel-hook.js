/*eslint-env node*/
require("babel/register")({
  ignore: /node_modules/,
  plugins: ["babel-plugin-espower"],
  extensions: [".js"],
  stage: 1
});
