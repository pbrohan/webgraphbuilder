import * as d3 from 'd3';

// Heavily based on https://observablehq.com/@d3/color-legend
function VerticalLegend(colour,
    {title,
     tickSize = 6,
     width = 44 + tickSize,
     height = 320,
     marginTop = 0,
     marginRight = 16 + tickSize,
     marginBottom = 0,
     marginLeft = 18,
     ticks = height / 63,
     tickFormat,
     tickValues
    } = {}) {

        function ramp(colour, n = 256, down=false) {
            const canvas = document.createElement("canvas");
            canvas.width = 1;
            canvas.height = n;
            const context = canvas.getContext("2d");
            for (let i = 0; i < n; ++i) {
                context.fillStyle = colour(i / (n-1));
                if (down) {
                    context.fillRect(0, n-i-1, 1, 1)
                } else {
                    context.fillRect(0, i, 1, 1)
                }
            }
            return canvas;
        }

        const svg = d3.create("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [0, 0, width, height])
            .style("overflow", "visible")
            .style("display", "block");

        let tickAdjust = g => g.selectAll(".tick line").attr("x1", marginRight + marginLeft - width);
        let y;

        // Continuous
        if (colour.interpolate) {
            const n = Math.min(colour.domain().length, colour.range().length());

            y = colour.copy().rangeRound(d3.quantize(d3.interpolate(marginBottom, height - marginTop), n));

            svg.append("image")
                .attr("x", marginLeft)
                .attr("y", marginTop)
                .attr("width", width - marginLeft - marginRight)
                .attr("height", height - marginTop - marginBottom)
                .attr("preserveAspectRatio", "none")
                .attr("xlink:href", ramp(colour.copy().domain(d3.quantize(d3.interpolate(0, 1), n)), undefined, true).toDataURL());
        }

        // Sequential
        else if (colour.interpolator) {
            y = Object.assign(colour.copy()
                .interpolator(d3.interpolateRound(height - marginTop, marginBottom)),
                {range() { return [height - marginTop, marginBottom]; }});
                
            svg.append("image")
            .attr("x", marginLeft)
            .attr("y", marginTop)
            .attr("width", width - marginLeft - marginRight)
            .attr("height", height - marginTop - marginBottom)
            .attr("preserveAspectRatio", "none")
            .attr("xlink:href", ramp(colour.interpolator(), undefined, true).toDataURL());

            if (!y.ticks) {
                if (tickValues === undefined) {
                    const n = Math.round(ticks + 1);
                    tickValues = d3.range(n).map(i => d3.quantile(colour.domain(), i / (n - 1)));
                }
                if (typeof tickFormat !== "function") {
                    tickFormat = d3.format(tickFormat === undefined ? ",f" : tickFormat);
                }
            }
        }

        else if (colour.invertExtent) {
            const thresholds
                = colour.thresholds ? colour.thresholds()
                    : colour.quantiles ? colour.quantiles()
                    : colour.domain();
            
            const thresholdFormat
                = tickFormat === undefined ? d => d
                : typeof tickFormat === "string" ? d3.format(tickFormat)
                : tickFormat;

            y = d3.scaleLinear()
                .domain([-1, colour.range().length - 1])
                .rangeRound([marginBottom, height - marginTop]);

            svg.append("g")
                .selectAll("rect")
                .data(colour.range())
                .join("rect")
                    .attr("x", marginRight)
                    .attr("y", (d, i) => y(i - 1))
                    .attr("width", width - marginRight - marginLeft)
                    .attr("height", (d, i) => y(i) - y(i - 1))
                    .attr("fill", d => d);
            
            tickValues = d3.range(thresholds.length);
            tickFormat = i => thresholdFormat(thresholds[i], i);
        }

        else {
            y = d3.scaleBand()
                .domain(colour.domain())
                .rangeRound([marginBottom, height - marginTop]);
            
            svg.append("g")
                .selectAll("rect")
                .data(colour.domain())
                .join("rect")
                    .attr("x", marginRight)
                    .attr("y", y)
                    .attr("width", width - marginLeft - marginRight)
                    .attr("height", Math.max(0, y.bandwidth() - 1))
                    .attr("fill", colour);
            
                    tickAdjust = () => {};
        }

        svg.append("g")
            .attr("transform", `translate(${width - marginRight},0)`)
            .call(d3.axisRight(y)
                .ticks(ticks, typeof tickFormat === "string" ? tickFormat : undefined)
                .tickFormat(typeof tickFormat === "function" ? tickFormat : undefined)
                .tickSize(tickSize)
                .tickValues(tickValues))
            .call(tickAdjust)
            .call(g => g.select(".domain").remove())
            .call(g => g.append("text")
                .attr("x", marginRight + marginLeft - width - 6)
                .attr("y", marginBottom + 10)
                .attr("fill", "currentColor")
                .attr("text-anchor", "start")
                .attr("font-weight", "bold")
                .attr("class", "title")
                .text(title));
        return svg.node();

    }

function download_svg(element) {
    // Convert the element to a data URL
    const svgData = new XMLSerializer().serializeToString(element);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);

    const targetDPI = 300;
    const inchtopx = 96;
    const scaleFactor = targetDPI / inchtopx;

    // Create an image element
    const img = new Image();
    img.onload = function () {
      // Create a canvas element
      const canvas = document.createElement("canvas");
      canvas.width = element.width.baseVal.value * scaleFactor;
      canvas.height = element.height.baseVal.value * scaleFactor;

      // Draw the SVG image onto the canvas
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "white"; // Optional: Fill the background with white
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scaleFactor, scaleFactor)
      ctx.drawImage(img, 0, 0);

      // Convert the canvas content to a JPG data URL
      const jpgUrl = canvas.toDataURL("image/jpeg", 1.0);

      // Create a download link
      const link = document.createElement("a");
      link.href = jpgUrl;
      link.download = "graph.jpg";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Revoke the object URL
      URL.revokeObjectURL(svgUrl);
    };

    // Set the image source to the SVG URL
    img.src = svgUrl;
};


const graph_tools = {
    VerticalLegend,
    download_svg
};

export default graph_tools;
