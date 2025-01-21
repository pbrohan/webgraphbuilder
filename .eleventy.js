import nunjucks from "nunjucks";

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

    return{
        markdownTemplateEngine: "njk",
        htmlTemplateEngine: "njk",
        dataTemplateEngine: "njk",
        dir: {
            input: "src",
            includes: "_includes",
            output: "output",
        },
    };
};