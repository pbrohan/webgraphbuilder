import nunjucks from "nunjucks";
import build_vars from "./buildConfig.js";

export default function (eleventyConfig) {
    // Set up a custom Nunjucks environment
     const env = new nunjucks.Environment(
        new nunjucks.FileSystemLoader([
            "src/_includes",
            "node_modules/govuk-frontend/dist"
        ])
    );

    eleventyConfig.setLibrary("njk", env);
    eleventyConfig.addPassthroughCopy("src/assets");
    eleventyConfig.addPassthroughCopy("src/stylesheets");
    eleventyConfig.addPassthroughCopy("src/javascripts");
    eleventyConfig.addGlobalData("urlPrefix", build_vars.urlprefix);

    return{
        markdownTemplateEngine: "njk",
        htmlTemplateEngine: "njk",
        dataTemplateEngine: "njk",
        pathPrefix: build_vars.urlprefix,
        dir: {
            input: "src",
            data: "_data",
            includes: "_includes",
            output: "output",
        },
    };
};